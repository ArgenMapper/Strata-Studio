"""Lectura/escritura atómica de proyectos (.strata/.json), config_usuario.json, proyectos recientes y soporte PyInstaller."""

import html
import json
import re
import sys
import threading
import unicodedata
from copy import deepcopy
from datetime import datetime
from pathlib import Path

from . import APP_VERSION
from .platforms import application_root, data_directory
from .templates import (
    DEFAULT_DATA,
    EMPTY_PROJECT_TEMPLATE,
    TEMPLATES_CATALOG,
    build_project_from_template,
    make_default_sheet_layers,
)


def resource_path(relative_path: str = "") -> Path:
    """Devuelve la ruta de recursos empaquetados (compatible con PyInstaller _MEIPASS y ejecución directa)."""
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        base = Path(getattr(sys, "_MEIPASS"))
    else:
        base = Path(__file__).resolve().parent.parent
    external = application_root()
    if relative_path in ("ui", "core") and (external / relative_path).is_dir():
        return external / relative_path
    return (base / relative_path).resolve() if relative_path else base.resolve()


def writable_app_dir() -> Path:
    """Windows conserva sus rutas; Mac y Linux usan datos por usuario."""
    directory = data_directory()
    if sys.platform != 'win32':
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    return directory


BASE_DIR = writable_app_dir()
UI_DIR = resource_path("ui")
ICON_FILE = BASE_DIR / "app_icon.ico"
BUNDLED_ICON_FILE = resource_path("app_icon.ico")
DEFAULT_DATA_FILE = BASE_DIR / "proyecto_datos.json"
CONFIG_FILE = BASE_DIR / "config_usuario.json"
PROJECTS_DIR = BASE_DIR / "Proyectos"
BACKUPS_DIR = BASE_DIR / "backups"

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_BLOCK_SPLIT_RE = re.compile(r"</?(?:p|div|h1|h2|h3|h4|li|blockquote|tr)[^>]*>", re.IGNORECASE)


def _slug_name(text: str, fallback: str = "Proyecto") -> str:
    norm = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^\w\-]+", "_", norm).strip("_") or fallback


def _atomic_write_json(target: Path, payload: dict) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(target)


def _strip_html_to_text(raw_html: str) -> str:
    if not raw_html:
        return ""
    spaced = re.sub(r"</?(p|div|h1|h2|h3|h4|li|blockquote|br|hr|tr|td|th)[^>]*>", " ", raw_html, flags=re.IGNORECASE)
    no_tags = _TAG_RE.sub("", spaced)
    unescaped = html.unescape(no_tags)
    return _WS_RE.sub(" ", unescaped).strip()


def _extract_preview_lines(raw_html: str, max_lines: int = 4) -> list[str]:
    if not raw_html:
        return []
    chunks = _BLOCK_SPLIT_RE.split(raw_html)
    lines: list[str] = []
    for ch in chunks:
        txt = _WS_RE.sub(" ", html.unescape(_TAG_RE.sub("", ch))).strip()
        if txt:
            lines.append(txt[:90] + ("…" if len(txt) > 90 else ""))
            if len(lines) >= max_lines:
                break
    return lines


