import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.models.schemas import (
    Scene, FormInput,
    GenerateImagesRequest,
    GenerateImagesResponse,
    AcceptImageRequest,
    ParsedItem,
)
from backend.services.image_service import generate_images
from backend.storage import get_storage
from backend.config import IMAGE_MODELS

router = APIRouter(prefix="/api/projects/{project_id}")


@router.post("/images", response_model=GenerateImagesResponse)
def generate_scene_images(project_id: str, req: GenerateImagesRequest):
    storage = get_storage()
    try:
        project = storage.load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")

    # Reuse existing scene or create a draft
    if req.scene_id:
        try:
            scene = storage.load_scene(project_id, req.scene_id)
        except FileNotFoundError:
            raise HTTPException(404, "Scene not found")
    else:
        order = len(project.scene_ids)
        scene = Scene(
            project_id=project_id,
            order=order,
            form_input=req.form_input,
            accepted_prompt=req.accepted_prompt,
        )
        storage.save_scene(scene)

    candidates_dir = storage.candidates_dir(project_id, scene.id)
    # Clear old candidates before regenerating
    for old in candidates_dir.glob("*.png"):
        old.unlink()

    reference_image_path = None
    if req.reference_scene_id:
        ref_path = storage.scene_dir(project_id, req.reference_scene_id) / "image.png"
        if ref_path.exists():
            reference_image_path = ref_path

    paths = generate_images(req.accepted_prompt, req.image_model_id, candidates_dir, reference_image_path, project.aspect)

    urls = [
        f"/api/projects/{project_id}/scenes/{scene.id}/candidates/{i}"
        for i in range(len(paths))
    ]
    return GenerateImagesResponse(scene_id=scene.id, candidate_urls=urls)


@router.get("/scenes/{scene_id}/candidates/{index}")
def serve_candidate(project_id: str, scene_id: str, index: int):
    storage = get_storage()
    path = storage.candidates_dir(project_id, scene_id) / f"{index}.png"
    if not path.exists():
        raise HTTPException(404, "Candidate image not found")
    return FileResponse(str(path), media_type="image/png")


@router.post("/scenes", response_model=Scene)
def accept_image(project_id: str, req: AcceptImageRequest):
    storage = get_storage()
    try:
        project = storage.load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")

    try:
        scene = storage.load_scene(project_id, req.scene_id)
    except FileNotFoundError:
        raise HTTPException(404, "Scene not found")

    # Copy chosen candidate to final image.png
    src = storage.candidates_dir(project_id, scene.id) / f"{req.candidate_index}.png"
    if not src.exists():
        raise HTTPException(400, "Candidate index out of range")

    dest = storage.scene_dir(project_id, scene.id) / "image.png"
    shutil.copy2(src, dest)

    # Finalise scene fields
    scene.form_input = req.form_input
    scene.accepted_prompt = req.accepted_prompt
    scene.image_filename = str(dest.relative_to(storage.project_dir(project_id).parent.parent))
    storage.save_scene(scene)

    # Add to project if not already present
    if scene.id not in project.scene_ids:
        project.scene_ids.append(scene.id)
        storage.save_project(project)

    return scene


@router.get("/scenes", response_model=list[Scene])
def list_scenes(project_id: str):
    try:
        get_storage().load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")
    return get_storage().list_scenes(project_id)


@router.get("/scenes/{scene_id}/image")
def serve_accepted_image(project_id: str, scene_id: str):
    storage = get_storage()
    path = storage.scene_dir(project_id, scene_id) / "image.png"
    if not path.exists():
        raise HTTPException(404, "Image not found")
    return FileResponse(str(path), media_type="image/png")


class ParseScenesRequest(APIRouter.__class__):
    pass


from pydantic import BaseModel

class _ParseScenesBody(BaseModel):
    items: list[ParsedItem]


@router.post("/scenes/parse", response_model=list[Scene])
def parse_scenes(project_id: str, body: _ParseScenesBody):
    """Create or update draft Scenes with form_input.subject pre-filled from parser items."""
    storage = get_storage()
    try:
        project = storage.load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")

    default_model = IMAGE_MODELS[0]["id"] if IMAGE_MODELS else ""
    created = []
    for i, item in enumerate(body.items):
        form = FormInput(
            subject=item.term,
            action="",
            background="",
            style="",
            lighting_mood="",
            color="",
            image_model=default_model,
        )
        scene = Scene(project_id=project_id, order=len(project.scene_ids) + i, form_input=form)
        storage.save_scene(scene)
        if scene.id not in project.scene_ids:
            project.scene_ids.append(scene.id)
        created.append(scene)

    storage.save_project(project)
    return created


class UpdateSceneRequest(BaseModel):
    subject: str


@router.patch("/scenes/{scene_id}", response_model=Scene)
def update_scene(project_id: str, scene_id: str, body: UpdateSceneRequest):
    storage = get_storage()
    try:
        scene = storage.load_scene(project_id, scene_id)
    except FileNotFoundError:
        raise HTTPException(404, "Scene not found")
    scene.form_input.subject = body.subject
    storage.save_scene(scene)
    return scene
