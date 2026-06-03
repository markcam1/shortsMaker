from __future__ import annotations
import html
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Protocol, runtime_checkable

from backend.config import OUTPUT_ASPECTS, OVERLAY_ENGINE

_ASSETS = Path(__file__).parent.parent / "assets" / "fonts"
_TEMPLATE = Path(__file__).parent.parent / "templates" / "quote_card.html"

FONT_FILES: dict[str, str] = {
    "inter-bold": str(_ASSETS / "inter-bold.ttf"),
    "inter-regular": str(_ASSETS / "inter-regular.ttf"),
    "playfair-bold": str(_ASSETS / "playfair-bold.ttf"),
}


@dataclass
class ColorSpec:
    bg_type: Literal["solid", "gradient"]
    bg_value: str   # hex for solid; "from_hex,to_hex,direction" for gradient
    text_color: str


@dataclass
class QuoteContent:
    term: str
    summary: str


@dataclass
class Template:
    safe_area_pct: int
    alignment: str
    term_size_pt: int
    body_size_pt: int
    max_chars: int
    term_font: str   # key into FONT_FILES
    body_font: str


@runtime_checkable
class OverlayService(Protocol):
    def render(
        self,
        *,
        background: Path | ColorSpec,
        content: QuoteContent,
        template: Template,
        aspect: str,
        out_path: Path,
    ) -> Path: ...


def _aspect_dims(aspect: str) -> tuple[int, int]:
    dims = OUTPUT_ASPECTS.get(aspect, [1080, 1920])
    return int(dims[0]), int(dims[1])


def _bg_css(background: Path | ColorSpec) -> str:
    if isinstance(background, Path):
        import base64
        data = base64.b64encode(background.read_bytes()).decode()
        return f"url('data:image/png;base64,{data}') center/cover no-repeat"
    if background.bg_type == "gradient":
        parts = background.bg_value.split(",")
        if len(parts) >= 2:
            direction = parts[2] if len(parts) > 2 else "to bottom"
            return f"linear-gradient({direction}, {parts[0]}, {parts[1]})"
        return background.bg_value
    return background.bg_value


class HtmlOverlay:
    """Renders quote cards via Playwright headless Chromium."""

    def render(
        self,
        *,
        background: Path | ColorSpec,
        content: QuoteContent,
        template: Template,
        aspect: str,
        out_path: Path,
    ) -> Path:
        from playwright.sync_api import sync_playwright

        width, height = _aspect_dims(aspect)
        safe_px = int(height * template.safe_area_pct / 100)
        side_px = int(width * 0.08)
        content_height = height - 2 * safe_px

        justify = "center"
        alignment = template.alignment
        if alignment == "left":
            justify = "flex-start"
        elif alignment == "right":
            justify = "flex-end"

        divider_width = "60%" if alignment == "center" else "80px"
        divider_margin = "auto" if alignment == "center" else "0"

        def font_url(font_id: str) -> str:
            import base64
            fpath = FONT_FILES.get(font_id, FONT_FILES.get("inter-regular", ""))
            if fpath and Path(fpath).exists():
                data = base64.b64encode(Path(fpath).read_bytes()).decode()
                return f"data:font/truetype;base64,{data}"
            return f"file://{fpath}"

        body_html = html.escape(content.summary).replace("\n", "<br>")
        term_html = html.escape(content.term)

        tpl = _TEMPLATE.read_text(encoding="utf-8")
        rendered = (
            tpl
            .replace("{{WIDTH}}", str(width))
            .replace("{{HEIGHT}}", str(height))
            .replace("{{BG_CSS}}", _bg_css(background))
            .replace("{{SAFE_PX}}", str(safe_px))
            .replace("{{SIDE_PX}}", str(side_px))
            .replace("{{CONTENT_HEIGHT}}", str(content_height))
            .replace("{{ALIGNMENT}}", alignment)
            .replace("{{JUSTIFY}}", justify)
            .replace("{{DIVIDER_WIDTH}}", divider_width)
            .replace("{{DIVIDER_MARGIN}}", divider_margin)
            .replace("{{TERM_FONT}}", template.term_font)
            .replace("{{BODY_FONT}}", template.body_font)
            .replace("{{TERM_SIZE}}", str(template.term_size_pt))
            .replace("{{BODY_SIZE}}", str(template.body_size_pt))
            .replace("{{TEXT_COLOR}}", _color_scheme_text(background))
            .replace("{{TERM}}", term_html)
            .replace("{{BODY}}", body_html)
            .replace("{{INTER_BOLD_URL}}", font_url("inter-bold"))
            .replace("{{INTER_REGULAR_URL}}", font_url("inter-regular"))
            .replace("{{PLAYFAIR_BOLD_URL}}", font_url("playfair-bold"))
        )

        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": width, "height": height})
            page.set_content(rendered, wait_until="networkidle")
            page.wait_for_timeout(200)
            page.screenshot(path=str(out_path), type="png")
            browser.close()

        return out_path


