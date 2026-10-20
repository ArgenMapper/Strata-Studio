"""Compila Strata y su instalador transportable: python empaquetar_strata.py."""

from pathlib import Path
import os
import shutil
import subprocess
import sys
import zipfile


ROOT = Path(__file__).resolve().parent


def build_environment() -> dict:
    """Las herramientas del PATH no deben aportar DLL ajenas a Python/Qt."""
    env = os.environ.copy()
    windows = Path(env.get("SystemRoot", r"C:\Windows"))
    env["PATH"] = os.pathsep.join(map(str, [Path(sys.executable).parent, Path(sys.base_prefix),
                                          windows / "System32", windows, windows / "System32" / "Wbem"]))
    for key in ("PYTHONPATH", "PYTHONHOME", "QT_PLUGIN_PATH", "QT_QPA_PLATFORM_PLUGIN_PATH", "QML2_IMPORT_PATH",
                "QML_IMPORT_PATH", "QTWEBENGINEPROCESS_PATH", "QTWEBENGINE_DICTIONARIES_PATH"):
        env.pop(key, None)
    return env


def build() -> None:
    subprocess.run([sys.executable, "-m", "PyInstaller", "--clean", "--noconfirm", "Strata.spec"], cwd=ROOT, check=True, env=build_environment())
    source = ROOT / "dist" / "Strata"
    if not (source / "Strata.exe").is_file():
        raise FileNotFoundError("La compilación no produjo dist/Strata/Strata.exe")
    for name in ("ui", "core"):
        shutil.copytree(ROOT / name, source / name, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "generar_licencias_admin.py"))
    shutil.copy2(ROOT / "main.py", source / "main.py")
    (source / "bootstrap.json").write_text('{"protocol":1,"version":"11.0.0","runtime_features":["ed25519"]}', encoding="utf-8")
    build_uninstaller(source)
    verify_application(source / "Strata.exe", "compiled")
    archive = ROOT / "build" / "strata_bundle.zip"
    print("Comprimiendo la aplicación completa…", flush=True)
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
        for path in sorted(source.rglob("*")):
            if path.is_file():
                if "admin_privado" in path.parts or path.name == "generar_licencias_admin.py":
                    raise ValueError("Se ha detectado material administrativo en el paquete.")
                bundle.write(path, path.relative_to(source).as_posix())
    with zipfile.ZipFile(archive) as bundle:
        bad = bundle.testzip()
        if bad:
            raise ValueError(f"Archivo corrupto en el paquete: {bad}")
    build_installer(archive)


def build_uninstaller(destination: Path) -> None:
    """Un EXE de mantenimiento independiente, sin payload de la aplicación."""
    subprocess.run([sys.executable,'-m','PyInstaller','--noconfirm','--onefile','--windowed',
                    '--name','Desinstalar_Strata','--icon',str(ROOT/'app_icon.ico'),
                    '--specpath','build/uninstaller-spec',str(ROOT/'instalar_strata.py')],
                   cwd=ROOT,check=True,env=build_environment())
    executable=ROOT/'dist/Desinstalar_Strata.exe'
    if executable.stat().st_size>40*1024*1024:
        raise ValueError('El desinstalador incluye dependencias o paquetes inesperados.')
    shutil.copy2(executable,destination/executable.name)


def build_installer(archive: Path) -> None:
    """Permite repetir sólo el empaquetado si la compilación ya está verificada."""
    subprocess.run([
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--onefile", "--windowed",
        "--name", "Instalar_Strata_11", "--icon", str(ROOT / "app_icon.ico"),
        "--specpath", "build/installer-spec", "--add-data", f"{archive};.",
        str(ROOT / "instalar_strata.py"),
    ], cwd=ROOT, check=True, env=build_environment())
    installer = ROOT / "dist" / "Instalar_Strata_11.exe"
    verify_standalone_installer(installer)
    # Dos nombres para el mismo instalador autónomo; basta transportar uno de ellos.
    shutil.copy2(installer, ROOT / "dist" / "Instalar_Strata_Setup.exe")
    shutil.copy2(installer, ROOT / "Instalar_Strata_11.exe")
    print(f"Instalador autónomo listo: {installer}", flush=True)


def verify_application(executable: Path, label: str) -> None:
    """Arranca el EXE real, con Python/Qt y proyectos temporales, sin usar el código fuente."""
    import json
    reports = ROOT / "build" / "runtime-checks"
    reports.mkdir(parents=True, exist_ok=True)
    report = reports / f"{label}.json"
    if report.exists(): report.unlink()
    result = subprocess.run([str(executable), "--self-test", str(report)], cwd=executable.parent,
                            env=build_environment(), timeout=60, check=False)
    details = json.loads(report.read_text(encoding="utf-8")) if report.exists() else {}
    if result.returncode or not details.get("ok"):
        raise RuntimeError(f"El ejecutable compilado no supera el arranque: {details.get('error', result.returncode)}. Informe: {report}")
    print(f"EXE verificado: Qt, Chromium y QWebChannel ({label})", flush=True)


def verify_standalone_installer(installer: Path) -> None:
    import tempfile
    with tempfile.TemporaryDirectory(prefix="standalone_setup_", dir=ROOT / "build") as directory:
        root = Path(directory).resolve()
        if not root.is_relative_to((ROOT / "build").resolve()):
            raise ValueError("Directorio de verificación inválido")
        standalone = root / installer.name
        shutil.copy2(installer, standalone)
        verify_application(standalone, "standalone-installer")


if __name__ == "__main__":
    build()
