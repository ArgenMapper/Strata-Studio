"""Cuentas locales y contrato para proveedores de identidad externos.

La UI sólo recibe perfiles públicos. Contraseñas, sesiones y derechos de plan se
resuelven en Python. Un proveedor remoto debe verificar el plan en su servidor.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import secrets
import threading
import time
from abc import ABC, abstractmethod
from pathlib import Path

from . import storage
from .secrets import read_secret, write_secret, delete_secret, session_is_persistent


class AuthProvider(ABC):
    """Adaptador para Supabase/Firebase: implementar sin cambiar el frontend."""
    @abstractmethod
    def register(self, email: str, password: str, name: str) -> dict: ...
    @abstractmethod
    def login(self, email: str, password: str) -> dict: ...
    @abstractmethod
    def current_user(self) -> dict | None: ...
    @abstractmethod
    def logout(self) -> None: ...
    def google_login(self) -> dict:
        raise ValueError("Google requiere configurar un proveedor OAuth. Esta instalación usa cuentas locales.")
    def update_profile(self, name: str, avatar: str) -> dict:
        raise ValueError("Este proveedor no admite editar el perfil desde Strata.")
    def cancel_login(self) -> None:
        pass

    def capabilities(self) -> dict:
        return {"provider": "local", "google": False, "password_recovery": False,
                "cloud_backups": False, "plans": False, "registration": True}

    def recover_password(self, email: str) -> dict:
        raise ValueError("Las cuentas locales no envían correos. La recuperación por correo requiere conectar el servicio de cuentas.")


class LocalAuthProvider(AuthProvider):
    ITERATIONS = 600_000
    SESSION_SECONDS = 30 * 24 * 60 * 60

    def __init__(self, directory: Path | None = None):
        self.directory = directory or storage.BASE_DIR / "cuentas"
        self.lock = threading.RLock()

    def _read(self) -> dict:
        path = self.directory / "accounts.json"
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"users": [], "sessions": []}

    def _write(self, data: dict) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        storage._atomic_write_json(self.directory / "accounts.json", data)

    @staticmethod
    def _public(user: dict) -> dict:
        result = {key: user.get(key, "") for key in ("id", "name", "email", "avatar", "created_at")}
        result['plan']='free'
        return result

    def _session(self, data: dict, user: dict) -> dict:
        token = secrets.token_urlsafe(48)
        data["sessions"] = [s for s in data["sessions"] if s["expires"] > time.time() and s["user_id"] != user["id"]]
        data["sessions"].append({"digest": hashlib.sha256(token.encode()).hexdigest(), "user_id": user["id"], "expires": time.time() + self.SESSION_SECONDS})
        self._write(data)
        # El secreto sólo permanece en el almacenamiento local de la aplicación.
        write_secret(self.directory / "session.json", {"token": token})
        return self._public(user)

    def register(self, email: str, password: str, name: str) -> dict:
        email = str(email).strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise ValueError("Escribe un correo válido.")
        if len(password) < 10 or len(password) > 1024:
            raise ValueError("La contraseña debe tener entre 10 y 1024 caracteres.")
        with self.lock:
            data = self._read()
            if any(user["email"] == email for user in data["users"]):
                raise ValueError("Ya existe una cuenta con ese correo en este equipo.")
            salt = secrets.token_bytes(24)
            digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, self.ITERATIONS)
            user = {"id": secrets.token_hex(16), "email": email, "name": str(name).strip()[:80] or email.split("@")[0],
                    "salt": base64.b64encode(salt).decode(), "password_hash": base64.b64encode(digest).decode(),
                    "iterations": self.ITERATIONS, "plan": "free", "avatar": "", "created_at": time.time()}
            data["users"].append(user)
            return self._session(data, user)

    def login(self, email: str, password: str) -> dict:
        with self.lock:
            data = self._read()
            user = next((u for u in data["users"] if u["email"] == str(email).strip().lower()), None)
            salt = base64.b64decode(user["salt"]) if user else bytes(24)
            digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, user["iterations"] if user else self.ITERATIONS)
            if not user or not hmac.compare_digest(digest, base64.b64decode(user["password_hash"])):
                raise ValueError("Correo o contraseña incorrectos.")
            return self._session(data, user)

    def current_user(self) -> dict | None:
        with self.lock:
            path = self.directory / "session.json"
            if not path.exists():
                return None
            token = read_secret(path).get("token", "")
            digest = hashlib.sha256(token.encode()).hexdigest()
            data = self._read()
            session = next((s for s in data["sessions"] if hmac.compare_digest(s["digest"], digest) and s["expires"] > time.time()), None)
            user = next((u for u in data["users"] if session and u["id"] == session["user_id"]), None)
            return self._public(user) if user else None

    def logout(self) -> None:
        with self.lock:
            path = self.directory / "session.json"
            if path.exists():
                digest = hashlib.sha256(read_secret(path).get("token", "").encode()).hexdigest()
                data = self._read()
                data["sessions"] = [s for s in data["sessions"] if not hmac.compare_digest(s["digest"], digest)]
                self._write(data)
                delete_secret(path)

    def update_profile(self, name: str, avatar: str) -> dict:
        with self.lock:
            current = self.current_user()
            if not current:
                raise ValueError("Inicia sesión primero.")
            if avatar and (not avatar.startswith("data:image/") or len(avatar) > 8_000_000):
                raise ValueError("El avatar debe ser una imagen de hasta 6 MB.")
            data = self._read()
            user = next(u for u in data["users"] if u["id"] == current["id"])
            user.update(name=str(name).strip()[:80] or user["name"], avatar=avatar)
            self._write(data)
            return self._public(user)


class AuthService:
    def __init__(self, provider: AuthProvider | None = None):
        self.provider = provider or LocalAuthProvider()
        self.preference = getattr(self.provider, "directory", getattr(self.provider, "path", storage.BASE_DIR / "cuentas/session.json").parent) / "remember.json"
        try:
            if self.preference.exists() and not json.loads(self.preference.read_text(encoding="utf-8")).get("remember", True):
                self.provider.logout()
        except (OSError, ValueError):
            pass

    def dispatch(self, action: str, data: dict) -> dict:
        try:
            from .licenses import activate_license, apply_license
            directory=self.preference.parent
            if action == 'activate-license':
                user=activate_license(directory,self.provider.current_user(),str(data.get('serial','')).strip())
                return {'ok':True,'user':user,'entitlements':{'plan':user['plan'],'pro':True},'message':'Licencia Pro validada para tu cuenta.'}
            if action == "cancel":
                self.provider.cancel_login()
                return {"ok":True}
            if action == "capabilities":
                return {"ok": True, "capabilities": self.provider.capabilities()}
            if action == "recover":
                return self.provider.recover_password(str(data.get("email", "")))
            if action == "status":
                user = self.provider.current_user()
            elif action == "register":
                user = self.provider.register(str(data.get("email", "")), str(data.get("password", "")), str(data.get("name", "")))
            elif action == "login":
                user = self.provider.login(str(data.get("email", "")), str(data.get("password", "")))
            elif action == "logout":
                self.provider.logout()
                user = None
            elif action == "google":
                result = self.provider.google_login()
                self.preference.parent.mkdir(parents=True, exist_ok=True)
                storage._atomic_write_json(self.preference, {"remember": bool(data.get("remember", True))})
                return result
            elif action == "profile":
                user = self.provider.update_profile(str(data.get("name", "")), str(data.get("avatar", "")))
            else:
                raise ValueError("Acción de cuenta desconocida.")
            user=apply_license(directory,user)
            if action in ("login", "register", "google"):
                self.preference.parent.mkdir(parents=True, exist_ok=True)
                storage._atomic_write_json(self.preference, {"remember": bool(data.get("remember", True))})
            message = getattr(self.provider, 'message', '')
            session_path = getattr(self.provider, 'path', directory / 'session.json')
            if user and action in ('login', 'register') and data.get('remember', True) and not session_is_persistent(session_path):
                message = 'Tu sesión estará activa hasta cerrar Strata. Desbloquea el llavero del sistema para mantenerla entre reinicios.'
            return {"ok": True, "user": user, "provider": "local" if isinstance(self.provider, LocalAuthProvider) else "remote",
                    "capabilities": self.provider.capabilities(),
                    "message": message,
                    "entitlements": {"plan": (user or {}).get("plan", "free"), "pro": (user or {}).get("plan") == "pro"}}
        except (ValueError, OSError, json.JSONDecodeError) as exc:
            return {"ok": False, "error": str(exc)}


def configured_provider() -> AuthProvider:
    """Conexión pública portable; el entorno permite usar otro proyecto."""
    import os
    config_path = storage.BASE_DIR / "conexion_nube.json"
    if not config_path.is_file():
        config_path = storage.BASE_DIR / "core" / "conexion_nube.json"
    if not config_path.is_file():
        config_path = storage.resource_path('core') / 'conexion_nube.json'
    config = json.loads(config_path.read_text(encoding="utf-8")) if config_path.is_file() else {}
    url, key = os.environ.get("STRATA_SUPABASE_URL"), os.environ.get("STRATA_SUPABASE_ANON_KEY")
    if bool(url) != bool(key):
        raise ValueError("Configura la URL y la clave pública de Supabase juntas.")
    options = None if url else config
    url, key = (url, key) if url else (config.get("url"), config.get("public_key"))
    if url and key:
        from .auth_supabase import SupabaseAuthProvider
        return SupabaseAuthProvider(url, key, options=options)
    return LocalAuthProvider()
