"""Prueba de arranque del ejecutable empaquetado; no instala ni abre datos reales."""
import json
import sys
import tempfile
import traceback
from pathlib import Path


def run(report_name: str) -> int:
    report = Path(report_name).resolve()
    result = {"ok": False}
    temporary = None
    window = app = None
    try:
        report.parent.mkdir(parents=True, exist_ok=True)
        temporary = tempfile.TemporaryDirectory(prefix="strata_runtime_", dir=report.parent)
        scratch = Path(temporary.name).resolve()
        if not scratch.is_relative_to(report.parent):
            raise ValueError("Directorio de prueba fuera de la carpeta de informes")
        from . import storage
        storage.BASE_DIR = scratch
        storage.CONFIG_FILE = scratch / "config.json"
        storage.DEFAULT_DATA_FILE = scratch / "qa.strata"
        storage.PROJECTS_DIR = scratch / "Proyectos"
        storage.BACKUPS_DIR = scratch / "backups"
        storage.store.current_path = scratch / "qa.strata"
        storage.save_config({"show_home_on_startup": False, "autosave": {"enabled": False}})
        storage.store.save(storage.store.empty_project())
        import main
        from .licenses import PUBLIC_KEY_FILE, decode
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        Ed25519PublicKey.from_public_bytes(decode(json.loads(PUBLIC_KEY_FILE.read_text())['public_key']))
        from PySide6 import __version__ as qt_version
        from PySide6.QtCore import QTimer, Qt
        from PySide6.QtWidgets import QApplication
        app = QApplication([])
        app.setApplicationName("StrataRuntimeCheck")
        holder = {}
        port = main.start_local_server(lambda action, data: holder["window"].dispatcher.call(action, data))
        window = main.StrataWindow(f"http://127.0.0.1:{port}/", storage.BUNDLED_ICON_FILE)
        holder["window"] = window
        window.setAttribute(Qt.WidgetAttribute.WA_DontShowOnScreen, True)
        window.show()
        checking = False
        def received(value):
            nonlocal checking
            checking = False
            if isinstance(value, str):
                value = json.loads(value)
            result["last_state"] = value
            if isinstance(value, dict) and value.get("ready"):
                result.update(ok=value.get("tabs") == 5 and value.get("editors", 0) > 0,
                              qt_version=qt_version, app_version=main.APP_VERSION, python_version=sys.version.split()[0], **value)
                app.quit()
        def poll():
            nonlocal checking
            if checking: return
            checking = True
            window.webview.page().runJavaScript("JSON.stringify({ready:!!(window.pyBridge && window.StrataV8?.ready && window.Strata95?.ready && window.Strata10?.ready && window.StrataCanvas?.show && window.StrataThemes?.open && document.getElementById('ribbon-height-slider') && document.body && !document.body.classList.contains('booting')), tabs:document.querySelectorAll('.ribbon-tab').length, editors:document.querySelectorAll('.page-editor').length, url:location.href, body:document.body?.className, bridge:typeof window.pyBridge})", received)
        timer = QTimer(); timer.timeout.connect(poll); timer.start(200)
        QTimer.singleShot(25000, app.quit)
        app.exec()
        if not result["ok"]:
            result["error"] = "La interfaz, Chromium o QWebChannel no completaron el inicio."
    except Exception:
        result["error"] = traceback.format_exc()
    finally:
        if window is not None:
            window._allow_close = True
            window.close()
        if app is not None: app.processEvents()
        if temporary is not None: temporary.cleanup()
        report.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if result["ok"] else 1