def compute_project_stats(data: dict, file_path: Path) -> dict:
    """Calcula el conteo real de palabras, capítulos, fichas, notas y vista previa de un proyecto."""
    doc = (data or {}).get("document") or {}
    sheets = doc.get("sheets") or []
    if not sheets and doc.get("base_html"):
        sheets = [{"id": "sheet_1", "title": "Capítulo 1", "pages": [doc.get("base_html", "")]}]

    all_texts: list[str] = []
    preview_lines: list[str] = []
    layers_count = 0
    notes_count = 0
    for s in sheets:
        pages = s.get("pages") or [s.get("base_html") or ""]
        for p_html in pages:
            raw_str = str(p_html or "")
            if len(preview_lines) < 4:
                for ln in _extract_preview_lines(raw_str, 4 - len(preview_lines)):
                    preview_lines.append(ln)
            txt = _strip_html_to_text(raw_str)
            if txt:
                all_texts.append(txt)
        s_layers = s.get("layers") or []
        layers_count += len(s_layers)
        for l in s_layers:
            notes_count += len(l.get("annotations") or [])

    if not layers_count and isinstance(data.get("layers"), list):
        layers_count = len(data["layers"])
        for l in data["layers"]:
            notes_count += len(l.get("annotations") or [])

    full_text = " ".join(all_texts).strip()
    words = len(full_text.split()) if full_text else 0
    chars = len(full_text)
    excerpt = (full_text[:165].rstrip() + "…") if len(full_text) > 165 else (full_text or "Sin contenido escrito todavía.")

    updated_raw = doc.get("updated_at") or ""
    try:
        mtime = file_path.stat().st_mtime if file_path.exists() else datetime.now().timestamp()
    except Exception:
        mtime = datetime.now().timestamp()

    if not updated_raw:
        updated_raw = datetime.fromtimestamp(mtime).isoformat()

    return {
        "title": doc.get("title") or file_path.stem.replace("_", " "),
        "file_path": str(file_path.resolve()),
        "file_name": file_path.name,
        "words": words,
        "chars": chars,
        "sheets_count": max(1, len(sheets)),
        "fichas_count": len((data or {}).get("fichas") or []),
        "layers_count": max(1, layers_count),
        "notes_count": notes_count,
        "excerpt": excerpt,
        "preview_lines": preview_lines or ["Documento en blanco"],
        "updated_at": updated_raw,
        "mtime": mtime,
    }


# ---------------------------------------------------------------------------
# Proyecto (con capas independientes por cada hoja/capítulo y fichas enriquecidas)
# ---------------------------------------------------------------------------
def _normalize_layer_list(layers: list[dict], sheet_id: str) -> list[dict]:
    if not layers or not isinstance(layers, list):
        return make_default_sheet_layers(sheet_id, include_sample_notes=False)
    out = deepcopy(layers)
    if not any(l.get("is_base") for l in out):
        out.append(
            {
                "id": f"layer_base_{sheet_id}",
                "name": "Capa Base (Texto Final)",
                "description": "Manuscrito principal limpio para exportación",
                "color": "#6889B5",
                "visible": True,
                "opacity": 100,
                "is_base": True,
                "order": 0,
                "overlay_html": "",
                "annotations": [],
            }
        )
    for l in out:
        l.setdefault("description", "")
        l.setdefault("opacity", 100)
        l.setdefault("visible", True)
        l.setdefault("overlay_html", "")
        l.setdefault("annotations", [])
        for ann in l["annotations"]:
            ann.setdefault("sheet_id", sheet_id)
            ann.setdefault("anchor_pid", "")
            ann.setdefault("anchor_paragraph", 1)
            ann.setdefault("quote", "")
            ann.setdefault("text", "")
    return out


def upgrade_project(data: dict) -> dict:
    """Migra archivos de versiones anteriores a 6.0 con capas independientes y fichas con propiedades/avatar."""
    doc = data.setdefault("document", {})
    legacy_layers = data.get("layers", [])
    data.setdefault("fichas", [])
    data.setdefault("scraps", [])
    data.setdefault("categories", [])
    data.setdefault("research", {"citations": [], "style": "apa"})
    data.setdefault("planning", {"nodes": [], "edges": [], "events": []})
    data['planning'].setdefault('time_mode','calendar' if data['planning'].get('events') else 'free')
    data.setdefault('canvases',[])
    doc.setdefault("layout", {})

    for f in data["fichas"]:
        if isinstance(f, dict):
            f.setdefault("image", "")
            f.setdefault('relations',[])
            f.setdefault('notes','')
            f.setdefault('extracts',[])
            if not isinstance(f.get("properties"), list):
                f["properties"] = []

    sheets = doc.get("sheets")
    if not sheets or not isinstance(sheets, list):
        initial = doc.get("base_html") or "<p><br></p>"
        sheets = [{"id": "sheet_1", "title": "Capítulo 1", "pages": [initial]}]
        doc["sheets"] = sheets

    for idx, s in enumerate(sheets):
        sid = s.setdefault("id", f"sheet_{idx + 1}")
        s.setdefault("title", f"Capítulo {idx + 1}")
        s.setdefault("snapshots", [])
        if not s.get("pages") or not isinstance(s.get("pages"), list):
            s["pages"] = [s.get("base_html") or "<p><br></p>"]
        s.pop("base_html", None)

        if not s.get("layers") or not isinstance(s.get("layers"), list):
            if idx == 0 and legacy_layers:
                s_layers = []
                for ll in deepcopy(legacy_layers):
                    ll["annotations"] = [
                        a for a in (ll.get("annotations") or []) if a.get("sheet_id", sid) == sid
                    ]
                    s_layers.append(ll)
                s["layers"] = _normalize_layer_list(s_layers, sid)
            else:
                s["layers"] = make_default_sheet_layers(sid, include_sample_notes=(idx == 0 and not legacy_layers))
        else:
            s["layers"] = _normalize_layer_list(s["layers"], sid)

        default_active = next((l["id"] for l in s["layers"] if l.get("is_base")), s["layers"][0]["id"])
        s.setdefault("active_layer_id", default_active)

    doc.setdefault("title", "Proyecto sin título")
    doc.setdefault("active_sheet_id", sheets[0]["id"])
    data.pop("layers", None)
    data["version"] = APP_VERSION
    return data