def _color_scheme_text(background: Path | ColorSpec) -> str:
    if isinstance(background, ColorSpec):
        return background.text_color
    return "#FFFFFF"


class PillowOverlay:
    """Fallback overlay renderer using Pillow. No font-file requirement."""

    def render(
        self,
        *,
        background: Path | ColorSpec,
        content: QuoteContent,
        template: Template,
        aspect: str,
        out_path: Path,
    ) -> Path:
        from PIL import Image, ImageDraw, ImageFont

        width, height = _aspect_dims(aspect)
        safe_px = int(height * template.safe_area_pct / 100)
        side_px = int(width * 0.08)

        # Create background
        if isinstance(background, Path) and background.exists():
            img = Image.open(background).convert("RGBA").resize((width, height))
        elif isinstance(background, ColorSpec) and background.bg_type == "solid":
            img = Image.new("RGBA", (width, height), _hex_to_rgba(background.bg_value))
        else:
            img = Image.new("RGBA", (width, height), (26, 26, 46, 255))

        # Semi-transparent scrim for readability
        scrim = Image.new("RGBA", (width, height), (0, 0, 0, 100))
        img = Image.alpha_composite(img, scrim)

        draw = ImageDraw.Draw(img)
        text_color = _color_scheme_text(background)
        tc = _hex_to_rgb(text_color)

        # Fonts — use default if TTF not available
        try:
            term_font_path = FONT_FILES.get(template.term_font, "")
            body_font_path = FONT_FILES.get(template.body_font, "")
            term_fnt = ImageFont.truetype(term_font_path, template.term_size_pt)
            body_fnt = ImageFont.truetype(body_font_path, template.body_size_pt)
        except Exception:
            term_fnt = ImageFont.load_default()
            body_fnt = ImageFont.load_default()

        # Draw term
        x = side_px
        y = safe_px + 40
        draw.text((x, y), content.term, font=term_fnt, fill=tc)

        # Draw body (wrapped)
        y += template.term_size_pt + 30
        max_w = width - 2 * side_px
        wrapped = _wrap_text(content.summary, body_fnt, max_w, draw)
        for line in wrapped:
            draw.text((x, y), line, font=body_fnt, fill=tc)
            y += template.body_size_pt + 8

        img.convert("RGB").save(str(out_path), "PNG")
        return out_path


def _hex_to_rgba(hex_color: str) -> tuple[int, int, int, int]:
    r, g, b = _hex_to_rgb(hex_color)
    return r, g, b, 255


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _wrap_text(text: str, font: any, max_width: int, draw: any) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def dict_to_template(t_dict: dict, cs_dict: dict, fp_dict: dict) -> Template:
    return Template(
        safe_area_pct=t_dict.get("safe_area_pct", 13),
        alignment=t_dict.get("alignment", "center"),
        term_size_pt=t_dict.get("term_size_pt", 52),
        body_size_pt=t_dict.get("body_size_pt", 26),
        max_chars=t_dict.get("max_chars", 220),
        term_font=fp_dict.get("term_font", "inter-bold"),
        body_font=fp_dict.get("body_font", "inter-regular"),
    )


def dict_to_color_spec(cs_dict: dict) -> ColorSpec:
    return ColorSpec(
        bg_type=cs_dict.get("bg_type", "solid"),
        bg_value=cs_dict.get("bg_value", "#1A1A2E"),
        text_color=cs_dict.get("text_color", "#FFFFFF"),
    )


def get_overlay_service() -> OverlayService:
    if OVERLAY_ENGINE == "pillow":
        return PillowOverlay()
    return HtmlOverlay()
