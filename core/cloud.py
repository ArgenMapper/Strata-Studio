"""Copias privadas y explícitas en Supabase Storage. No existe sincronización automática."""
import json
import os
import re
import secrets
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

MAX_BYTES = 25 * 1024 * 1024


class CloudBackups:
    def __init__(self, provider):
        self.provider = provider

    def _context(self):
        bucket = os.environ.get("STRATA_SUPABASE_STORAGE_BUCKET", getattr(self.provider, "bucket", ""))
        if not bucket or not self.provider.capabilities().get("cloud_backups"):
            raise ValueError("Las copias en la nube todavía no están configuradas en esta instalación.")
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}", bucket):
            raise ValueError("El nombre del bucket de copias no es válido.")
        user, token = self.provider.authenticated_session()
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,128}", user["id"]):
            raise ValueError("La identidad de la cuenta no es válida.")
        root = self.provider.url.removesuffix("/auth/v1") + "/storage/v1"
        return root, bucket, user, token

    def _request(self, path, method="GET", data=None):
        root, bucket, user, token = self._context()
        headers = {"apikey": self.provider.key, "Authorization": "Bearer " + token,
                   "Content-Type": "application/json"}
        if callable(data): data = data(user)
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None
        if raw is not None and len(raw) > MAX_BYTES:
            raise ValueError("Esta copia supera el límite de 25 MB.")
        url = root + path(bucket, user["id"])
        request = Request(url, data=raw, headers=headers, method=method)
        try:
            with urlopen(request, timeout=30) as response:
                result = response.read(MAX_BYTES + 1)
            if len(result) > MAX_BYTES:
                raise ValueError("La copia supera el límite de 25 MB.")
            return json.loads(result) if result else {}
        except HTTPError as exc:
            if exc.code in (401, 403):
                raise ValueError("El servicio no permitió acceder a la copia. Revisa la sesión y las políticas privadas del bucket.") from None
            raise ValueError(f"No se pudo completar la operación en la nube ({exc.code}).") from None
        except (URLError, TimeoutError):
            raise ValueError("No se pudo conectar a la nube. Tus archivos locales siguen disponibles.") from None

    def upload(self, project):
        if not isinstance(project, dict) or not isinstance(project.get("document"),dict) or not isinstance(project["document"].get("sheets"), list):
            raise ValueError("La copia no contiene un proyecto válido.")
        title = str(project["document"].get("title", "Manuscrito"))
        slug = re.sub(r"[^\w-]+", "_", title, flags=re.ASCII).strip("_")[:60] or "Manuscrito"
        name = f"{datetime.now(timezone.utc):%Y%m%dT%H%M%S}_{slug}_{secrets.token_hex(4)}.strata"
        clean = {k:v for k,v in project.items() if not k.startswith("_")}
        self._request(lambda bucket, user: f"/object/{quote(bucket)}/{quote(user)}/{quote(name)}", "POST", clean)
        return {"ok": True, "name": name, "message": "Copia privada subida. El archivo local se conserva."}

    def list(self):
        result = self._request(lambda bucket, uid: f"/object/list/{quote(bucket)}", "POST",
                               lambda user: {"prefix": user["id"] + "/", "limit": 100, "offset": 0, "sortBy": {"column":"created_at", "order":"desc"}})
        if not isinstance(result, list):
            raise ValueError("El servicio devolvió una lista de copias no válida.")
        entries = [{"name": row["name"], "created_at":row.get("created_at", ""), "size":(row.get("metadata") or {}).get("size", 0)}
                   for row in result if isinstance(row,dict) and re.fullmatch(r"[\w.-]+\.strata", row.get("name", ""), re.ASCII)]
        return {"ok": True, "copies": entries}

    def download(self, name):
        if not re.fullmatch(r"[\w.-]+\.strata", str(name), re.ASCII) or ".." in name:
            raise ValueError("El nombre de la copia no es válido.")
        project = self._request(lambda bucket, user: f"/object/authenticated/{quote(bucket)}/{quote(user)}/{quote(name)}")
        if not isinstance(project,dict) or not isinstance(project.get("document"),dict) or not isinstance(project["document"].get("sheets"),list):
            raise ValueError("El archivo de la nube no es un proyecto Strata válido.")
        return {"ok":True, "project":project}