class ProjectStore:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.current_path: Path = DEFAULT_DATA_FILE
        self.opened_from_cli: bool = False

    def load(self, path: Path | None = None) -> dict:
        target = Path(path or self.current_path).resolve()
        with self.lock:
            if not target.exists():
                data = deepcopy(DEFAULT_DATA)
                _atomic_write_json(target, data)
                register_recent_file(target)
                return data
            try:
                loaded = upgrade_project(json.loads(target.read_text(encoding="utf-8")))
                register_recent_file(target)
                return loaded
            except Exception:
                broken = target.with_suffix(target.suffix + ".corrupto")
                try:
                    target.replace(broken)
                except Exception:
                    pass
                data = deepcopy(DEFAULT_DATA)
                _atomic_write_json(target, data)
                register_recent_file(target)
                return data

    def save(self, payload: dict, path: Path | None = None) -> Path:
        target = Path(path or self.current_path).resolve()
        with self.lock:
            clean = {k: v for k, v in payload.items() if not k.startswith("_")}
            _atomic_write_json(target, clean)
            register_recent_file(target)
        return target

    def state_with_meta(self, data: dict) -> dict:
        data["_file_path"] = str(self.current_path)
        data["_file_name"] = self.current_path.name
        data["_opened_from_cli"] = bool(self.opened_from_cli)
        return data

    @staticmethod
    def empty_project() -> dict:
        return deepcopy(EMPTY_PROJECT_TEMPLATE)

    @staticmethod
    def project_from_template(template_id: str, custom_title: str = "") -> dict:
        return upgrade_project(build_project_from_template(template_id, custom_title))


store = ProjectStore()


# ---------------------------------------------------------------------------
# Configuración del usuario (config_usuario.json) y Proyectos Recientes
# ---------------------------------------------------------------------------
DEFAULT_CONFIG = {
    "personal_dictionary": [],
    "custom_theme": {},
    "project_covers": {},
    "template_covers": {},
    "wiki_view": "portrait",
    "theme": "grafito",
    "xray_mode": False,
    "show_home_on_startup": True,
    "panels": {"wiki": True, "layers": True, "scraps": True, "toolbar": True},
    "ribbon_collapsed": False,
    "focus_level": 0,
    "autoformat": {
        "scene_divider": True,
        "em_dash": True,
        "dash_start": "dialogue",
        "auto_numbered": True,
        "mini_toolbar": True,
        "sanitize_paste": True,
    },
    "page": {"view_mode": "pages", "margin": "normal"},
    "editor": {"font_family": "Georgia", "font_size": 16, "line_height": 1.75, "zoom": 100},
    "autosave": {"enabled": True, "delay_ms": 800},
    "backups": {"on_manual_save": False},
    "parallel_sync_scroll": True,
    "layout": {"left_width": 268, "right_width": 292, "scraps_height": 150},
    "shortcuts": {
        "save": "Ctrl+S",
        "save_as": "Ctrl+Shift+S",
        "open": "Ctrl+O",
        "new": "Ctrl+N",
        "export_pdf": "Ctrl+P",
        "paste_plain": "Ctrl+Shift+V",
        "focus": "F11",
        "toggle_wiki": "Ctrl+1",
        "toggle_layers": "Ctrl+2",
        "toggle_scraps": "Ctrl+3",
        "toggle_toolbar": "Ctrl+4",
        "add_note": "Ctrl+Shift+M",
        "new_ficha": "Ctrl+Shift+F",
        "send_scrap": "Ctrl+Shift+R",
        "scene_break": "Ctrl+Shift+H",
        "zoom_in": "Ctrl+=",
        "zoom_out": "Ctrl+-",
        "settings": "Ctrl+,",
    },
    "last_file": "",
    "recent_files": [],
    "pinned_recent_files": [],
    "removed_recent_files": [],
    "window": {},
}

