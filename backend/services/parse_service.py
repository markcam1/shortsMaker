from __future__ import annotations
import re
from pathlib import Path
from typing import Protocol, runtime_checkable

from backend.models.schemas import ParsedItem


@runtime_checkable
class ContentSource(Protocol):
    def load(self) -> tuple[str, str]: ...  # (filename, raw_text)


class UploadSource:
    """Wraps bytes uploaded via multipart form."""
    def __init__(self, filename: str, content: bytes):
        self._filename = filename
        self._content = content

    def load(self) -> tuple[str, str]:
        return self._filename, self._content.decode("utf-8", errors="replace")


class ConfiguredFileSource:
    """Reads a file path from config (for batch/CI use)."""
    def __init__(self, path: str | Path):
        self._path = Path(path)

    def load(self) -> tuple[str, str]:
        return self._path.name, self._path.read_text(encoding="utf-8")


@runtime_checkable
class Parser(Protocol):
    def parse(self, text: str) -> tuple[list[ParsedItem], int]: ...  # (items, skipped)


class ImagePostParser:
    """Splits file on blank lines; each non-empty block becomes one ParsedItem."""
    def parse(self, text: str) -> tuple[list[ParsedItem], int]:
        blocks = re.split(r"\n\s*\n", text.strip())
        items = []
        for block in blocks:
            block = block.strip()
            if block:
                items.append(ParsedItem(term=block, body=""))
        return items, 0


_QUOTE_RE = re.compile(
    r"^\s*\*\*(?P<term>.+?):\*\*\s*(?P<body>.*)",
    re.DOTALL | re.MULTILINE,
)


class QuotePostParser:
    """Parses **Term:** body glossary format. Skips non-matching blocks."""
    def parse(self, text: str) -> tuple[list[ParsedItem], int]:
        blocks = re.split(r"\n\s*\n", text.strip())
        items: list[ParsedItem] = []
        skipped = 0
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            m = _QUOTE_RE.match(block)
            if m:
                term = m.group("term").strip()
                body = m.group("body").strip()
                items.append(ParsedItem(term=term, body=body))
            else:
                skipped += 1
        return items, skipped


class CsvParser:
    """Phase-2 parser — not yet implemented."""
    def parse(self, text: str) -> tuple[list[ParsedItem], int]:
        raise NotImplementedError("CsvParser is a Phase-2 feature")


def get_parser(format: str) -> Parser:
    if format == "quote":
        return QuotePostParser()
    return ImagePostParser()
