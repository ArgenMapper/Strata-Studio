"""Medidas comunes a editor, PDF y Word. Unidades públicas: centímetros."""
import math
import re

PAPERS = {"a4": (210.0, 297.0), "letter": (215.9, 279.4), "oficio": (216.0, 330.0), "book": (150.0, 230.0)}


def number(value, default, low, high):
    try:
        result = float(value)
        return max(low, min(high, result)) if math.isfinite(result) else default
    except (TypeError, ValueError):
        return default


def normalize_layout(raw: dict | None = None) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    paper = raw.get("paper") if raw.get("paper") in PAPERS else "a4"
    orientation = "landscape" if raw.get("orientation") == "landscape" else "portrait"
    width, height = PAPERS[paper]
    if orientation == "landscape":
        width, height = height, width
    default = {"normal": 2.5, "narrow": 1.27, "moderate": 1.91, "apa": 2.54, "wide": 3.8}.get(raw.get("preset"), 2.5)
    margins = raw.get("margins") if isinstance(raw.get("margins"), dict) else {}
    result = {"paper": paper, "orientation": orientation, "width_mm": width, "height_mm": height,
            "margins": {key: number(margins.get(key), default, .2, 8) for key in ("top", "right", "bottom", "left")},
            "columns": int(raw.get("columns")) if raw.get("columns") in (1, 2, 3) else 1, "indent_cm": number(raw.get("indent_cm"), 0, 0, 5)}

    result.update({
        "space_before": number(raw.get("space_before"), 0, 0, 100),
        "space_after": number(raw.get("space_after"), 9, 0, 100),
        "line_height": number(raw.get("line_height"), 0, 0, 3),
        "header": str(raw.get("header", ""))[:250],
        "footer": str(raw.get("footer", ""))[:250],
        "watermark": str(raw.get("watermark", ""))[:100],
        "page_numbers": bool(raw.get("page_numbers")),
        "border": raw.get("border") if raw.get("border") in ("simple", "double") else "none",
        "color": raw.get("color") if re.fullmatch(r"#[0-9a-fA-F]{6}", str(raw.get("color", ""))) else "#ffffff",
        "texture": raw.get("texture") if raw.get("texture") in ("lines", "dots") else "none",
    })
    return result
