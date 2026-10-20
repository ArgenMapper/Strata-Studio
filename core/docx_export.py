"""DOCX OOXML real, sin dependencia adicional ni conversión del proyecto original."""
import base64
import re
import zipfile
from html.parser import HTMLParser
from xml.etree import ElementTree as ET
from .layout import normalize_layout
from .clean_export import clean_export_html, VOID

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
ET.register_namespace("w", W)
ET.register_namespace("r", R)


def w(tag, attrs=None):
    return ET.Element(f"{{{W}}}{tag}", {f"{{{W}}}{key}": str(value) for key, value in (attrs or {}).items()})


class Node:
    def __init__(self, tag="root", attrs=()): self.tag, self.attrs, self.children = tag, dict(attrs), []


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.root = Node(); self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs); self.stack[-1].children.append(node)
        if tag not in VOID: self.stack.append(node)
    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag: self.stack = self.stack[:index]; break
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID: self.handle_endtag(tag)
    def handle_data(self, data): self.stack[-1].children.append(data)


def write_docx(path, raw_html, font_family="Georgia", font_size=16, line_height=1.75, page_layout=None):
    layout = normalize_layout(page_layout)
    tree = Tree(); tree.feed(clean_export_html(raw_html))
    document = w("document"); body = w("body"); document.append(body)
    media = []
    def run(parent, text, formats):
        r = w("r"); props = w("rPr")
        for tag in ("b", "i", "u", "strike"):
            if formats.get(tag): props.append(w(tag, {"val": "single"} if tag == "u" else None))
        if formats.get("color"): props.append(w("color", {"val": formats["color"]}))
        if formats.get("sup"): props.append(w("vertAlign", {"val": "superscript"}))
        r.append(props); t = w("t"); t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve"); t.text = text; r.append(t); parent.append(r)
    def inline(parent, node, formats=None):
        formats = dict(formats or {})
        if isinstance(node, str): run(parent, node, formats); return
        tag = node.tag
        if tag in ("strong", "b"): formats["b"] = True
        if tag in ("em", "i"): formats["i"] = True
        if tag in ("u", "s", "strike", "sup"): formats[{"s":"strike", "sup":"sup"}.get(tag, tag)] = True
        style = node.attrs.get("style", "")
        color = re.search(r"(?:^|;)\s*color\s*:\s*#([0-9a-fA-F]{6})", style)
        if color: formats["color"] = color[1]
        if tag == "br": r = w("r"); r.append(w("br")); parent.append(r)
        elif tag == "img":
            image(parent, node)
        else:
            for child in node.children: inline(parent, child, formats)
    def image(parent, node):
        match = re.fullmatch(r"data:image/(png|jpeg|jpg);base64,(.+)", node.attrs.get("src", ""), re.S)
        if not match:
            if node.attrs.get("alt"): run(parent, node.attrs["alt"], {})
            return
        try:
            raw = base64.b64decode(match[2], validate=True)
            from PySide6.QtGui import QImage
            picture = QImage.fromData(raw)
            if picture.isNull(): return
            ext = "png" if match[1] == "png" else "jpeg"
            index = len(media) + 1; name = f"image{index}.{ext}"; media.append((name, raw))
            max_width = (layout["width_mm"] - (layout["margins"]["left"] + layout["margins"]["right"]) * 10) / 25.4 * 914400
            cx = min(max_width, picture.width() * 9525); cy = cx * picture.height() / picture.width()
            # Namespaces are local to the DrawingML fragment.
            fragment = f'''<w:r xmlns:w="{W}" xmlns:r="{R}"><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="{int(cx)}" cy="{int(cy)}"/><wp:docPr id="{index}" name="{name}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="{index}" name="{name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImage{index}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{int(cx)}" cy="{int(cy)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'''
            parent.append(ET.fromstring(fragment))
        except (ValueError, ImportError):
            pass
    block_tags = {"p", "h1", "h2", "h3", "h4", "blockquote", "pre", "li"}
    def paragraph(parent, node):
        p = w("p"); props = w("pPr"); p.append(props)
        if node.tag in ("h1", "h2", "h3", "h4"): props.append(w("pStyle", {"val": "Heading" + node.tag[1]}))
        if node.tag == "pre": props.append(w("pStyle", {"val": "Code"}))
        if node.tag == "blockquote": props.append(w("ind", {"left": 720 if 'apa-block' in node.attrs.get('class','').split() else 480}))
        classes = node.attrs.get("class", "").split()
        if "bibliography-entry" in classes: props.append(w("ind", {"left": 480, "hanging": 480}))
        elif layout["indent_cm"] and node.tag!='blockquote': props.append(w("ind", {"firstLine": round(layout["indent_cm"] / 2.54 * 1440)}))
        if 'apa-block' in classes: props.append(w('spacing',{'line':480,'lineRule':'auto'}))
        align = re.search(r"text-align:\s*(left|center|right|justify)", node.attrs.get("style", ""))
        if align: props.append(w("jc", {"val": "both" if align[1] == "justify" else align[1]}))
        if node.tag == "li": run(p, "• ", {})
        for child in node.children: inline(p, child)
        parent.append(p)
    def blocks(parent, node):
        pending = []
        def flush():
            if pending:
                n = Node("p"); n.children = pending[:]; paragraph(parent, n); pending.clear()
        for child in node.children:
            if isinstance(child, str):
                if child.strip(): pending.append(child)
            elif child.tag in block_tags: flush(); paragraph(parent, child)
            elif child.tag == "table":
                flush(); table = w("tbl"); properties = w("tblPr"); borders = w("tblBorders")
                for side in ("top", "left", "bottom", "right", "insideH", "insideV"): borders.append(w(side, {"val":"single", "sz":4, "color":"CCCCCC"}))
                properties.append(borders); table.append(properties)
                def rows(n):
                    for item in n.children:
                        if isinstance(item, Node):
                            if item.tag == "tr": yield item
                            else: yield from rows(item)
                for row in rows(child):
                    tr = w("tr")
                    for cell in row.children:
                        if not isinstance(cell, Node) or cell.tag not in ("td", "th"): continue
                        tc = w("tc"); blocks(tc, cell)
                        if not len(tc) or tc[-1].tag != f"{{{W}}}p": tc.append(w("p"))
                        tr.append(tc)
                    table.append(tr)
                parent.append(table); parent.append(w("p"))
            elif "page-break" in child.attrs.get("class", "").split():
                flush(); p = w("p"); r = w("r"); r.append(w("br", {"type":"page"})); p.append(r); parent.append(p)
            elif child.tag in ("img", "span", "a", "b", "strong", "i", "em"): pending.append(child)
            else: flush(); blocks(parent, child)
        flush()
    blocks(body, tree.root)
    section = w("sectPr"); section.append(w("pgSz", {"w":round(layout["width_mm"] / 25.4 * 1440), "h":round(layout["height_mm"] / 25.4 * 1440)}))
    section.append(w("pgMar", {key:round(value / 2.54 * 1440) for key, value in layout["margins"].items()})); section.append(w("cols", {"num":layout["columns"]})); body.append(section)
    styles = w("styles"); defaults = w("docDefaults"); rp = w("rPrDefault"); props = w("rPr"); props.append(w("rFonts", {"ascii":font_family, "hAnsi":font_family})); props.append(w("sz", {"val":round(float(font_size) * 1.5)})); rp.append(props); defaults.append(rp)
    pp = w("pPrDefault"); props = w("pPr"); props.append(w("spacing", {"line":round((layout["line_height"] or line_height) * 240), "lineRule":"auto", "after":round(layout["space_after"] * 20), "before":round(layout["space_before"] * 20)})); pp.append(props); defaults.append(pp); styles.append(defaults)
    for index in range(1, 5):
        style = w("style", {"type":"paragraph", "styleId":f"Heading{index}"}); style.append(w("name", {"val":f"heading {index}"})); props = w("pPr"); props.append(w("outlineLvl", {"val":index-1})); style.append(props); props = w("rPr"); props.append(w("b")); props.append(w("sz", {"val":40-index*4})); style.append(props); styles.append(style)
    code = w("style", {"type":"paragraph", "styleId":"Code"}); props = w("rPr"); props.append(w("rFonts", {"ascii":"Consolas", "hAnsi":"Consolas"})); code.append(props); styles.append(code)
    content_types = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
    relationships = f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="{R}/styles" Target="styles.xml"/>'
    for index, (name, _) in enumerate(media, 1): relationships += f'<Relationship Id="rIdImage{index}" Type="{R}/image" Target="media/{name}"/>'
    relationships += '</Relationships>'
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{R}/officeDocument" Target="word/document.xml"/></Relationships>')
        archive.writestr("word/document.xml", ET.tostring(document, encoding="utf-8", xml_declaration=True))
        archive.writestr("word/styles.xml", ET.tostring(styles, encoding="utf-8", xml_declaration=True))
        archive.writestr("word/_rels/document.xml.rels", relationships)
        for name, raw in media: archive.writestr("word/media/" + name, raw)
