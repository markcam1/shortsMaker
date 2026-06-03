from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
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
    format: Literal["image", "quote"] = "image"
    aspect: Literal["9:16", "16:9"] = "9:16"
    source_filename: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scene_ids: list[str] = Field(default_factory=list)
    quote_ids: list[str] = Field(default_factory=list)


class ParsedItem(BaseModel):
    term: str
    body: str


class QuotePost(BaseModel):
    id: str = Field(default_factory=_new_id)
    project_id: str
    order: int
    term: str
    raw_body: str
    summary: str = ""
    background_mode: Literal["simple", "complex"] = "simple"
    background_desc: str = ""
    llm_prompt_sent: str = ""
    generated_prompt: str = ""
    accepted_prompt: str = ""
    template_id: str = ""
    color_scheme_id: str = ""
    font_pairing_id: str = ""
    image_filename: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- Request / Response shapes ---

class CreateProjectRequest(BaseModel):
    name: str
    format: Literal["image", "quote"] = "image"
    aspect: Literal["9:16", "16:9"] = "9:16"


class GeneratePromptRequest(BaseModel):
    form_input: FormInput


class GeneratePromptResponse(BaseModel):
    llm_prompt_sent: str
    generated_prompt: str


class GenerateImagesRequest(BaseModel):
    scene_id: Optional[str] = None
    reference_scene_id: Optional[str] = None
    form_input: FormInput
    accepted_prompt: str
    image_model_id: str


class GenerateImagesResponse(BaseModel):
    scene_id: str
    candidate_urls: list[str]


class AcceptImageRequest(BaseModel):
    scene_id: str
    candidate_index: int
    form_input: FormInput
    accepted_prompt: str


class SummarizeRequest(BaseModel):
    template_id: str


class SummarizeResponse(BaseModel):
    summary: str


class GenerateQuoteCandidatesRequest(BaseModel):
    summary: str
    background_mode: Literal["simple", "complex"] = "simple"
    template_id: str
    color_scheme_id: str
    font_pairing_id: str
    background_desc: str = ""
    accepted_prompt: str = ""
    image_model_id: str = ""


class GenerateQuoteCandidatesResponse(BaseModel):
    candidate_urls: list[str]


class AcceptQuoteRequest(BaseModel):
    candidate_index: int
    summary: str
    template_id: str
    color_scheme_id: str
    font_pairing_id: str


class QuotePromptRequest(BaseModel):
    background_desc: str


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


class FontPairingInfo(BaseModel):
    id: str
    label: str


class ColorSchemeInfo(BaseModel):
    id: str
    label: str
    text_color: str
    bg_type: str
    bg_value: str
    font_pairings: list[FontPairingInfo]


class TemplateInfo(BaseModel):
    id: str
    label: str
    max_chars: int
    safe_area_pct: int
    alignment: str
    term_size_pt: int
    body_size_pt: int
    color_schemes: list[ColorSchemeInfo]
