from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
import uuid


def _new_id() -> str:
    return str(uuid.uuid4())


class FormInput(BaseModel):
    subject: str
    action: str
    background: str
    style: str
    lighting_mood: str
    color: str
    image_model: str


class Scene(BaseModel):
    id: str = Field(default_factory=_new_id)
    project_id: str
    order: int
    form_input: FormInput
    llm_prompt_sent: str = ""
    generated_prompt: str = ""
    accepted_prompt: str = ""
    image_filename: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Project(BaseModel):
    id: str = Field(default_factory=_new_id)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scene_ids: list[str] = Field(default_factory=list)


# --- Request / Response shapes ---

class CreateProjectRequest(BaseModel):
    name: str


class GeneratePromptRequest(BaseModel):
    form_input: FormInput


class GeneratePromptResponse(BaseModel):
    llm_prompt_sent: str
    generated_prompt: str


class GenerateImagesRequest(BaseModel):
    scene_id: Optional[str] = None   # if continuing an existing scene
    reference_scene_id: Optional[str] = None  # scene whose image.png is used as character reference
    form_input: FormInput
    accepted_prompt: str
    image_model_id: str


class GenerateImagesResponse(BaseModel):
    scene_id: str
    candidate_urls: list[str]   # served as /api/images/{project_id}/{scene_id}/candidates/{n}


class AcceptImageRequest(BaseModel):
    scene_id: str
    candidate_index: int
    form_input: FormInput
    accepted_prompt: str


class ImageModelInfo(BaseModel):
    id: str
    name: str


class ColorPaletteInfo(BaseModel):
    id: str
    label: str


class LightingMoodInfo(BaseModel):
    id: str
    label: str
    color_palettes: list[ColorPaletteInfo]


class StyleInfo(BaseModel):
    id: str
    label: str
    lighting_moods: list[LightingMoodInfo]
