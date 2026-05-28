from fastapi import APIRouter, HTTPException
from backend.models.schemas import Project, CreateProjectRequest
from backend.storage import get_storage
from backend.config import IMAGE_MODELS, STYLE_CHOICES
from backend.models.schemas import ImageModelInfo, StyleInfo, LightingMoodInfo, ColorPaletteInfo

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


@router.post("/projects", response_model=Project)
def create_project(req: CreateProjectRequest):
    storage = get_storage()
    project = Project(name=req.name)
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
