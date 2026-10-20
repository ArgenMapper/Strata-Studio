"""DPAPI en Windows; cifrado con clave del llavero en macOS/Linux.

Si no existe un llavero desbloqueado, la sesión vive solo en memoria. Nunca se
guardan contraseñas o tokens en texto plano como alternativa al llavero.
"""
import base64
import ctypes
import hashlib
import json
import sys
import secrets
from pathlib import Path

from .storage import _atomic_write_json

_volatile = {}
_SERVICE = 'StrataStudio.sessions.v1'


def _keyring():
    import keyring
    backend = keyring.get_keyring()
    if backend.priority <= 0:
        raise RuntimeError('No hay un llavero del sistema disponible.')
    return keyring


def _crypt(payload: bytes, decrypt: bool = False) -> bytes:
    from ctypes import wintypes
    class Blob(ctypes.Structure):
        _fields_ = [("size", wintypes.DWORD), ("data", ctypes.POINTER(ctypes.c_ubyte))]
    buffer = ctypes.create_string_buffer(payload)
    source = Blob(len(payload), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)))
    target = Blob()
    library = ctypes.WinDLL("crypt32", use_last_error=True)
    function = library.CryptUnprotectData if decrypt else library.CryptProtectData
    function.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
    function.restype = wintypes.BOOL
    if not function(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(target)):
        raise OSError("No se pudo proteger la sesión de usuario.")
    try:
        return ctypes.string_at(target.data, target.size)
    finally:
        ctypes.windll.kernel32.LocalFree.argtypes = [ctypes.c_void_p]
        ctypes.windll.kernel32.LocalFree(ctypes.cast(target.data, ctypes.c_void_p))


def write_secret(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if sys.platform == "win32":
        encrypted = _crypt(json.dumps(value).encode())
        _atomic_write_json(path, {"dpapi": base64.b64encode(encrypted).decode()})
    else:
        from cryptography.fernet import Fernet
        account = hashlib.sha256(str(path.resolve()).encode()).hexdigest()
        try:
            vault = _keyring()
            key = vault.get_password(_SERVICE, account)
            if not key:
                key = Fernet.generate_key().decode('ascii')
                vault.set_password(_SERVICE, account, key)
            encrypted = Fernet(key.encode('ascii')).encrypt(json.dumps(value).encode()).decode('ascii')
            _atomic_write_json(path, {'vault': account, 'encrypted': encrypted})
            _volatile.pop(str(path.resolve()), None)
        except Exception:
            nonce = secrets.token_hex(16)
            _volatile[str(path.resolve())] = (nonce, dict(value))
            _atomic_write_json(path, {'volatile': nonce})
        path.chmod(0o600)


def read_secret(path: Path) -> dict:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if "dpapi" in data:
        if sys.platform != 'win32':
            raise ValueError('Esta sesión pertenece a Windows. Inicia sesión de nuevo en este equipo.')
        return json.loads(_crypt(base64.b64decode(data["dpapi"]), decrypt=True))
    if 'volatile' in data:
        nonce, value = _volatile.get(str(path.resolve()), (None, {}))
        return dict(value) if nonce == data['volatile'] else {}
    if 'vault' in data:
        try:
            from cryptography.fernet import Fernet
            key = _keyring().get_password(_SERVICE, data['vault'])
            return json.loads(Fernet(key.encode('ascii')).decrypt(data['encrypted'].encode('ascii'))) if key else {}
        except Exception:
            return {}
    if sys.platform != 'win32':
        write_secret(path, data)  # Migrar sesiones antiguas de texto plano.
    return data


def delete_secret(path: Path) -> None:
    if path.exists() and sys.platform != 'win32':
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
            if 'vault' in data:
                _keyring().delete_password(_SERVICE, data['vault'])
        except Exception:
            pass
    _volatile.pop(str(path.resolve()), None)
    path.unlink(missing_ok=True)


def session_is_persistent(path: Path) -> bool:
    return path.is_file() and 'volatile' not in json.loads(path.read_text(encoding='utf-8'))
