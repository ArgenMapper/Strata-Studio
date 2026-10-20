"""
Strata 9.5 — Ventana nativa PySide6.

Este archivo contiene EXCLUSIVAMENTE:
  * La ventana sin marco (frameless) con redimensionado por bordes.
  * El puente QWebChannel (window.pyBridge) hacia la interfaz web de ui/.
  * El manejo de archivos nativos de Windows (QFileDialog, PDF, descargas).

Datos, configuración, exportación, ícono y servidor local viven en core/.
La interfaz completa vive en ui/index.html, ui/styles.css y ui/app.js.
"""

import base64
import ctypes
import ctypes.wintypes
import json
import mimetypes
import os
import re
import subprocess
import sys
import threading
from datetime import datetime
from pathlib import Path

# Este modo usa el runtime instalado y no requiere Python en el equipo de destino.
if __name__ == "__main__" and "--quick-update" in sys.argv:
    from core.updater import apply_update
    try:
        index = sys.argv.index("--quick-update")
        destination = Path(sys.executable).parent if getattr(sys, "frozen", False) else None
        apply_update(sys.argv[index + 1], destination)
    except Exception:
        sys.exit(1)
    sys.exit(0)

# Este diagnóstico captura incluso un fallo de importación de Qt antes de abrir la UI.
# Se ejecuta en un directorio temporal y nunca carga los proyectos del usuario.
if __name__ == "__main__" and "--self-test" in sys.argv:
    from core.runtime_check import run as _runtime_check
    sys.exit(_runtime_check(sys.argv[sys.argv.index("--self-test") + 1]))

# Desactiva gestos táctiles, pinch-zoom y navegación por deslizamiento de Chromium
os.environ.setdefault(
    "QTWEBENGINE_CHROMIUM_FLAGS",
    "--touch-events=disabled --disable-pinch --overscroll-history-navigation=0 "
    "--disable-features=TouchpadOverscrollHistoryNavigation,OverscrollHistoryNavigation",
)

from PySide6.QtCore import QEvent, QFile, QIODevice, QEventLoop, QMarginsF, QObject, QSizeF, QTimer, QUrl, Qt, Signal, Slot
from PySide6.QtGui import QColor, QCursor, QIcon, QPageLayout, QPageSize
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtWebEngineCore import QWebEngineDownloadRequest, QWebEnginePage, QWebEngineProfile, QWebEngineScript, QWebEngineSettings
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QFileDialog, QMainWindow, QMessageBox

from core import APP_VERSION
from core.platforms import reveal_command
from core.exporter import build_export_html_doc, html_to_plain_and_markdown
from core.icon import generate_app_icon
from core.layout import normalize_layout
from core.server import start_local_server
from core.storage import (
    BACKUPS_DIR,
    BASE_DIR,
    BUNDLED_ICON_FILE,
    ICON_FILE,
    PROJECTS_DIR,
    load_config,
    resource_path as _core_resource_path,
    save_config,
    set_last_file,
    set_window_geometry,
    store,
)

_dictionary_dir = _core_resource_path("qtwebengine_dictionaries")
if _dictionary_dir.is_dir():
    os.environ.setdefault("QTWEBENGINE_DICTIONARIES_PATH", str(_dictionary_dir))


def resource_path(relative_path: str = "") -> Path:
    """Devuelve la ruta absoluta de recursos empaquetados (compatible con PyInstaller _MEIPASS y ejecución directa)."""
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        base = Path(getattr(sys, "_MEIPASS"))
    else:
        base = Path(__file__).resolve().parent
    return (base / relative_path).resolve() if relative_path else base.resolve()


PROJECT_FILTER = "Proyecto Strata (*.strata);;Archivo JSON (*.json)"
OPEN_FILTER = "Proyectos Strata / JSON (*.strata *.json);;Todos los archivos (*.*)"
EXPORT_FILTERS = {
    "pdf": "Documento PDF (*.pdf)",
    "docx": "Documento Word (*.docx)",
    "doc": "Word antiguo (*.doc)",
    "html": "Página HTML (*.html)",
    "md": "Markdown (*.md)",
    "txt": "Texto plano (*.txt)",
}

