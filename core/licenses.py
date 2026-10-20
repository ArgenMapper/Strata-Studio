"""Licencias Ed25519: sólo la clave pública se distribuye con la aplicación."""
import base64
import hashlib
import json
import time
from pathlib import Path
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from .secrets import read_secret, write_secret
PUBLIC_KEY_FILE=Path(__file__).with_name('license_public.json')

def subject(email):
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()

def encode(raw):
    return base64.urlsafe_b64encode(raw).decode().rstrip('=')

def decode(raw):
    return base64.urlsafe_b64decode(raw + '=' * (-len(raw) % 4))

def verify_license(serial, email, public_path=None):
    try:
        if not isinstance(serial, str) or len(serial)>4096 or not serial.startswith('STRATA-PRO-'):
            raise ValueError()
        payload, signature = serial.removeprefix('STRATA-PRO-').split('.')
        raw = decode(payload)
        key = json.loads(Path(public_path or PUBLIC_KEY_FILE).read_text())
        Ed25519PublicKey.from_public_bytes(decode(key['public_key'])).verify(decode(signature), raw)
        claims = json.loads(raw)
        if not isinstance(claims,dict): raise ValueError()
        if claims.get('v')!=1 or claims.get('plan')!='pro' or claims.get('subject')!=subject(email) or not claims.get('id'):
            raise ValueError()
        if claims.get('expires') is not None and (not isinstance(claims['expires'], int) or claims['expires']<=time.time()):
            raise ValueError('La licencia ha vencido.')
        return claims
    except (InvalidSignature, OSError, KeyError, TypeError, UnicodeError, ValueError) as exc:
        raise ValueError('Licencia inválida, vencida o emitida para otro correo.') from exc

def license_path(directory, user):
    return Path(directory) / ('licencia_' + subject(user['email']) + '.json')

def apply_license(directory, user):
    if not user:
        return None
    user = dict(user)
    try:
        stored = read_secret(license_path(directory,user))
        if stored.get('serial'):
            verify_license(stored['serial'],user['email'])
            user['plan']='pro'; user['plan_source']='license'
    except (ValueError,OSError,KeyError):
        pass
    return user

def activate_license(directory, user, serial):
    if not user or not user.get('email'):
        raise ValueError('Inicia sesión con la cuenta para la que se emitió la licencia.')
    verify_license(serial,user['email'])
    write_secret(license_path(directory,user),{'serial':serial})
    return apply_license(directory,user)
