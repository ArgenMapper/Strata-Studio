"""Defensa de exportación: las anotaciones nunca forman parte del manuscrito."""
from html.parser import HTMLParser
from html import escape

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class CleanDocument(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.output = []
        self.stack = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs); classes = values.get("class", "").split()
        evidence = values.get("data-layer-kind") == "evidence"
        ignore = (values.get("data-export") == "ignore" or any(c in classes for c in ("strata-layer-annotation", "layer-block", "note-card"))) and not evidence
        hidden = (self.stack[-1][1] if self.stack else False) or ignore or tag in ("script", "style")
        unwrap = evidence or (tag == "span" and "layer-inline" in classes)
        # Legacy in-line notes without evidence metadata are annotations, too.
        if "layer-inline" in classes and not evidence:
            hidden = True
        if not hidden and not unwrap:
            clean = [(k, v) for k, v in attrs if not k.startswith("data-layer") and k != "data-export" and not k.startswith("on")]
            self.output.append("<" + tag + "".join(f' {k}="{escape(v or "", quote=True)}"' for k, v in clean) + ">")
        if tag not in VOID:
            self.stack.append((tag, hidden, unwrap))

    def handle_endtag(self, tag):
        if tag in VOID or not self.stack:
            return
        _, hidden, unwrap = self.stack.pop()
        if not hidden and not unwrap:
            self.output.append(f"</{tag}>")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID: self.handle_endtag(tag)

    def handle_data(self, data):
        if not self.stack or not self.stack[-1][1]: self.output.append(data)

    def handle_entityref(self, name): self.handle_data(f"&{name};")
    def handle_charref(self, name): self.handle_data(f"&#{name};")


def clean_export_html(raw):
    parser = CleanDocument()
    parser.feed(raw or "")
    return "".join(parser.output)
