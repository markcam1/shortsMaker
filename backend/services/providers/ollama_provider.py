from __future__ import annotations
import httpx


class OllamaProvider:
    def __init__(self, *, base_url: str, model: str):
        self._base_url = base_url.rstrip("/")
        self._model = model

    def complete(self, *, system: str, user: str, max_tokens: int) -> str:
        try:
            response = httpx.post(
                f"{self._base_url}/api/chat",
                json={
                    "model": self._model,
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "options": {"num_predict": max_tokens},
                },
                timeout=60.0,
            )
            response.raise_for_status()
            return response.json()["message"]["content"].strip()
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            raise RuntimeError(f"Ollama unreachable at {self._base_url}: {e}") from e