import unicodedata


def _slug(text: str, fallback: str) -> str:
    norm = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^\w\-]+", "_", norm).strip("_") or fallback


def _start_dir() -> Path:
    cur = store.current_path
    return cur.parent if cur and cur.parent.exists() else BASE_DIR


# =============================================================================
# Despachador al hilo principal (diálogos nativos, ventana y PDF)
# =============================================================================
class MainThreadDispatcher(QObject):
    """Ejecuta cada acción en el hilo GUI de Qt aunque se llame desde el servidor HTTP."""

    _dispatch = Signal(int)

    def __init__(self, window: "StrataWindow") -> None:
        super().__init__(window)
        self.window = window
        self._lock = threading.Lock()
        self._seq = 0
        self._requests: dict[int, dict] = {}
        self._dispatch.connect(self._handle_id, Qt.ConnectionType.BlockingQueuedConnection)

    def call(self, action: str, data: dict | None = None) -> dict:
        holder = {"action": action, "data": data or {}, "result": {"ok": False}}
        if threading.current_thread() is threading.main_thread():
            self._execute(holder)
            return holder["result"]
        with self._lock:
            self._seq += 1
            req_id = self._seq
            self._requests[req_id] = holder
        try:
            self._dispatch.emit(req_id)
            return holder["result"]
        finally:
            with self._lock:
                self._requests.pop(req_id, None)

    # Alias usado por versiones anteriores y por las pruebas automáticas
    call_from_any_thread = call

    def _bring_front(self) -> None:
        self.window.activateWindow()
        self.window.raise_()

    def _set_current(self, path: Path) -> None:
        store.current_path = path
        set_last_file(path)
        self.window.update_title()

    @Slot(int)
    def _handle_id(self, req_id: int) -> None:
        with self._lock:
            holder = self._requests.get(req_id)
        if holder is not None:
            self._execute(holder)

    def _execute(self, holder: dict) -> None:
        action, data = holder["action"], holder["data"]
        handler = getattr(self, f"_do_{action}", None)
        if handler is None:
            holder["result"] = {"ok": False, "error": f"Acción desconocida: {action}"}
            return
        try:
            holder["result"] = handler(data)
        except Exception as exc:  # noqa: BLE001 — siempre devolver algo legible al frontend
            holder["result"] = {"ok": False, "error": str(exc)}

    # --- Ventana ----------------------------------------------------------
    def _do_window_brand(self,data:dict)->dict:
        self.window._studio_name=str(data.get('name','Strata Studio')).strip()[:80] or 'Strata Studio'
        self.window.update_title()
        return {'ok':True}
    def _do_quick_update(self, data: dict) -> dict:
        from core.updater import apply_update
        source = QFileDialog.getExistingDirectory(self.window, "Selecciona la carpeta del código actualizado")
        if not source:
            return {"ok": False, "cancelled": True}
        destination = Path(sys.executable).parent if getattr(sys, "frozen", False) else None
        return apply_update(source, destination)

    def _do_speech(self, data: dict) -> dict:
        from PySide6.QtTextToSpeech import QTextToSpeech
        if not hasattr(self, "speech"):
            self.speech = QTextToSpeech(self.window)
        if data.get("stop"):
            self.speech.stop()
            return {"ok": True}
        if self.speech.state() == QTextToSpeech.State.Error:
            return {"ok": False, "error": "No hay una voz instalada. Instala una voz española en Windows."}
        self.speech.setLocale(__import__("PySide6.QtCore", fromlist=["QLocale"]).QLocale("es_ES"))
        self.speech.say(str(data.get("text", ""))[:100000])
        return {"ok": True}

    def _do_window_minimize(self, _d: dict) -> dict:
        self.window.showMinimized()
        return {"ok": True}

    def _do_window_maximize_toggle(self, _d: dict) -> dict:
        self.window.showNormal() if self.window.isMaximized() else self.window.showMaximized()
        return {"ok": True, "maximized": self.window.isMaximized()}

    def _do_window_close(self, _d: dict) -> dict:
        QTimer.singleShot(0, self.window.close)
        return {"ok": True}

    def _do_window_fullscreen(self, data: dict) -> dict:
        enabled = data.get("enabled", not self.window.isFullScreen())
        if enabled:
            if not self.window.isFullScreen():
                self._before_fullscreen_maximized = self.window.isMaximized()
            self.window.showFullScreen()
        elif getattr(self, "_before_fullscreen_maximized", False):
            self.window.showMaximized()
        else:
            self.window.showNormal()
        return {"ok": True, "fullscreen": self.window.isFullScreen()}

    def _do_window_drag(self, _d: dict) -> dict:
        handle = self.window.windowHandle()
        if handle and not self.window.isMaximized():
            handle.startSystemMove()
        return {"ok": True}

    def _do_window_state(self, _d: dict) -> dict:
        return {"ok": True, "maximized": self.window.isMaximized()}

    # --- Proyecto ---------------------------------------------------------
    def _do_confirm_unsaved(self, _d: dict) -> dict:
        dialog = QMessageBox(self.window)
        dialog.setWindowTitle("Strata")
        dialog.setText("¿Guardar cambios antes de salir?")
        save = dialog.addButton("Guardar", QMessageBox.ButtonRole.AcceptRole)
        discard = dialog.addButton("No guardar", QMessageBox.ButtonRole.DestructiveRole)
        cancel = dialog.addButton("Cancelar", QMessageBox.ButtonRole.RejectRole)
        dialog.setDefaultButton(save)
        dialog.setEscapeButton(cancel)
        dialog.exec()
        choice = "save" if dialog.clickedButton() == save else "discard" if dialog.clickedButton() == discard else "cancel"
        return {"ok": True, "choice": choice}

    def _do_reveal_project(self, data: dict) -> dict:
        path = Path(data.get("path", "")).expanduser().resolve()
        if not path.is_file():
            return {"ok": False, "error": "No se encontró el archivo del proyecto."}
        subprocess.Popen(reveal_command(path))
        return {"ok": True}

    def _do_file_new(self, _d: dict) -> dict:
        PROJECTS_DIR.mkdir(exist_ok=True)
        path = PROJECTS_DIR / f"Sin_titulo_{datetime.now():%Y%m%d_%H%M%S}.strata"
        state = store.empty_project()
        store.save(state, path)
        self._set_current(path)
        return {"ok": True, "state": store.state_with_meta(state)}

    def _do_restore_cloud(self, data: dict) -> dict:
        from core.storage import upgrade_project
        project = {k:v for k,v in data["project"].items() if not k.startswith("_")}
        project = upgrade_project(project)
        PROJECTS_DIR.mkdir(exist_ok=True)
        path = PROJECTS_DIR / f"{_slug(project['document'].get('title', 'Manuscrito'), 'Manuscrito')}_nube_{datetime.now():%Y%m%d_%H%M%S_%f}.strata"
        store.save(project, path)
        self._set_current(path)
        return {"ok":True, "state":store.state_with_meta(project)}

    def _do_file_new_template(self, data: dict) -> dict:
        PROJECTS_DIR.mkdir(exist_ok=True)
        template_id = (data.get("template_id") or "blanco").strip().lower()
        custom_title = (data.get("title") or "").strip()
        state = store.project_from_template(template_id, custom_title)
        doc_title = (state.get("document") or {}).get("title") or "Proyecto"
        slug_name = _slug(doc_title, f"Proyecto_{template_id}")
        path = PROJECTS_DIR / f"{slug_name}_{datetime.now():%Y%m%d_%H%M%S_%f}.strata"
        store.save(state, path)
        self._set_current(path)
        return {"ok": True, "state": store.state_with_meta(state)}

    def _open_path(self, path: Path) -> dict:
        if not path.exists():
            return {"ok": False, "error": f"No existe el archivo: {path}"}
        state = store.load(path)
        self._set_current(path)
        return {"ok": True, "state": store.state_with_meta(state)}

    def _do_file_open(self, data: dict) -> dict:
        self._bring_front()
        file_path = data.get("test_path") or QFileDialog.getOpenFileName(
            self.window, "Abrir proyecto (.strata / .json)", str(_start_dir()), OPEN_FILTER
        )[0]
        if not file_path:
            return {"ok": False, "cancelled": True}
        return self._open_path(Path(file_path))

    def _do_file_open_path(self, data: dict) -> dict:
        return self._open_path(Path(data.get("path", "")))

    def _do_file_save_as(self, data: dict) -> dict:
        self._bring_front()
        payload = data.get("payload") or {}
        title = (payload.get("document") or {}).get("title", "proyecto")
        file_path = data.get("test_path") or QFileDialog.getSaveFileName(
            self.window,
            "Guardar proyecto como...",
            str(_start_dir() / f"{_slug(title, 'proyecto')}.strata"),
            PROJECT_FILTER,
        )[0]
        if not file_path:
            return {"ok": False, "cancelled": True}
        path = Path(file_path)
        if path.suffix.lower() not in (".strata", ".json"):
            path = path.with_suffix(".strata")
        store.save(payload, path)
        self._set_current(path)
        return {"ok": True, "file_path": str(path), "file_name": path.name}

    def _do_file_backup(self, data: dict) -> dict:
        BACKUPS_DIR.mkdir(exist_ok=True)
        path = BACKUPS_DIR / f"{store.current_path.stem}_{datetime.now():%Y%m%d_%H%M%S}.strata"
        store.save(data.get("payload") or {}, path)
        return {"ok": True, "file_path": str(path), "file_name": path.name}

    def _do_pick_image(self, _d: dict) -> dict:
        self._bring_front()
        file_path, _ = QFileDialog.getOpenFileName(
            self.window,
            "Insertar imagen",
            str(_start_dir()),
            "Imágenes (*.png *.jpg *.jpeg *.webp *.gif *.bmp *.svg)",
        )
        if not file_path:
            return {"ok": False, "cancelled": True}
        p = Path(file_path)
        mime = mimetypes.guess_type(str(p))[0] or "image/png"
        b64 = base64.b64encode(p.read_bytes()).decode("ascii")
        return {"ok": True, "data_url": f"data:{mime};base64,{b64}", "name": p.name}

    # --- Exportación ------------------------------------------------------
    def _do_file_export(self, data: dict) -> dict:
        self._bring_front()
        fmt = (data.get("format") or "pdf").lower()
        title = data.get("title") or "Documento"
        from core.clean_export import clean_export_html
        base_html = clean_export_html(data.get("base_html", ""))
        font_family = data.get("font_family", "Georgia")
        font_size = float(data.get("font_size", 16))
        line_height = float(data.get("line_height", 1.75))

        first = EXPORT_FILTERS.get(fmt, EXPORT_FILTERS["pdf"])
        others = ";;".join(v for k, v in EXPORT_FILTERS.items() if v != first)
        ext = {"pdf": ".pdf", "doc": ".doc", "docx": ".docx", "html": ".html", "md": ".md", "txt": ".txt"}.get(fmt, ".pdf")
        file_path = data.get("test_path") or QFileDialog.getSaveFileName(
            self.window,
            "Exportar texto final (Capa Base)",
            str(_start_dir() / f"{_slug(title, 'Texto_Final')}{ext}"),
            f"{first};;{others}",
        )[0]
        if not file_path:
            return {"ok": False, "cancelled": True}

        out = Path(file_path)
        suffix = out.suffix.lower() or ext
        if not out.suffix:
            out = out.with_suffix(ext)
        page_layout = data.get("page_layout") or {}
        doc_html = build_export_html_doc(base_html, title, font_family, font_size, line_height, page_layout)

        if suffix == ".docx":
            from core.docx_export import write_docx
            write_docx(out, base_html, font_family, font_size, line_height, page_layout)
            return {"ok": True, "file_path": str(out), "file_name": out.name}
        if suffix == ".pdf":
            ok = self._render_pdf(doc_html, out, page_layout)
            return {"ok": ok, "file_path": str(out), "file_name": out.name,
                    **({} if ok else {"error": "Chromium no pudo generar el PDF"})}

        txt, md = html_to_plain_and_markdown(base_html, title)
        if suffix == ".md":
            out.write_text(md, encoding="utf-8")
        elif suffix in (".html", ".htm", ".doc"):
            out.write_text(doc_html, encoding="utf-8")
        else:
            out.write_text(txt, encoding="utf-8")
        return {"ok": True, "file_path": str(out), "file_name": out.name}

    def _render_pdf(self, html_doc: str, out: Path, page_layout: dict | None = None) -> bool:
        page = QWebEnginePage(self.window)
        load_loop, pdf_loop = QEventLoop(), QEventLoop()
        result = {"ok": False}

        def on_pdf(_path: str, success: bool) -> None:
            result["ok"] = bool(success)
            pdf_loop.quit()

        page.loadFinished.connect(lambda _ok: load_loop.quit())
        page.pdfPrintingFinished.connect(on_pdf)
        page.setHtml(html_doc, QUrl.fromLocalFile(str(BASE_DIR) + "/"))
        load_loop.exec()
        normalized = normalize_layout(page_layout)
        # QSizeF ya incorpora la orientación para evitar invertir dos veces el papel.
        margins = normalized["margins"]
        layout = QPageLayout(
            QPageSize(QSizeF(normalized["width_mm"], normalized["height_mm"]), QPageSize.Unit.Millimeter),
            QPageLayout.Orientation.Portrait,
            QMarginsF(margins["left"] * 10, margins["top"] * 10, margins["right"] * 10, margins["bottom"] * 10),
            QPageLayout.Unit.Millimeter,
        )
        page.printToPdf(str(out), layout)
        pdf_loop.exec()
        page.deleteLater()
        return result["ok"] and out.exists()


