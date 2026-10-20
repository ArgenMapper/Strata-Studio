"""Actualización local transaccional de código. Nunca sincroniza datos personales."""
import ast
import json
import os
import shutil
import tempfile
import sys
from pathlib import Path
from .platforms import application_root, immutable_bundle


def default_destination():
    if sys.platform != 'win32':
        return application_root()
    return Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData/Local")) / "Programs/Strata"


def apply_update(source, destination=None):
    source = Path(source).resolve()
    dest = Path(destination or default_destination()).resolve()
    if immutable_bundle(dest):
        raise ValueError('Actualiza Strata descargando el nuevo paquete. La actualización de código no modifica aplicaciones firmadas de Mac ni AppImage; tus datos están guardados por separado.')
    if source == dest or source.is_relative_to(dest) or dest.is_relative_to(source):
        raise ValueError("Selecciona el proyecto fuente fuera de la instalación de destino.")
    if not any((dest / name).is_file() for name in ('Strata.exe', 'Strata')) or not (dest / "bootstrap.json").is_file():
        raise ValueError("Instala primero Strata 9.5: el ejecutable anterior no carga código externo.")
    if not all((source / p).exists() for p in ("ui/index.html", "core/__init__.py", "main.py")):
        raise ValueError("La carpeta no contiene un proyecto Strata completo.")
    manifest = json.loads((dest / "bootstrap.json").read_text(encoding="utf-8"))
    if manifest.get("protocol") != 1:
        raise ValueError("El lanzador instalado requiere una actualización completa.")
    if (source / "core/licenses.py").exists() and "ed25519" not in manifest.get("runtime_features", []):
        raise ValueError("Strata 10 necesita el motor de licencias. Ejecuta Instalar_Strata_10.exe; tus proyectos y ajustes se conservarán.")
    files = [source / "main.py"]
    for folder in ("ui", "core"):
        files += [p for p in (source / folder).rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc" and p.name!='generar_licencias_admin.py']
    if any(p.is_symlink() or not p.resolve().is_relative_to(source) for p in files):
        raise ValueError("No se admiten enlaces fuera del proyecto.")
    for path in files:
        if path.suffix == ".py":
            ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
    # Preparar todo antes de reemplazar; rollback si falla un solo archivo.
    with tempfile.TemporaryDirectory(prefix="strata_update_", dir=dest.parent) as temporary:
        stage = Path(temporary)
        for path in files:
            target = stage / "new" / path.relative_to(source)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
        current = [dest / "main.py"]
        for folder in ("ui", "core"):
            current += [p for p in (dest / folder).rglob("*") if p.is_file()]
        changed = []
        try:
            for target in current:
                if target.exists():
                    backup = stage / "old" / target.relative_to(dest)
                    backup.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(target, backup)
            for path in files:
                rel = path.relative_to(source); target = dest / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                changed.append(target)
                os.replace(stage / "new" / rel, target)
            wanted = {p.relative_to(source) for p in files}
            for target in current:
                if target.relative_to(dest) not in wanted:
                    changed.append(target); target.unlink()
        except Exception:
            for target in reversed(changed):
                backup = stage / "old" / target.relative_to(dest)
                if backup.exists(): shutil.copy2(backup, target)
                elif target.exists(): target.unlink()
            raise
    return {"ok": True, "files": len(files), "destination": str(dest), "restart_required": True}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--destination")
    args = parser.parse_args()
    print(json.dumps(apply_update(args.source, args.destination), ensure_ascii=False))
