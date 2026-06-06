from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from backend.models.schemas import (
    Project, CreateProjectRequest,
    ImageModelInfo, StyleInfo, LightingMoodInfo, ColorPaletteInfo,
    TemplateInfo, ColorSchemeInfo, FontPairingInfo,
    ParsedItem, QuotePost, Scene,
)
from backend.storage import get_storage
from backend.config import IMAGE_MODELS, STYLE_CHOICES, TEMPLATE_CHOICES, resolve_llm, LLM_CONFIG, REQUIRE_ALL_MARKED
from backend.services.parse_service import UploadSource, get_parser
from backend.models.schemas import FormInput

router = APIRouter(prefix="/api")


@router.get("/config/models", response_model=list[ImageModelInfo])
def list_models():
    return [ImageModelInfo(id=m["id"], name=m["name"]) for m in IMAGE_MODELS]


@router.get("/config/styles", response_model=list[StyleInfo])
def list_styles():
    return [
        StyleInfo(
            id=s["id"],
            label=s["label"],
            lighting_moods=[
                LightingMoodInfo(
                    id=m["id"],
                    label=m["label"],
                    color_palettes=[
                        ColorPaletteInfo(id=p["id"], label=p["label"])
                        for p in m.get("color_palettes", [])
                    ],
                )
                for m in s.get("lighting_moods", [])
            ],
        )
        for s in STYLE_CHOICES
    ]


@router.get("/config/templates", response_model=list[TemplateInfo])
def list_templates():
    result = []
    for t in TEMPLATE_CHOICES:
        color_schemes = []
        for cs in t.get("color_schemes", []):
            font_pairings = [
                FontPairingInfo(id=fp["id"], label=fp["label"])
                for fp in cs.get("font_pairings", [])
            ]
            color_schemes.append(ColorSchemeInfo(
                id=cs["id"],
                label=cs["label"],
                text_color=cs.get("text_color", "#FFFFFF"),
                bg_type=cs.get("bg_type", "solid"),
                bg_value=cs.get("bg_value", "#000000"),
                font_pairings=font_pairings,
            ))
        result.append(TemplateInfo(
            id=t["id"],
            label=t["label"],
            max_chars=t.get("max_chars", 280),
            safe_area_pct=t.get("safe_area_pct", 13),
            alignment=t.get("alignment", "center"),
            term_size_pt=t.get("term_size_pt", 52),
            body_size_pt=t.get("body_size_pt", 28),
            color_schemes=color_schemes,
        ))
    return result


@router.get("/config/workflow")
def get_workflow_config():
    return {"require_all_marked": REQUIRE_ALL_MARKED}


@router.get("/config/llm")
def get_llm_config():
    tasks = {}
    for task in LLM_CONFIG.get("tasks", {}):
        provider, model = resolve_llm(task)
        tasks[task] = [provider, model]
    return {"global": LLM_CONFIG.get("global"), "tasks": tasks}


@router.post("/projects", response_model=Project)
async def create_project(
    name: str = Form(...),
    format: str = Form("image"),
    aspect: str = Form("9:16"),
    file: Optional[UploadFile] = File(None),
):
    storage = get_storage()
    source_filename = None
    parsed_items: list[ParsedItem] = []

    if file and file.filename:
        content = await file.read()
        source = UploadSource(file.filename, content)
        filename, raw_text = source.load()
        source_filename = filename
        parser = get_parser(format)
        parsed_items, _ = parser.parse(raw_text)

    project = Project(
        name=name,
        format=format,  # type: ignore[arg-type]
        aspect=aspect,  # type: ignore[arg-type]
        source_filename=source_filename,
    )
    storage.save_project(project)

    # Create draft scenes (image) or quote posts from parsed items
    if parsed_items:
        if format == "image":
            default_model = IMAGE_MODELS[0]["id"] if IMAGE_MODELS else ""
            for i, item in enumerate(parsed_items):
                form = FormInput(
                    subject=item.term,
                    action="",
                    background="",
                    style="",
                    lighting_mood="",
                    color="",
                    image_model=default_model,
                )
                scene = Scene(project_id=project.id, order=i, form_input=form)
                storage.save_scene(scene)
                project.scene_ids.append(scene.id)
            storage.save_project(project)
        else:
            for i, item in enumerate(parsed_items):
                quote = QuotePost(
                    project_id=project.id,
                    order=i,
                    term=item.term,
                    raw_body=item.body,
                )
                storage.save_quote(quote)
                project.quote_ids.append(quote.id)
            storage.save_project(project)

    return project


@router.get("/projects", response_model=list[Project])
def list_projects():
    return get_storage().list_projects()


@router.get("/projects/{project_id}", response_model=Project)
def get_project(project_id: str):
    try:
        return get_storage().load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")


@router.delete("/projects/{project_id}")
def delete_project(project_id: str):
    get_storage().delete_project(project_id)
    return {"ok": True}


class RenameRequest(BaseModel):
    name: str


@router.patch("/projects/{project_id}", response_model=Project)
def rename_project(project_id: str, body: RenameRequest):
    storage = get_storage()
    try:
        project = storage.load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")
    project.name = body.name
    storage.save_project(project)
    return project


@router.post("/projects/{project_id}/duplicate", response_model=Project)
def duplicate_project(project_id: str):
    storage = get_storage()
    try:
        src = storage.load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")
    return storage.duplicate_project(project_id, f"Copy of {src.name}")