# =============================================================================
# Puente QWebChannel  (window.pyBridge en JavaScript)
# =============================================================================
class BackendBridge(QObject):
    def __init__(self, dispatcher: MainThreadDispatcher) -> None:
        super().__init__(dispatcher.window)
        self.d = dispatcher

    def _json(self, action: str, data: dict | None = None) -> str:
        return json.dumps(self.d.call(action, data), ensure_ascii=False)

    @Slot(result=str)
    def getInitialState(self) -> str:
        return json.dumps(store.state_with_meta(store.load()), ensure_ascii=False)

    @Slot(result=str)
    def getConfig(self) -> str:
        return json.dumps(load_config(), ensure_ascii=False)

    @Slot(str, result=str)
    def saveConfig(self, cfg_json: str) -> str:
        return json.dumps({"ok": True, "config": save_config(json.loads(cfg_json))}, ensure_ascii=False)

    @Slot(str, result=str)
    def saveState(self, payload_json: str) -> str:
        try:
            p = store.save(json.loads(payload_json))
            return json.dumps({"ok": True, "file_path": str(p), "file_name": p.name}, ensure_ascii=False)
        except Exception as exc:
            return json.dumps({"ok": False, "error": str(exc)})

    @Slot(result=str)
    def newProject(self) -> str:
        return self._json("file_new")

    @Slot(result=str)
    def openProject(self) -> str:
        return self._json("file_open")

    @Slot(str, result=str)
    def saveProjectAs(self, payload_json: str) -> str:
        return self._json("file_save_as", {"payload": json.loads(payload_json)})

    @Slot(str, result=str)
    def backupProject(self, payload_json: str) -> str:
        return self._json("file_backup", {"payload": json.loads(payload_json)})

    @Slot(str, str, result=str)
    def exportDocument(self, fmt: str, payload_json: str) -> str:
        data = json.loads(payload_json)
        data["format"] = fmt
        return self._json("file_export", data)

    @Slot(result=str)
    def pickImageFile(self) -> str:
        return self._json("pick_image")

    @Slot()
    def minimizeWindow(self) -> None:
        self.d.call("window_minimize")

    @Slot(result=str)
    def toggleMaximizeWindow(self) -> str:
        return self._json("window_maximize_toggle")

    @Slot()
    def closeWindow(self) -> None:
        self.d.call("window_close")

    @Slot()
    def startWindowDrag(self) -> None:
        self.d.call("window_drag")

    @Slot(str, result=str)
    def revealProject(self, path: str) -> str:
        return self._json("reveal_project", {"path": path})

    @Slot(bool)
    def setDirty(self, dirty: bool) -> None:
        self.d.window.setWindowModified(dirty)
        self.d.window.update_title()

    @Slot(bool)
    def finishClose(self, accepted: bool) -> None:
        window = self.d.window
        window._close_pending = False
        if accepted:
            window._allow_close = True
            window.close()


