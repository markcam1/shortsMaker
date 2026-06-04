from __future__ import annotations
from google import genai
from google.genai import types


class GeminiProvider:
    def __init__(self, *, api_key: str, model: str):
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def complete(self, *, system: str, user: str, max_tokens: int) -> str:
        response = self._client.models.generate_content(
            model=self._model,
            contents=user,
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_modalities=["TEXT"],
                max_output_tokens=max_tokens,
            ),
        )
        return response.candidates[0].content.parts[0].text.strip()
