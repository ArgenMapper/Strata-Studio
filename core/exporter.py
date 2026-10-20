"""Conversión de la Capa Base a HTML imprimible, Markdown y texto plano."""

import html
import json
import re
from .layout import normalize_layout
from .clean_export import clean_export_html


def html_to_plain_and_markdown(raw_html: str, title: str) -> tuple[str, str]:
    md = clean_export_html(raw_html)
    md = re.sub(r'<div class="page-break"[^>]*></div>', "\n\n", md, flags=re.I)
    md = re.sub(r"<hr[^>]*>", "\n\n* * *\n\n", md, flags=re.I)
    md = re.sub(r"<h1[^>]*>(.*?)</h1>", r"\n# \1\n\n", md, flags=re.I | re.S)
    md = re.sub(r"<h2[^>]*>(.*?)</h2>", r"\n## \1\n\n", md, flags=re.I | re.S)
    md = re.sub(r"<h3[^>]*>(.*?)</h3>", r"\n### \1\n\n", md, flags=re.I | re.S)
    md = re.sub(r"<blockquote[^>]*>(.*?)</blockquote>", r"\n> \1\n\n", md, flags=re.I | re.S)
    md = re.sub(r"<(strong|b)(\s[^>]*)?>(.*?)</\1>", r"**\3**", md, flags=re.I | re.S)
    md = re.sub(r"<(em|i)(\s[^>]*)?>(.*?)</\1>", r"*\3*", md, flags=re.I | re.S)
    md = re.sub(r"<li[^>]*>(.*?)</li>", r"- \1\n", md, flags=re.I | re.S)
    md = re.sub(r"<br\s*/?>", "\n", md, flags=re.I)
    md = re.sub(r"</(p|div|ul|ol)>", "\n\n", md, flags=re.I)
    md = re.sub(r"<[^>]+>", "", md)
    md = html.unescape(md).replace("\xa0", " ")
    md = re.sub(r"\n{3,}", "\n\n", md).strip()

    plain = re.sub(r"^#{1,6}\s+", "", md, flags=re.M)
    plain = re.sub(r"^>\s?", "", plain, flags=re.M)
    plain = plain.replace("**", "").replace("* * *", "*").replace("*", "").replace("\n\n\n", "\n\n")
    plain = re.sub(r"^\s*$\n?(?=\s*$)", "", plain, flags=re.M)

    full_md = f"# {title}\n\n{md}\n" if title else f"{md}\n"
    full_txt = f"{title}\n{'=' * len(title)}\n\n{plain}\n" if title else f"{plain}\n"
    return full_txt, full_md


def build_export_html_doc(
    raw_html: str,
    title: str,
    font_family: str = "Georgia",
    font_size: float = 16,
    line_height: float = 1.75,
    page_layout: dict | None = None,
) -> str:
    raw_html = clean_export_html(raw_html)
    safe_title = html.escape(title or "Documento")
    layout = normalize_layout(page_layout)
    def css_text(value):
        return json.dumps(value, ensure_ascii=True).replace("<", "\\3c ")
    header_css = css_text(layout["header"])
    footer_css = css_text(layout["footer"] + (" · " if layout["footer"] and layout["page_numbers"] else ""))
    footer_counter = " counter(page)" if layout["page_numbers"] else ""
    watermark = html.escape(layout["watermark"])
    watermark_html = f'<div class="print-watermark">{watermark}</div>' if watermark else ""
    border = {"simple": "1px solid #777", "double": "4px double #777", "none": "none"}[layout["border"]]
    color = layout["color"].lstrip("#")
    r, g, b = (int(color[i:i+2], 16) for i in (0, 2, 4))
    ink = "#161616" if r * .299 + g * .587 + b * .114 > 150 else "#eeeeef"
    line_height = layout["line_height"] or line_height
    margins = " ".join(f"{layout['margins'][key]}cm" for key in ("top", "right", "bottom", "left"))
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>{safe_title}</title>
<style>
  @page {{ size: {layout['width_mm']}mm {layout['height_mm']}mm; margin: {margins};
    @top-center {{ content: {header_css}; font: 9pt Georgia; color: #777; }}
    @bottom-center {{ content: {footer_css}{footer_counter}; font: 9pt Georgia; color: #777; }}
  }}
  body {{
    font-family: '{font_family}', Georgia, serif;
    margin: 0; padding: 0;
    column-count: {layout['columns']}; column-gap: 1cm;
    line-height: {line_height}; font-size: {font_size}px;
    color: {ink}; background: {layout["color"]}; border: {border};
  }}
  h1.doc-main-title {{ font-size: 24pt; font-weight: 600; text-align: center; margin: 40pt 0 28pt; letter-spacing: .01em; }}
  h1 {{ font-size: 19pt; margin: 16pt 0 8pt; }}
  h2 {{ font-size: 15pt; margin: 14pt 0 7pt; }}
  h3 {{ font-size: 12.5pt; margin: 12pt 0 6pt; }}
  p {{ margin: {layout["space_before"]}pt 0 {layout["space_after"]}pt; }}
  .print-watermark {{ position: fixed; top: 40%; left: 5%; width: 90%; text-align: center; transform: rotate(-30deg); font-size: 48pt; opacity: .09; z-index: -1; }}
  p:not(.bibliography-entry) {{ text-indent: {layout['indent_cm']}cm; }}
  .bibliography-entry {{ margin-left: 0; padding-left: 2em; text-indent: -2em; }}
  .auto-bibliography {{ break-before: page; column-span: all; }}
  .strata-toc {{ column-span: all; padding: 12pt; border: 1px solid #ccc; }}
  .strata-toc a {{ display: block; color: inherit; text-decoration: none; }}
  .toc-level-2 {{ margin-left: 14pt; }}
  .toc-level-3 {{ margin-left: 28pt; }}
  blockquote {{ margin: 10pt 24pt; font-style: italic; color: #444; }}
  blockquote.apa-block {{ margin: 10pt 0 10pt 1.27cm; text-indent: 0; font-style: normal; line-height: 2; color: inherit; }}
  img {{ max-width: 100% !important; height: auto !important; }}
  hr {{ border: none; height: 1px; background: #bbb; width: 30%; margin: 20pt auto; }}
  hr.scene-divider {{ background: none; height: auto; text-align: center; overflow: visible; }}
  hr.scene-divider::after {{ content: "\\2756"; color: #777; font-size: 11pt; letter-spacing: 1em; }}
  .page-break {{ page-break-before: always; break-before: page; height: 0; }}
  .sheet-title {{ page-break-before: always; break-before: page; }}
  .sheet-title:first-of-type {{ page-break-before: auto; break-before: auto; }}
</style>
</head>
<body>
  {raw_html}
  {watermark_html}
</body>
</html>
"""