# =============================================================================
# Ventana principal sin marco
# =============================================================================
class StrataWindow(QMainWindow):
    RESIZE_BORDER = 6

    def __init__(self, server_url: str, icon_path: Path) -> None:
        super().__init__()
        self._allow_close = False
        self._close_pending = False
        flags = (Qt.WindowType.Window
            | Qt.WindowType.WindowSystemMenuHint
            | Qt.WindowType.WindowMinimizeButtonHint
            | Qt.WindowType.WindowMaximizeButtonHint
        )
        if sys.platform == 'win32':
            flags |= Qt.WindowType.FramelessWindowHint
        self.setWindowFlags(flags)
        if icon_path.exists():
            self.setWindowIcon(QIcon(str(icon_path)))
        self.setStyleSheet("QMainWindow { background-color: #141415; }")
        self._restore_geometry()

        self.webview = QWebEngineView(self)
        self.webview.setAttribute(Qt.WidgetAttribute.WA_AcceptTouchEvents, False)
        self.webview.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
        page = self.webview.page()
        page.setBackgroundColor(QColor("#141415"))
        settings = page.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptCanAccessClipboard, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptCanPaste, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.ShowScrollBars, True)

        profile = page.profile()
        profile.setSpellCheckEnabled(True)
        profile.setSpellCheckLanguages(["es-ES", "es"])
        profile.downloadRequested.connect(self._on_download_requested)

        self.dispatcher = MainThreadDispatcher(self)
        self.dispatcher_bridge = BackendBridge(self.dispatcher)
        self.channel = QWebChannel(page)
        self.channel.registerObject("pyBridge", self.dispatcher_bridge)
        page.setWebChannel(self.channel)
        # HTTP no puede cargar qrc: en todas las versiones de Chromium.
        # Inyectar el recurso de Qt garantiza que QWebChannel exista antes de app.js.
        channel_source = QFile(":/qtwebchannel/qwebchannel.js")
        if not channel_source.open(QIODevice.OpenModeFlag.ReadOnly):
            raise RuntimeError("No se pudo cargar el recurso QWebChannel de Qt.")
        channel_script = QWebEngineScript()
        channel_script.setName("strata-webchannel")
        channel_script.setInjectionPoint(QWebEngineScript.InjectionPoint.DocumentCreation)
        channel_script.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
        channel_script.setSourceCode(bytes(channel_source.readAll()).decode("utf-8"))
        channel_source.close()
        page.scripts().insert(channel_script)
        platform_script = QWebEngineScript()
        platform_script.setName('strata-platform')
        platform_script.setInjectionPoint(QWebEngineScript.InjectionPoint.DocumentCreation)
        platform_script.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
        platform_script.setSourceCode('window.strataDesktop = '+json.dumps({'platform':sys.platform,'nativeFrame':sys.platform!='win32'})+";document.addEventListener('DOMContentLoaded',()=>{document.body.dataset.platform=window.strataDesktop.platform;document.body.dataset.nativeFrame=String(window.strataDesktop.nativeFrame);});")
        page.scripts().insert(platform_script)

        self.setCentralWidget(self.webview)
        self.update_title()
        self.webview.load(QUrl(server_url))

    # Compatibilidad con el nombre de atributo de versiones anteriores
    @property
    def bridge(self) -> BackendBridge:
        return self.dispatcher_bridge

    def update_title(self) -> None:
        marker = " •" if self.isWindowModified() else ""
        if not hasattr(self,'_studio_name'): self._studio_name=load_config().get('studio_name') or 'Strata Studio'
        self.setWindowTitle(f"{self._studio_name} 11.0 — {store.current_path.name}{marker}")

    # --- Geometría persistente -------------------------------------------
    def _restore_geometry(self) -> None:
        from core.window_geometry import fit_window
        geom = load_config().get("window") or {}
        screen = QApplication.primaryScreen()
        if screen:
            area = screen.availableGeometry()
            left, top, width, height, min_w, min_h = fit_window(geom, (area.x(), area.y(), area.width(), area.height()))
            self.setMinimumSize(min_w, min_h)
            self.resize(width, height)
            self.move(left, top)
        self._start_maximized = bool(geom.get("maximized", False))

    def _store_geometry(self) -> None:
        g = self.normalGeometry() if self.isMaximized() else self.geometry()
        set_window_geometry({"x": g.x(), "y": g.y(), "w": g.width(), "h": g.height(),
                             "maximized": self.isMaximized()})

    # El frontend espera escrituras pendientes y pide Guardar / No guardar / Cancelar.
    def closeEvent(self, event) -> None:
        if self._allow_close:
            self._store_geometry()
            event.accept()
            return
        event.ignore()
        if self._close_pending:
            return
        self._close_pending = True
        def on_requested(started) -> None:
            if not started:
                self._close_pending = False
                QMessageBox.warning(self, "Strata", "La interfaz aún no está lista para cerrar de forma segura. Inténtalo nuevamente.")
        self.webview.page().runJavaScript(
            "Boolean(window.__strataRequestClose && window.__strataRequestClose())", 0, on_requested
        )

    # --- Descargas del navegador → Explorador de Windows real ------------
    @Slot(QWebEngineDownloadRequest)
    def _on_download_requested(self, download: QWebEngineDownloadRequest) -> None:
        suggested = download.downloadFileName() or "documento.strata"
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Guardar archivo en tu PC", str(_start_dir() / suggested), "Todos los archivos (*.*)"
        )
        if not file_path:
            download.cancel()
            return
        target = Path(file_path)
        download.setDownloadDirectory(str(target.parent))
        download.setDownloadFileName(target.name)
        download.accept()

    # --- Redimensionado nativo desde los bordes (ventana frameless) ------
    def nativeEvent(self, event_type, message):
        if sys.platform == "win32" and event_type == b"windows_generic_MSG" and not self.isMaximized():
            try:
                msg = ctypes.wintypes.MSG.from_address(int(message))
                if msg.message == 0x0084:  # WM_NCHITTEST
                    pos = QCursor.pos()  # coordenadas lógicas (correctas con escalado DPI)
                    r = self.frameGeometry()
                    b = self.RESIZE_BORDER
                    left = pos.x() < r.left() + b
                    right = pos.x() > r.right() - b
                    top = pos.y() < r.top() + b
                    bottom = pos.y() > r.bottom() - b
                    codes = {
                        (True, False, True, False): 13, (False, True, True, False): 14,
                        (True, False, False, True): 16, (False, True, False, True): 17,
                        (True, False, False, False): 10, (False, True, False, False): 11,
                        (False, False, True, False): 12, (False, False, False, True): 15,
                    }
                    code = codes.get((left, right, top, bottom))
                    if code:
                        return True, code
            except Exception:
                pass
        return super().nativeEvent(event_type, message)


