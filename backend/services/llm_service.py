import anthropic
from backend.config import ANTHROPIC_API_KEY, LLM_MODEL
from backend.models.schemas import FormInput

_SYSTEM_PROMPT = (
    "You are a creative director specializing in visual storytelling. "
    "Your job is to write a single, richly detailed text-to-image prompt "
    "that an image generation model can use directly. "
    "Output only the prompt text — no preamble, no labels, no quotes."
)

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


def build_llm_input(form: FormInput) -> str:
    return (
        "Please create one text-to-image prompt using the following features:\n"
        f"Subject: {form.subject}\n"
        f"Action: {form.action}\n"
        f"Background: {form.background}\n"
        f"Style: {form.style}\n"
        f"Lighting/Mood: {form.lighting_mood}\n"
        f"Color: {form.color}"
    )


def generate_prompt(form: FormInput) -> tuple[str, str]:
    """Returns (llm_prompt_sent, generated_prompt)."""
    user_text = build_llm_input(form)
    client = _get_client()
    response = client.messages.create(
        model=LLM_MODEL,
        max_tokens=512,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_text}],
    )
    generated = response.content[0].text.strip()
    return user_text, generated
