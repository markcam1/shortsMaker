from __future__ import annotations
from backend.config import ANTHROPIC_API_KEY, GOOGLE_API_KEY, LLM_CONFIG, resolve_llm
from backend.models.schemas import FormInput
from backend.services.providers import LLMProvider
from backend.services.providers.anthropic_provider import AnthropicProvider
from backend.services.providers.gemini_provider import GeminiProvider
from backend.services.providers.ollama_provider import OllamaProvider

_PROMPT_CREATION_SYSTEM = (
    "You are a creative director specializing in visual storytelling. "
    "Your job is to write a single, richly detailed text-to-image prompt "
    "that an image generation model can use directly. "
    "Output only the prompt text — no preamble, no labels, no quotes."
)

_SUMMARIZE_SYSTEM = (
    "You are a concise copywriter. Given a financial or technical term and its full definition, "
    "write a clear, accurate summary suitable for a social media card. "
    "Output only the summary text — no preamble, no labels, no quotes."
)


def get_provider(task: str) -> LLMProvider:
    provider_name, model = resolve_llm(task)
    if provider_name == "anthropic":
        return AnthropicProvider(api_key=ANTHROPIC_API_KEY, model=model)
    if provider_name == "gemini":
        return GeminiProvider(api_key=GOOGLE_API_KEY, model=model)
    if provider_name == "ollama":
        base_url = LLM_CONFIG["providers"]["ollama"].get("base_url", "http://localhost:11434")
        return OllamaProvider(base_url=base_url, model=model)
    raise ValueError(f"Unknown LLM provider: {provider_name!r}")


def _build_prompt_input(form: FormInput) -> str:
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
    user_text = _build_prompt_input(form)
    provider = get_provider("prompt_creation")
    generated = provider.complete(system=_PROMPT_CREATION_SYSTEM, user=user_text, max_tokens=512)
    return user_text, generated


def generate_prompt_from_desc(description: str) -> tuple[str, str]:
    """Generate a text-to-image prompt from a free-text background description."""
    user_text = f"Create a text-to-image prompt for this background: {description}"
    provider = get_provider("prompt_creation")
    generated = provider.complete(system=_PROMPT_CREATION_SYSTEM, user=user_text, max_tokens=512)
    return user_text, generated


def summarize(term: str, body: str, max_chars: int) -> str:
    """Condense a definition to fit on a social media card."""
    user_text = (
        f"Term: {term}\n"
        f"Definition: {body}\n"
        f"Write a summary that fits within {max_chars} characters."
    )
    provider = get_provider("summarize")
    return provider.complete(system=_SUMMARIZE_SYSTEM, user=user_text, max_tokens=256)