# =============================================================================
# Arranque
# =============================================================================
class ProjectOpenEvents(QObject):
    """Finder entrega los documentos mediante eventos, incluso con Strata abierta."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.window = None
        self.pending = []
        self.checking = False
        self.timer = QTimer(self)
        self.timer.setInterval(250)
        self.timer.timeout.connect(self._deliver)

    def eventFilter(self, watched, event):
        if event.type() == QEvent.Type.FileOpen:
            candidate = Path(event.file()).expanduser()
            if candidate.is_file() and candidate.suffix.lower() in ('.strata', '.json'):
                self.pending.append(str(candidate.resolve()))
                self.timer.start()
                return True
        return super().eventFilter(watched, event)

    def _deliver(self):
        if not self.pending:
            self.timer.stop()
            return
        if self.window is None or self.checking:
            return
        self.checking = True
        def ready(value):
            self.checking = False
            if value and self.pending:
                path = self.pending.pop(0)
                # openRecentProject conserva Guardar / No guardar / Cancelar.
                self.window.webview.page().runJavaScript('openRecentProject(' + json.dumps(path) + ')')
                self.window.raise_()
                self.window.activateWindow()
        self.window.webview.page().runJavaScript(
            "Boolean(typeof openRecentProject === 'function' && window.Strata10?.ready && "
            "!document.body.classList.contains('booting') && !state.ui.creatingProject && !leaveInFlight)", ready)


def main() -> None:
    if sys.platform == "win32":
        try:
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("strata.editor.capas.5")
        except Exception:
            pass

    # Si el usuario abre un archivo .strata o .json haciendo doble clic en Windows (sys.argv[1])
    cli_file: Path | None = None
    for arg in sys.argv[1:]:
        if not arg.startswith("-"):
            candidate = Path(arg).expanduser()
            if candidate.exists() and candidate.is_file() and candidate.suffix.lower() in (".strata", ".json"):
                cli_file = candidate.resolve()
                break

    if cli_file is not None:
        store.current_path = cli_file
        store.opened_from_cli = True
        set_last_file(cli_file)
    else:
        # Reabrir el último archivo usado (config_usuario.json)
        last = load_config().get("last_file")
        if last and Path(last).exists():
            store.current_path = Path(last)
    store.load()

    # Evita el teclado en pantalla de Windows y los gestos táctiles sintetizados
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_DisableNativeVirtualKeyboard, True)
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_SynthesizeMouseForUnhandledTouchEvents, False)

    QApplication.setHighDpiScaleFactorRoundingPolicy(Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)
    app = QApplication(sys.argv)
    app.setApplicationName("Strata")
    file_events = ProjectOpenEvents(app)
    app.installEventFilter(file_events)
    icon_path = ICON_FILE if ICON_FILE.exists() else (BUNDLED_ICON_FILE if BUNDLED_ICON_FILE.exists() else generate_app_icon(ICON_FILE))
    if not icon_path.exists():
        icon_path = generate_app_icon(ICON_FILE)
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    holder: dict = {}
    port = start_local_server(lambda action, data: holder["window"].dispatcher.call(action, data))
    window = StrataWindow(f"http://127.0.0.1:{port}/", icon_path)
    holder["window"] = window
    file_events.window = window
    window.showMaximized() if window._start_maximized else window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
