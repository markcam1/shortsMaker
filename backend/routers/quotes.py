from __future__ import annotations
import io
import re
import shutil
import zipfile
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from backend.models.schemas import (
    QuotePost,
    SummarizeRequest,
    SummarizeResponse,
    GenerateQuoteCandidatesRequest,
    GenerateQuoteCandidatesResponse,
    AcceptQuoteRequest,
    QuotePromptRequest,
    GeneratePromptResponse,
)
from backend.storage import get_storage
from backend.config import TEMPLATE_CHOICES, IMAGE_MODELS
from backend.services import llm_service
from backend.services.overlay_service import (
    ColorSpec,
    QuoteContent,
    dict_to_template,
    dict_to_color_spec,
    get_overlay_service,
)
from backend.services.image_service import generate_images

router = APIRouter(prefix="/api/projects/{project_id}")


def _find_template(template_id: str) -> dict | None:
    for t in TEMPLATE_CHOICES:
        if t["id"] == template_id:
            return t
    return None


def _find_scheme(t_dict: dict, scheme_id: str) -> dict | None:
    for cs in t_dict.get("color_schemes", []):
        if cs["id"] == scheme_id:
            return cs
    return None


def _find_font(cs_dict: dict, font_id: str) -> dict | None:
    for fp in cs_dict.get("font_pairings", []):
        if fp["id"] == font_id:
            return fp
    return None


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


@router.get("/quotes", response_model=list[QuotePost])
def list_quotes(project_id: str):
    try:
        get_storage().load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")
    return get_storage().list_quotes(project_id)


@router.get("/quotes/{quote_id}", response_model=QuotePost)
def get_quote(project_id: str, quote_id: str):
    try:
        return get_storage().load_quote(project_id, quote_id)
    except FileNotFoundError:
        raise HTTPException(404, "Quote not found")


@router.post("/quotes/{quote_id}/summarize", response_model=SummarizeResponse)
def summarize_quote(project_id: str, quote_id: str, req: SummarizeRequest):
    storage = get_storage()
    try:
        quote = storage.load_quote(project_id, quote_id)
    except FileNotFoundError:
        raise HTTPException(404, "Quote not found")

    # Determine max_chars from template or default
    max_chars = 220
    if req.template_id:
        t_dict = _find_template(req.template_id)
        if t_dict:
            max_chars = t_dict.get("max_chars", 220)
            quote.template_id = req.template_id

    summary = llm_service.summarize(quote.term, quote.raw_body, max_chars)
    quote.summary = summary
    storage.save_quote(quote)
    return SummarizeResponse(summary=summary)


@router.post("/quotes/{quote_id}/prompt", response_model=GeneratePromptResponse)
def generate_quote_prompt(project_id: str, quote_id: str, req: QuotePromptRequest):
    """Complex only — generate a text-to-image prompt for the background."""
    try:
        get_storage().load_quote(project_id, quote_id)
    except FileNotFoundError:
        raise HTTPException(404, "Quote not found")

    sent, generated = llm_service.generate_prompt_from_desc(req.background_desc)
    return GeneratePromptResponse(llm_prompt_sent=sent, generated_prompt=generated)


