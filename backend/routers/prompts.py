from fastapi import APIRouter, HTTPException
from backend.models.schemas import GeneratePromptRequest, GeneratePromptResponse
from backend.services.llm_service import generate_prompt
from backend.storage import get_storage

router = APIRouter(prefix="/api/projects/{project_id}")


@router.post("/prompt", response_model=GeneratePromptResponse)
def generate_scene_prompt(project_id: str, req: GeneratePromptRequest):
    try:
        get_storage().load_project(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "Project not found")

    llm_input, generated = generate_prompt(req.form_input)
    return GeneratePromptResponse(
        llm_prompt_sent=llm_input,
        generated_prompt=generated,
    )
