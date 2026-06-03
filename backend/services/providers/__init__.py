from __future__ import annotations
from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    def complete(self, *, system: str, user: str, max_tokens: int) -> str: ...
