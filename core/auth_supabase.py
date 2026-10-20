"""Adaptador opcional Supabase Auth REST, correo y Google con PKCE.

Sólo usa la clave pública anon/publishable. Pro se consulta en profiles tras
validar el usuario con /user; ningún metadato del perfil concede el plan.
"""
import base64
import hashlib
import json
import os
import re
import secrets
import threading
import time
import webbrowser
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

from . import storage
from .auth import AuthProvider
from .secrets import read_secret, write_secret, delete_secret


class SupabaseAuthProvider(AuthProvider):
    def __init__(self, url, public_key, directory=None, *, options=None):
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or public_key.startswith("sb_secret_"):
            raise ValueError("Configura una URL HTTPS de Supabase y una clave pública anon/publishable.")
        if public_key.count(".") == 2:
            try:
                role = json.loads(base64.urlsafe_b64decode(public_key.split(".")[1] + "===")).get("role")
                if role == "service_role":
                    raise ValueError("No se permite una clave service_role en la aplicación de escritorio.")
            except (json.JSONDecodeError, UnicodeDecodeError):
                raise ValueError("La clave pública no es válida.")
        self.url = url.rstrip("/") + "/auth/v1"
        self.key = public_key
        self.bucket = (options or {}).get("storage_bucket", "") if options is not None else os.environ.get("STRATA_SUPABASE_STORAGE_BUCKET", "")
        self.google_enabled = (options or {}).get("google_enabled", False) if options is not None else True
        self.recovery_enabled = (options or {}).get("recovery_enabled", False) if options is not None else True
        self.path = (directory or storage.BASE_DIR / "cuentas") / "supabase_session.json"
        self.lock = threading.RLock()
        self.callback_url = ""
        self.pending = None
        self.message = ""

    def _request(self, endpoint, data=None, token=None, method=None):
        headers = {"apikey": self.key, "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        root = self.url.removesuffix('/auth/v1')+'/rest/v1' if endpoint.startswith('/profiles?') else self.url
        request = Request(root + endpoint, data=json.dumps(data).encode() if data is not None else None,
                          headers=headers, method=method or ("POST" if data is not None else "GET"))
        try:
            with urlopen(request, timeout=20) as response:
                raw = response.read()
                return json.loads(raw) if raw else {}
        except HTTPError as exc:
            # Traducir sólo códigos conocidos; no mostrar cuerpos con datos personales.
            try:
                code = json.loads(exc.read(8192)).get("error_code") or ""
            except (ValueError, OSError):
                code = ""
            messages = {
                "invalid_credentials": "Correo o contraseña incorrectos.",
                "email_not_confirmed": "Confirma tu correo desde el mensaje de Supabase antes de iniciar sesión.",
                "user_already_exists": "Ya existe una cuenta con este correo. Inicia sesión.",
                "weak_password": "La contraseña no cumple los requisitos de seguridad del servicio.",
                "over_email_send_rate_limit": "Se enviaron demasiados correos. Espera unos minutos antes de volver a intentarlo.",
                "over_request_rate_limit": "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
            }
            if code in messages:
                raise ValueError(messages[code]) from None
            if exc.code in (400, 401, 403, 422):
                raise ValueError("Supabase rechazó el acceso. Revisa el correo, la contraseña y la confirmación de la cuenta.") from None
            raise ValueError(f"El proveedor de identidad devolvió un error ({exc.code}).") from None
        except (URLError, TimeoutError):
            raise ValueError("No se pudo conectar al proveedor de identidad.") from None

    @staticmethod
    def _public(user):
        metadata = user.get("user_metadata") or {}
        return {"id": user["id"], "email": user.get("email", ""), "name": metadata.get("name") or metadata.get("full_name") or user.get("email", ""),
                "avatar": metadata.get("avatar_url", ""), "plan": "free", "created_at": user.get("created_at", "")}

    def _save(self, session):
        session = dict(session)
        session["expires_at"] = session.get("expires_at") or time.time() + session.get("expires_in", 3600)
        write_secret(self.path, session)

    def _avatar_path(self, user_id):
        return self.path.parent / ('supabase_avatar_' + hashlib.sha256(user_id.encode()).hexdigest() + '.json')

    def _refresh_session(self, session):
        refreshed = self._request('/token?grant_type=refresh_token', {'refresh_token': session['refresh_token']})
        self._save(refreshed)
        return refreshed

    def register(self, email, password, name):
        with self.lock:
            result = self._request("/signup", {"email": email.strip(), "password": password, "data": {"name": name}})
            if result.get("access_token"):
                self._save(result)
                return self.current_user()
            self.message = "Revisa tu correo para confirmar la cuenta y luego inicia sesión."
            return None

    def login(self, email, password):
        with self.lock:
            result = self._request("/token?grant_type=password", {"email": email.strip(), "password": password})
            self._save(result); self.message = ""; return self.current_user()

    def current_user(self):
        with self.lock:
            session = read_secret(self.path)
            if not session.get("access_token"):
                return None
            if session.get("expires_at", 0) < time.time() + 60:
                session = self._refresh_session(session)
            verified=self._request("/user", token=session["access_token"])
            # Una foto base64 en Auth se copia dentro de cada JWT. Un avatar de
            # 40 KB supera las cabeceras de PostgREST y rompe planes y Storage.
            avatar = (verified.get('user_metadata') or {}).get('avatar_url', '')
            if isinstance(avatar, str) and avatar.startswith('data:image/'):
                write_secret(self._avatar_path(verified['id']), {'data_url': avatar})
                self._request('/user', {'data': {'avatar_url': ''}}, token=session['access_token'], method='PUT')
                session = self._refresh_session(session)
                verified = self._request('/user', token=session['access_token'])
            user=self._public(verified)
            local_avatar = read_secret(self._avatar_path(user['id'])).get('data_url')
            if local_avatar:
                user['avatar'] = local_avatar
            user['plan_verified'] = False
            try:
                rows=self._request('/profiles?'+urlencode({'select':'plan','id':'eq.'+user['id']}),token=session['access_token'])
                if isinstance(rows,list) and rows and rows[0].get('plan') in ('free', 'pro'):
                    user.update(plan=rows[0]['plan'], plan_source='profiles', plan_verified=True)
            except (HTTPError,URLError,TimeoutError,ValueError):
                pass  # Sin tabla o sin conexión nunca se concede Pro desde el cliente.
            if not user['plan_verified']:
                user['plan_error'] = 'No se pudo verificar tu plan en Supabase. Tu sesión sigue activa; vuelve a comprobarlo en unos momentos.'
            return user

    def logout(self):
        with self.lock:
            session = read_secret(self.path)
            try:
                if session.get("access_token"):
                    self._request("/logout", {}, token=session["access_token"])
            finally:
                delete_secret(self.path)

    def update_profile(self, name, avatar):
        if avatar and (not isinstance(avatar,str) or not avatar.startswith('data:image/') or len(avatar)>8_000_000):
            raise ValueError('El avatar debe ser una imagen de hasta 6 MB.')
        with self.lock:
            user = self.current_user()
            if not user:
                raise ValueError("Inicia sesión primero.")
            session = read_secret(self.path)
            self._request("/user", {"data": {"name": str(name).strip()[:80], "avatar_url": ''}}, token=session.get("access_token"), method="PUT")
            write_secret(self._avatar_path(user['id']), {'data_url': avatar})
            self._refresh_session(session)
            return self.current_user()

    def cancel_login(self):
        with self.lock:
            self.pending = None

    def capabilities(self):
        return {"provider": "supabase", "google": bool(self.google_enabled), "password_recovery": bool(self.recovery_enabled),
                "cloud_backups": bool(self.bucket or os.environ.get("STRATA_SUPABASE_STORAGE_BUCKET")),
                "plans": True, "registration": True}

    def recover_password(self, email):
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email.strip()):
            raise ValueError("Escribe un correo válido para recuperar el acceso.")
        self._request("/recover", {"email": email.strip()})
        return {"ok": True, "message": "Si la cuenta existe, recibirás un enlace para recuperar el acceso. Completa el proceso en la página de recuperación del servicio."}

    def authenticated_session(self):
        user = self.current_user()  # Verificación de identidad y renovación antes de usar Storage.
        if not user:
            raise ValueError("Inicia sesión en tu cuenta en la nube.")
        session = read_secret(self.path)
        return user, session["access_token"]

    def google_login(self):
        with self.lock:
            if not self.callback_url:
                raise ValueError("El callback OAuth aún no está listo.")
            verifier = secrets.token_urlsafe(64)
            nonce = secrets.token_urlsafe(32)
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
            self.pending = {"verifier": verifier, "nonce": nonce, "expires": time.time() + 300}
            query = urlencode({"provider": "google", "redirect_to": self.callback_url + "?flow=" + nonce,
                               "code_challenge": challenge, "code_challenge_method": "s256"})
            if not webbrowser.open(self.url + "/authorize?" + query):
                raise ValueError("No se pudo abrir el navegador para Google.")
            return {"ok": True, "pending": True, "message": "Completa el acceso en tu navegador y vuelve a Strata."}

    def oauth_callback(self, query):
        with self.lock:
            data = parse_qs(query)
            flow, code = data.get("flow", [""])[0], data.get("code", [""])[0]
            if not self.pending or self.pending["expires"] < time.time() or not secrets.compare_digest(flow, self.pending["nonce"]):
                raise ValueError("El acceso OAuth venció o no corresponde a esta sesión.")
            verifier = self.pending["verifier"]; self.pending = None
            if not code:
                raise ValueError("El proveedor no devolvió un código de acceso.")
            result = self._request("/token?grant_type=pkce", {"auth_code": code, "code_verifier": verifier})
            self._save(result)
            return {"ok": True, "user": self.current_user()}