_config_lock = threading.RLock()
_BACKEND_ONLY_KEYS = ("last_file", "recent_files", "pinned_recent_files", "removed_recent_files", "window")


def _deep_merge(base: dict, extra: dict) -> dict:
    out = deepcopy(base)
    for k, v in (extra or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def load_config() -> dict:
    with _config_lock:
        stored = {}
        if CONFIG_FILE.exists():
            try:
                stored = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
            except Exception:
                stored = {}
        cfg = _deep_merge(DEFAULT_CONFIG, stored)
        if not CONFIG_FILE.exists():
            _atomic_write_json(CONFIG_FILE, cfg)
        return cfg


def save_config(incoming: dict, from_frontend: bool = True) -> dict:
    with _config_lock:
        current = load_config()
        incoming = dict(incoming or {})
        if from_frontend:
            for k in _BACKEND_ONLY_KEYS:
                incoming.pop(k, None)
        merged = _deep_merge(current, incoming)
        # A theme is a complete snapshot. Merging removed colors back in made
        # resets and preset changes appear to work until the next launch.
        if isinstance(incoming.get("custom_theme"), dict):
            merged["custom_theme"] = deepcopy(incoming["custom_theme"])
        _atomic_write_json(CONFIG_FILE, merged)
        return merged


def register_recent_file(path: Path) -> None:
    try:
        resolved = str(Path(path).resolve())
    except Exception:
        return
    with _config_lock:
        cfg = load_config()
        recents = [str(Path(p).resolve()) for p in (cfg.get("recent_files") or []) if p]
        removed = [str(Path(p).resolve()) for p in (cfg.get("removed_recent_files") or []) if p]
        if resolved in removed:
            removed.remove(resolved)
        recents = [resolved] + [p for p in recents if p != resolved]
        cfg["recent_files"] = recents[:24]
        cfg["removed_recent_files"] = removed
        _atomic_write_json(CONFIG_FILE, cfg)


def remove_recent_project(file_path: str) -> list[dict]:
    try:
        resolved = str(Path(file_path).resolve())
    except Exception:
        resolved = file_path
    with _config_lock:
        cfg = load_config()
        recents = [p for p in (cfg.get("recent_files") or []) if str(Path(p).resolve()) != resolved]
        pinned = [p for p in (cfg.get("pinned_recent_files") or []) if str(Path(p).resolve()) != resolved]
        removed = list(cfg.get("removed_recent_files") or [])
        if resolved not in removed:
            removed.append(resolved)
        cfg["recent_files"] = recents
        cfg["pinned_recent_files"] = pinned
        cfg["removed_recent_files"] = removed
        _atomic_write_json(CONFIG_FILE, cfg)
    return get_recent_projects()


def toggle_pin_recent_project(file_path: str) -> list[dict]:
    try:
        resolved = str(Path(file_path).resolve())
    except Exception:
        resolved = file_path
    with _config_lock:
        cfg = load_config()
        pinned = [str(Path(p).resolve()) for p in (cfg.get("pinned_recent_files") or []) if p]
        if resolved in pinned:
            pinned = [p for p in pinned if p != resolved]
        else:
            pinned = [resolved] + [p for p in pinned if p != resolved]
        cfg["pinned_recent_files"] = pinned
        _atomic_write_json(CONFIG_FILE, cfg)
    return get_recent_projects()


def rename_recent_project(file_path: str, new_title: str) -> list[dict]:
    clean_title = (new_title or "").strip()
    if not clean_title:
        return get_recent_projects()
    target = Path(file_path).resolve()
    if not target.exists():
        return get_recent_projects()
    with store.lock:
        raw = json.loads(target.read_text(encoding="utf-8"))
        doc = raw.setdefault("document", {})
        doc["title"] = clean_title
        doc["updated_at"] = datetime.now().isoformat()
        _atomic_write_json(target, raw)
    return get_recent_projects()


def duplicate_recent_project(file_path: str) -> list[dict]:
    target = Path(file_path).resolve()
    if not target.exists():
        return get_recent_projects()
    with store.lock:
        raw = deepcopy(json.loads(target.read_text(encoding="utf-8")))
        doc = raw.setdefault("document", {})
        orig_title = doc.get("title") or target.stem
        new_title = f"{orig_title} (Copia)"
        doc["title"] = new_title
        doc["updated_at"] = datetime.now().isoformat()
        PROJECTS_DIR.mkdir(exist_ok=True)
        dup_dir = target.parent if target.parent.exists() else PROJECTS_DIR
        suffix = target.suffix if target.suffix.lower() in (".strata", ".json") else ".strata"
        dup_path = dup_dir / f"{_slug_name(new_title)}_{datetime.now():%Y%m%d_%H%M%S}{suffix}"
        _atomic_write_json(dup_path, raw)
        register_recent_file(dup_path)
    return get_recent_projects()


def delete_recent_project_from_disk(file_path: str) -> list[dict]:
    try:
        target = Path(file_path).resolve()
    except Exception:
        return get_recent_projects()
    remove_recent_project(str(target))
    # Evitar borrar el archivo activo en curso si es el único archivo por defecto
    try:
        if target.exists() and target.is_file() and target != DEFAULT_DATA_FILE.resolve():
            target.unlink()
    except Exception:
        pass
    return get_recent_projects()


def get_recent_projects() -> list[dict]:
    """Devuelve la lista de proyectos recientes con su conteo de palabras, capítulos, vista previa y estado fijado."""
    cfg = load_config()
    removed_set = {str(Path(p).resolve()) for p in (cfg.get("removed_recent_files") or []) if p}
    pinned_set = {str(Path(p).resolve()) for p in (cfg.get("pinned_recent_files") or []) if p}

    candidate_paths: list[Path] = []
    seen: set[str] = set()

    def _add_candidate(p: Path) -> None:
        try:
            res = str(p.resolve())
        except Exception:
            return
        if res in seen or res in removed_set:
            return
        if p.exists() and p.is_file():
            seen.add(res)
            candidate_paths.append(p.resolve())

    if store.current_path:
        _add_candidate(Path(store.current_path))
    if cfg.get("last_file"):
        _add_candidate(Path(cfg["last_file"]))
    for rp in cfg.get("recent_files") or []:
        if rp:
            _add_candidate(Path(rp))
    _add_candidate(DEFAULT_DATA_FILE)

    if PROJECTS_DIR.exists():
        for f in sorted(PROJECTS_DIR.glob("*.strata"), key=lambda x: x.stat().st_mtime, reverse=True):
            _add_candidate(f)
        for f in sorted(PROJECTS_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
            _add_candidate(f)

    current_resolved = str(Path(store.current_path).resolve()) if store.current_path else ""
    results: list[dict] = []
    for path in candidate_paths:
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(raw, dict) or "document" not in raw:
                continue
            stats = compute_project_stats(raw, path)
            path_str = str(path.resolve())
            stats["is_current"] = path_str == current_resolved
            stats["is_pinned"] = path_str in pinned_set
            results.append(stats)
        except Exception:
            continue

    results.sort(
        key=lambda item: (
            1 if item.get("is_pinned") else 0,
            1 if item.get("is_current") else 0,
            item.get("mtime", 0),
        ),
        reverse=True,
    )
    return results[:24]


def get_templates_catalog() -> list[dict]:
    return deepcopy(TEMPLATES_CATALOG)


def set_last_file(path: Path) -> None:
    register_recent_file(path)
    save_config({"last_file": str(path)}, from_frontend=False)


def set_window_geometry(geom: dict) -> None:
    save_config({"window": geom}, from_frontend=False)