@router.post("/quotes/{quote_id}/candidates", response_model=GenerateQuoteCandidatesResponse)
def generate_candidates(project_id: str, quote_id: str, req: GenerateQuoteCandidatesRequest):
    storage = get_storage()
    try:
        project = storage.load_project(project_id)
        quote = storage.load_quote(project_id, quote_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project or quote not found")

    # Resolve template/scheme/font from config
    t_dict = _find_template(req.template_id) if req.template_id else (TEMPLATE_CHOICES[0] if TEMPLATE_CHOICES else None)
    if not t_dict:
        raise HTTPException(400, "No templates configured")

    cs_dict = _find_scheme(t_dict, req.color_scheme_id) or t_dict.get("color_schemes", [{}])[0]
    fp_dict = _find_font(cs_dict, req.font_pairing_id) or cs_dict.get("font_pairings", [{}])[0]

    template = dict_to_template(t_dict, cs_dict, fp_dict)
    content = QuoteContent(term=quote.term, summary=req.summary or quote.summary)

    candidates_dir = storage.quote_candidates_dir(project_id, quote_id)
    for old in candidates_dir.glob("*.png"):
        old.unlink()

    overlay = get_overlay_service()
    candidate_paths = []

    if req.background_mode == "simple":
        # One candidate per font pairing for the chosen color scheme
        fp_list = cs_dict.get("font_pairings", [fp_dict])
        for i, fp in enumerate(fp_list[:4]):
            tp = dict_to_template(t_dict, cs_dict, fp)
            color_spec = dict_to_color_spec(cs_dict)
            out = candidates_dir / f"{i}.png"
            overlay.render(
                background=color_spec,
                content=content,
                template=tp,
                aspect=project.aspect,
                out_path=out,
            )
            candidate_paths.append(out)

        # If only 1 font pairing, generate variants for all color schemes
        if len(candidate_paths) < 2:
            base_i = len(candidate_paths)
            for j, extra_cs in enumerate(t_dict.get("color_schemes", [])[1:3]):
                extra_fp = extra_cs.get("font_pairings", [fp_dict])[0]
                tp = dict_to_template(t_dict, extra_cs, extra_fp)
                color_spec = dict_to_color_spec(extra_cs)
                out = candidates_dir / f"{base_i + j}.png"
                overlay.render(
                    background=color_spec,
                    content=content,
                    template=tp,
                    aspect=project.aspect,
                    out_path=out,
                )
                candidate_paths.append(out)

    else:
        # Complex: use image_service to generate Gemini background(s), then overlay
        if not req.accepted_prompt:
            raise HTTPException(400, "accepted_prompt required for complex background mode")

        bg_dir = candidates_dir / "backgrounds"
        bg_dir.mkdir(parents=True, exist_ok=True)
        for old in bg_dir.glob("*.png"):
            old.unlink()

        model_id = req.image_model_id or (IMAGE_MODELS[0]["id"] if IMAGE_MODELS else "")
        if not model_id:
            raise HTTPException(400, "No image models configured")
        bg_paths = generate_images(
            prompt=req.accepted_prompt,
            model_id=model_id,
            candidates_dir=bg_dir,
            aspect=project.aspect,
        )

        color_spec = dict_to_color_spec(cs_dict)
        for i, bg_path in enumerate(bg_paths[:4]):
            # Persist first bg as background.png for re-overlay on edits
            if i == 0:
                import shutil as _shutil
                _shutil.copy2(bg_path, storage.quote_dir(project_id, quote_id) / "background.png")

            out = candidates_dir / f"{i}.png"
            overlay.render(
                background=bg_path,
                content=content,
                template=template,
                aspect=project.aspect,
                out_path=out,
            )
            candidate_paths.append(out)

    # Update quote metadata
    quote.summary = req.summary or quote.summary
    quote.background_mode = req.background_mode
    quote.template_id = req.template_id
    quote.color_scheme_id = req.color_scheme_id
    quote.font_pairing_id = req.font_pairing_id
    if req.background_mode == "complex":
        quote.background_desc = req.background_desc
        quote.accepted_prompt = req.accepted_prompt
    storage.save_quote(quote)

    urls = [
        f"/api/projects/{project_id}/quotes/{quote_id}/candidates/{i}"
        for i in range(len(candidate_paths))
    ]
    return GenerateQuoteCandidatesResponse(candidate_urls=urls)


@router.get("/quotes/{quote_id}/candidates/{index}")
def serve_candidate(project_id: str, quote_id: str, index: int):
    path = get_storage().quote_candidates_dir(project_id, quote_id) / f"{index}.png"
    if not path.exists():
        raise HTTPException(404, "Candidate not found")
    return FileResponse(str(path), media_type="image/png")


@router.post("/quotes/{quote_id}/accept", response_model=QuotePost)
def accept_quote(project_id: str, quote_id: str, req: AcceptQuoteRequest):
    storage = get_storage()
    try:
        project = storage.load_project(project_id)
        quote = storage.load_quote(project_id, quote_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project or quote not found")

    src = storage.quote_candidates_dir(project_id, quote_id) / f"{req.candidate_index}.png"
    if not src.exists():
        raise HTTPException(400, "Candidate index out of range")

    dest = storage.quote_dir(project_id, quote_id) / "image.png"
    shutil.copy2(src, dest)

    quote.summary = req.summary or quote.summary
    if req.template_id:
        quote.template_id = req.template_id
    if req.color_scheme_id:
        quote.color_scheme_id = req.color_scheme_id
    if req.font_pairing_id:
        quote.font_pairing_id = req.font_pairing_id
    quote.image_filename = str(dest.relative_to(storage.project_dir(project_id).parent.parent))
    storage.save_quote(quote)

    if quote.id not in project.quote_ids:
        project.quote_ids.append(quote.id)
        storage.save_project(project)

    return quote


@router.get("/quotes/{quote_id}/image")
def serve_quote_image(project_id: str, quote_id: str):
    path = get_storage().quote_dir(project_id, quote_id) / "image.png"
    if not path.exists():
        raise HTTPException(404, "Image not found")
    return FileResponse(str(path), media_type="image/png")


@router.get("/export")
def export_project(project_id: str):
    storage = get_storage()
    try:
        project = storage.load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for qid in project.quote_ids:
            try:
                quote = storage.load_quote(project_id, qid)
                img = storage.quote_dir(project_id, qid) / "image.png"
                if img.exists():
                    filename = f"{_slugify(quote.term) or qid}.png"
                    zf.write(img, filename)
            except FileNotFoundError:
                continue

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{project.name}-cards.zip"'},
    )


from pydantic import BaseModel

class UpdateQuoteRequest(BaseModel):
    term: str
    raw_body: str


@router.patch("/quotes/{quote_id}", response_model=QuotePost)
def update_quote(project_id: str, quote_id: str, body: UpdateQuoteRequest):
    storage = get_storage()
    try:
        quote = storage.load_quote(project_id, quote_id)
    except FileNotFoundError:
        raise HTTPException(404, "Quote not found")
    quote.term = body.term
    quote.raw_body = body.raw_body
    storage.save_quote(quote)
    return quote


@router.delete("/quotes/{quote_id}")
def delete_quote(project_id: str, quote_id: str):
    storage = get_storage()
    try:
        project = storage.load_project(project_id)
        storage.load_quote(project_id, quote_id)
    except FileNotFoundError:
        raise HTTPException(404, "Quote not found")

    if quote_id in project.quote_ids:
        project.quote_ids.remove(quote_id)
        storage.save_project(project)

    quote_dir = storage.quote_dir(project_id, quote_id)
    if quote_dir.exists():
        shutil.rmtree(quote_dir)

    return {"ok": True}
