from pathlib import Path
from google import genai
from google.genai import types
from backend.config import GOOGLE_API_KEY, IMAGE_MODELS

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client


def _model_config(model_id: str) -> dict:
    for m in IMAGE_MODELS:
        if m["id"] == model_id:
            return m
    raise ValueError(f"Unknown image model id: {model_id!r}")


def _via_generate_content(
    client: genai.Client,
    model_name: str,
    prompt: str,
    num_images: int,
    reference_image_path: Path | None = None,
) -> list[bytes]:
    """For Gemini models that support image output via generate_content."""
    if reference_image_path and reference_image_path.exists():
        image_bytes = reference_image_path.read_bytes()
        contents = [
            prompt,
            types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
        ]
    else:
        contents = prompt

    results = []
    for _ in range(num_images):
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                results.append(part.inline_data.data)
                break
    return results


def _via_generate_images(client: genai.Client, model_name: str, prompt: str, num_images: int) -> list[bytes]:
    """For Imagen models that use the generate_images endpoint."""
    response = client.models.generate_images(
        model=model_name,
        prompt=prompt,
        config=types.GenerateImagesConfig(number_of_images=num_images),
    )
    return [img.image.image_bytes for img in response.generated_images]


def generate_images(
    prompt: str,
    model_id: str,
    candidates_dir: Path,
    reference_image_path: Path | None = None,
) -> list[Path]:
    """
    Generates images and saves them as PNG files under candidates_dir.
    Dispatches to generate_content or generate_images based on config api field.
    Returns a list of saved file paths.
    """
    cfg = _model_config(model_id)
    model_name = cfg["model"]
    num_images = cfg.get("num_images", 2)
    api = cfg.get("api", "generate_content")

    client = _get_client()

    if api == "generate_images":
        image_bytes_list = _via_generate_images(client, model_name, prompt, num_images)
    else:
        image_bytes_list = _via_generate_content(client, model_name, prompt, num_images, reference_image_path)

    if not image_bytes_list:
        raise RuntimeError("Image model returned no images for this prompt.")

    saved: list[Path] = []
    for i, image_bytes in enumerate(image_bytes_list):
        path = candidates_dir / f"{i}.png"
        path.write_bytes(image_bytes)
        saved.append(path)

    return saved
