"""Servidor HTTP local: sirve la carpeta ui/ y expone la segunda vía (/api/...) hacia el backend."""

import json
import mimetypes
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable
from urllib.parse import urlparse
from .auth import AuthService, configured_provider

from .storage import (
    UI_DIR,
    delete_recent_project_from_disk,
    duplicate_recent_project,
    get_recent_projects,
    get_templates_catalog,
    load_config,
    remove_recent_project,
    rename_recent_project,
    save_config,
    store,
    toggle_pin_recent_project,
)

# Rutas que requieren el hilo principal de Qt (diálogos nativos, ventana, PDF)
ACTION_ROUTES = {
    '/api/window/brand':'window_brand',
    "/api/update": "quick_update",
    "/api/speech": "speech",
    "/api/confirm-unsaved": "confirm_unsaved",
    "/api/file/reveal": "reveal_project",
    "/api/file/new": "file_new",
    "/api/file/new-template": "file_new_template",
    "/api/file/open": "file_open",
    "/api/file/open-recent": "file_open_path",
    "/api/file/save-as": "file_save_as",
    "/api/file/backup": "file_backup",
    "/api/file/export": "file_export",
    "/api/file/pick-image": "pick_image",
    "/api/window/minimize": "window_minimize",
    "/api/window/maximize": "window_maximize_toggle",
    "/api/window/close": "window_close",
    "/api/window/drag": "window_drag",
    "/api/window/state": "window_state",
    "/api/window/fullscreen": "window_fullscreen",
}

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")


def make_handler(dispatch: Callable[[str, dict], dict], auth_provider=None):
    auth = AuthService(auth_provider or configured_provider())
    from .cloud import CloudBackups
    cloud = CloudBackups(auth.provider)
    from .social import SocialService
    social = SocialService(auth.provider)
    class LocalAPIHandler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args) -> None:  # silencio en consola
            pass

        def _valid_host(self) -> bool:
            return self.headers.get("Host") in {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}

        def _send_json(self, code: int, data: dict) -> None:
            raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(raw)

        def _body(self) -> dict:
            length = int(self.headers.get("Content-Length", "0") or 0)
            if length <= 0:
                return {}
            raw = self.rfile.read(length).decode("utf-8")
            return json.loads(raw) if raw else {}

        def do_GET(self) -> None:
            if not self._valid_host():
                self.send_error(403)
                return
            path = self.path.split("?", 1)[0]
            if path == "/auth/callback":
                try:
                    callback = getattr(auth.provider, "oauth_callback", None)
                    if callback is None:
                        raise ValueError("No hay un proveedor OAuth configurado.")
                    callback(urlparse(self.path).query)
                    message = "Acceso completado. Puedes volver a Strata y cerrar esta pestaña."
                except (ValueError, OSError) as exc:
                    message = str(exc)
                self._send_json(200, {"message": message})
                return
            if path == "/api/state":
                self._send_json(200, store.state_with_meta(store.load()))
                return
            if path == "/api/config":
                self._send_json(200, load_config())
                return
            if path == "/api/projects":
                self._send_json(
                    200,
                    {
                        "ok": True,
                        "recent": get_recent_projects(),
                        "templates": get_templates_catalog(),
                        "current_path": str(store.current_path),
                    },
                )
                return

            if path in ("/", "/index.html"):
                target = UI_DIR / "index.html"
            else:
                rel = path[len("/ui/"):] if path.startswith("/ui/") else path.lstrip("/")
                target = (UI_DIR / rel).resolve()
                if not str(target).startswith(str(UI_DIR.resolve())):
                    self.send_error(403)
                    return
            if not target.is_file():
                self.send_error(404)
                return

            ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
            if ctype.startswith("text/") or ctype == "application/javascript":
                ctype += "; charset=utf-8"
            raw = target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(raw)

        def do_POST(self) -> None:
            path = self.path.split("?", 1)[0]
            origin = self.headers.get("Origin")
            if not self._valid_host() or (origin and origin != f"http://{self.headers.get('Host')}"):
                self._send_json(403, {"ok": False, "error": "Origen no permitido."})
                return
            try:
                body = self._body()
            except Exception as exc:
                self._send_json(400, {"ok": False, "error": f"JSON inválido: {exc}"})
                return

            if path.startswith("/api/cloud/"):
                try:
                    action = path.rsplit("/", 1)[-1]
                    if action == "upload": result = cloud.upload(body.get("project"))
                    elif action == "list": result = cloud.list()
                    elif action == "restore":
                        copy = cloud.download(body.get("name", ""))
                        result = dispatch("restore_cloud", {"project":copy["project"]})
                    else: result = {"ok":False, "error":"Operación de nube desconocida."}
                    self._send_json(200, result)
                except (ValueError, OSError, json.JSONDecodeError) as exc:
                    self._send_json(200, {"ok":False, "error":str(exc)})
                return

            if path.startswith("/api/auth/"):
                if hasattr(auth.provider, "callback_url"):
                    auth.provider.callback_url = f"http://127.0.0.1:{self.server.server_port}/auth/callback"
                self._send_json(200, auth.dispatch(path.rsplit("/", 1)[-1], body))
                return

            if path == "/api/save":
                try:
                    saved = store.save(body)
                    self._send_json(200, {"ok": True, "file_path": str(saved), "file_name": saved.name})
                except Exception as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                return

            if path == "/api/config":
                try:
                    self._send_json(200, {"ok": True, "config": save_config(body)})
                except Exception as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                return

            if path.startswith('/api/social/'):
                try:
                    result = social.call(path.rsplit('/', 1)[-1], body)
                    self._send_json(200, result)
                except (ValueError, OSError) as exc:
                    self._send_json(400, {'ok': False, 'error': str(exc)})
                return

            if path == "/api/file/remove-recent":
                try:
                    updated = remove_recent_project(body.get("path", ""))
                    self._send_json(200, {"ok": True, "recent": updated})
                except Exception as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                return

            if path == "/api/file/pin-recent":
                try:
                    updated = toggle_pin_recent_project(body.get("path", ""))
                    self._send_json(200, {"ok": True, "recent": updated})
                except Exception as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                return

            if path == "/api/file/rename-recent":
                try:
                    updated = rename_recent_project(body.get("path", ""), body.get("title", ""))
                    self._send_json(200, {"ok": True, "recent": updated})
                except Exception as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                return

            if path == "/api/file/duplicate-recent":
                try:
                    updated = duplicate_recent_project(body.get("path", ""))
                    self._send_json(200, {"ok": True, "recent": updated})
                except Exception as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                return

            if path == "/api/file/delete-recent":
                try:
                    updated = delete_recent_project_from_disk(body.get("path", ""))
                    self._send_json(200, {"ok": True, "recent": updated})
                except Exception as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                return

            action = ACTION_ROUTES.get(path)
            if not action:
                self.send_error(404)
                return
            if path == "/api/file/save-as":
                body = {"payload": body.get("payload", body), "test_path": body.get("_test_path")}
            elif path == "/api/file/backup":
                body = {"payload": body.get("payload", body)}
            self._send_json(200, dispatch(action, body))

    return LocalAPIHandler


def start_local_server(dispatch: Callable[[str, dict], dict], auth_provider=None) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(dispatch, auth_provider))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return port
