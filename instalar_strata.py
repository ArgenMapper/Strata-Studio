"""
Instalador y Desinstalador Oficial de Strata para Windows.
- Interfaz gráfica moderna con dos modos:
  1) "Instalar / Actualizar Strata"
  2) "Desinstalar Strata"
- Copia el paquete compilado (dist/Strata) a %LOCALAPPDATA%\\Programs\\Strata
- Instala Desinstalar_Strata.exe dentro de %LOCALAPPDATA%\\Programs\\Strata
- Registra oficialmente Strata en el Panel de Control / Aplicaciones instaladas de Windows:
  HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Strata
- Registra la asociación de archivos .strata en Windows Explorer:
  HKEY_CURRENT_USER\\Software\\Classes\\.strata y HKEY_CURRENT_USER\\Software\\Classes\\Strata.Project
"""

from __future__ import annotations

import ctypes
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
import tkinter as tk
from datetime import datetime
from pathlib import Path
from tkinter import ttk
import queue
import threading
import winreg


APP_NAME = "Strata"
APP_DISPLAY_NAME = "Strata Studio 11.0 — Escritura e Investigación"
APP_VERSION = "11.0.0"
APP_PUBLISHER = "Strata Studio"
INSTALL_DIR_NAME = "Strata"
EXE_NAME = "Strata.exe"
UNINSTALLER_EXE_NAME = "Desinstalar_Strata.exe"
INSTALLER_OUTPUT_EXE_NAME = "Instalar_Strata_11.exe"
_extracted_bundle = None

UNINSTALL_REG_PATH = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\Strata"
EXT_REG_PATH = r"Software\Classes\.strata"
PROGID_REG_PATH = r"Software\Classes\Strata.Project"


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def get_install_dir() -> Path:
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, UNINSTALL_REG_PATH) as key:
            installed = Path(winreg.QueryValueEx(key, "InstallLocation")[0])
            if (installed / EXE_NAME).is_file(): return installed
    except OSError:
        pass
    local_appdata = os.environ.get("LOCALAPPDATA", os.path.expanduser("~\\AppData\\Local"))
    return Path(local_appdata) / "Programs" / INSTALL_DIR_NAME


def run_application(executable: Path, arguments=(), wait=False):
    """No heredar del instalador el directorio de DLL ni la extracción PyInstaller."""
    env = os.environ.copy()
    windows = Path(env.get("SystemRoot", r"C:\Windows"))
    env["PATH"] = os.pathsep.join(map(str, (windows / "System32", windows)))
    env["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
    for key in ("PYTHONPATH", "PYTHONHOME", "QT_PLUGIN_PATH", "QT_QPA_PLATFORM_PLUGIN_PATH", "QML2_IMPORT_PATH", "QML_IMPORT_PATH", "QTWEBENGINEPROCESS_PATH", "QTWEBENGINE_DICTIONARIES_PATH"):
        env.pop(key, None)
    previous = None
    if sys.platform == "win32" and getattr(sys, "frozen", False):
        get_directory = ctypes.windll.kernel32.GetDllDirectoryW
        get_directory.argtypes = [ctypes.c_ulong, ctypes.c_wchar_p]
        buffer = ctypes.create_unicode_buffer(32768)
        get_directory(len(buffer), buffer)
        previous = buffer.value
        ctypes.windll.kernel32.SetDllDirectoryW.argtypes = [ctypes.c_wchar_p]
        ctypes.windll.kernel32.SetDllDirectoryW(None)
    try:
        command = [str(executable), *map(str, arguments)]
        if wait:
            return subprocess.run(command, cwd=executable.parent, env=env, timeout=60, check=False)
        return subprocess.Popen(command, cwd=executable.parent, env=env)
    finally:
        if previous is not None:
            ctypes.windll.kernel32.SetDllDirectoryW(previous or None)


def verify_runtime(bundle: Path, report: Path | None = None) -> None:
    with tempfile.TemporaryDirectory(prefix="strata_verify_") as temporary:
        target = report or Path(temporary) / "runtime.json"
        result = run_application(bundle / EXE_NAME, ["--self-test", target], wait=True)
        details = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {}
        if result.returncode or not details.get("ok"):
            raise RuntimeError("Strata no pudo iniciar Qt/Chromium. La instalación no se completó. " + str(details.get("error", "Fallo de arranque del ejecutable.")))


def find_source_bundle() -> Path:
    global _extracted_bundle
    if getattr(sys, "frozen", False):
        archive = Path(sys._MEIPASS) / "strata_bundle.zip"
        if not archive.is_file():
            raise FileNotFoundError("El instalador no contiene strata_bundle.zip. Vuelve a compilar con empaquetar_strata.py.")
        if _extracted_bundle is not None:
            return Path(_extracted_bundle.name)
        temporary = tempfile.TemporaryDirectory(prefix="strata_setup_")
        root = Path(temporary.name).resolve()
        try:
            with zipfile.ZipFile(archive) as bundle:
                for member in bundle.infolist():
                    target = (root / member.filename).resolve()
                    if not target.is_relative_to(root):
                        raise ValueError("El paquete contiene una ruta inválida.")
                if EXE_NAME not in bundle.namelist():
                    raise ValueError("El paquete no contiene Strata.exe.")
                bundle.extractall(root)
            _extracted_bundle = temporary
            return root
        except Exception:
            temporary.cleanup()
            raise
    base = get_base_dir()
    candidates = [
        base / "dist" / "Strata",
        base / "Strata",
        base.parent / "dist" / "Strata",
        Path(__file__).resolve().parent / "dist" / "Strata",
    ]
    if hasattr(sys, "_MEIPASS"):
        candidates.insert(0, Path(getattr(sys, "_MEIPASS")) / "Strata")
    for c in candidates:
        if (c / EXE_NAME).exists():
            return c
    raise FileNotFoundError(
        f"No se encontró la carpeta compilada con {EXE_NAME}.\n"
        f"Asegúrate de que exista 'dist/Strata/{EXE_NAME}' junto al instalador."
    )


def get_desktop_path() -> Path:
    try:
        buf = ctypes.create_unicode_buffer(260)
        # CSIDL_DESKTOPDIRECTORY = 0x0010
        ctypes.windll.shell32.SHGetFolderPathW(None, 0x0010, None, 0, buf)
        if buf.value:
            return Path(buf.value)
    except Exception:
        pass
    return Path(os.path.expanduser("~")) / "Desktop"


def get_start_menu_programs_path() -> Path:
    appdata = os.environ.get("APPDATA", os.path.expanduser("~\\AppData\\Roaming"))
    return Path(appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs"


def create_windows_shortcut(
    shortcut_path: Path,
    target_exe: Path,
    work_dir: Path,
    icon_path: Path,
    description: str,
    arguments: str = "",
) -> None:
    shortcut_path.parent.mkdir(parents=True, exist_ok=True)
    ps_script = (
        "$ws = New-Object -ComObject WScript.Shell; "
        f"$s = $ws.CreateShortcut('{str(shortcut_path)}'); "
        f"$s.TargetPath = '{str(target_exe)}'; "
        f"$s.Arguments = '{arguments}'; "
        f"$s.WorkingDirectory = '{str(work_dir)}'; "
        f"$s.IconLocation = '{str(icon_path)},0'; "
        f"$s.Description = '{description}'; "
        "$s.Save()"
    )
    subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps_script],
        check=True,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
    )


def compute_dir_size_kb(folder: Path) -> int:
    total = 0
    try:
        for root, _, files in os.walk(folder):
            for f in files:
                try:
                    total += (Path(root) / f).stat().st_size
                except OSError:
                    pass
    except Exception:
        pass
    return max(1024, total // 1024)


def notify_shell_associations_changed() -> None:
    try:
        # SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_IDLIST = 0x0000
        ctypes.windll.shell32.SHChangeNotify(0x08000000, 0x0000, None, None)
    except Exception:
        pass


def register_windows_control_panel_and_associations(dest_dir: Path, target_exe: Path, uninstaller_exe: Path, icon_file: Path) -> None:
    # 1) Registro en Panel de Control / Aplicaciones instaladas (HKCU\...\Uninstall\Strata)
    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, UNINSTALL_REG_PATH, 0, winreg.KEY_WRITE) as key:
        winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, APP_DISPLAY_NAME)
        winreg.SetValueEx(key, "DisplayVersion", 0, winreg.REG_SZ, APP_VERSION)
        winreg.SetValueEx(key, "Publisher", 0, winreg.REG_SZ, APP_PUBLISHER)
        winreg.SetValueEx(key, "DisplayIcon", 0, winreg.REG_SZ, f"{icon_file},0")
        winreg.SetValueEx(key, "InstallLocation", 0, winreg.REG_SZ, str(dest_dir))
        winreg.SetValueEx(key, "InstallDate", 0, winreg.REG_SZ, datetime.now().strftime("%Y%m%d"))
        winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, f'"{uninstaller_exe}" --uninstall')
        winreg.SetValueEx(key, "QuietUninstallString", 0, winreg.REG_SZ, f'"{uninstaller_exe}" --uninstall --quiet')
        winreg.SetValueEx(key, "NoModify", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "NoRepair", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "EstimatedSize", 0, winreg.REG_DWORD, compute_dir_size_kb(dest_dir))

    # 2) Asociación de extensión .strata -> Strata.Project
    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, EXT_REG_PATH, 0, winreg.KEY_WRITE) as ext_key:
        winreg.SetValueEx(ext_key, "", 0, winreg.REG_SZ, "Strata.Project")
        winreg.SetValueEx(ext_key, "Content Type", 0, winreg.REG_SZ, "application/json")

    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, PROGID_REG_PATH, 0, winreg.KEY_WRITE) as prog_key:
        winreg.SetValueEx(prog_key, "", 0, winreg.REG_SZ, "Proyecto de Strata (.strata)")

    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, PROGID_REG_PATH + r"\DefaultIcon", 0, winreg.KEY_WRITE) as icon_key:
        winreg.SetValueEx(icon_key, "", 0, winreg.REG_SZ, f'"{icon_file}",0')

    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, PROGID_REG_PATH + r"\shell\open\command", 0, winreg.KEY_WRITE) as cmd_key:
        winreg.SetValueEx(cmd_key, "", 0, winreg.REG_SZ, f'"{target_exe}" "%1"')

    notify_shell_associations_changed()


def delete_reg_tree_hkcu(subkey_path: str) -> None:
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, subkey_path, 0, winreg.KEY_READ | winreg.KEY_WRITE) as k:
            while True:
                try:
                    child = winreg.EnumKey(k, 0)
                    delete_reg_tree_hkcu(f"{subkey_path}\\{child}")
                except OSError:
                    break
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, subkey_path)
    except FileNotFoundError:
        pass
    except OSError:
        pass


def copy_uninstaller_binary(dest_dir: Path) -> Path:
    uninstaller_target = dest_dir / UNINSTALLER_EXE_NAME
    base = get_base_dir()

    # El paquete nuevo ya contiene un desinstalador pequeño, sin el ZIP de Strata.
    if uninstaller_target.is_file():
        return uninstaller_target

    # Si estamos ejecutando desde el .exe compilado del instalador, nos copiamos como Desinstalar_Strata.exe
    if getattr(sys, "frozen", False):
        cur_exe = Path(sys.executable).resolve()
        if cur_exe != uninstaller_target:
            shutil.copy2(cur_exe, uninstaller_target)
        return uninstaller_target

    # Si estamos ejecutando desde Python, buscamos Instalar_Strata_Beta1.exe ya compilado
    for cand in [
        base / INSTALLER_OUTPUT_EXE_NAME,
        base / "dist" / INSTALLER_OUTPUT_EXE_NAME,
        Path(__file__).resolve().parent / INSTALLER_OUTPUT_EXE_NAME,
        Path(__file__).resolve().parent / "dist" / INSTALLER_OUTPUT_EXE_NAME,
    ]:
        if cand.exists():
            shutil.copy2(cand, uninstaller_target)
            return uninstaller_target

    # Fallback: copiar el script junto con un lanzador .bat si aún no se compiló el instalador .exe
    shutil.copy2(Path(__file__).resolve(), dest_dir / "instalar_strata.py")
    return uninstaller_target


def cleanup_packaging_artifacts(destination):
    """Sólo ZIP residuales identificables del instalador; nunca archivos de usuario."""
    root = Path(destination).resolve()
    for relative in ('strata_bundle.zip', '_internal/strata_bundle.zip'):
        path = root / relative
        if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(root):
            continue
        try:
            with zipfile.ZipFile(path) as archive:
                names = set(archive.namelist())
            if 'Strata.exe' in names or 'Strata/Strata.exe' in names:
                path.unlink()
        except (OSError, zipfile.BadZipFile):
            pass


def install_strata(progress_cb=None, launch_after: bool = False, destination=None) -> tuple[Path, Path]:
    if progress_cb:
        progress_cb("Localizando archivos compilados de Strata…")
    src_dir = find_source_bundle()
    dest_dir = Path(destination or get_install_dir()).resolve()
    if dest_dir == src_dir.resolve() or len(dest_dir.parts) < 3 or dest_dir.is_relative_to(src_dir.resolve()) or src_dir.resolve().is_relative_to(dest_dir):
        raise ValueError("Elige una carpeta de instalación independiente del paquete fuente.")
    if progress_cb:
        progress_cb("Comprobando que el paquete inicia Qt y Chromium…")
    verify_runtime(src_dir)

    if progress_cb:
        progress_cb("Cerrando instancias activas de Strata.exe…")
    subprocess.run(
        ["taskkill", "/F", "/IM", EXE_NAME],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
    )

    if progress_cb:
        progress_cb(f"Copiando archivos a {dest_dir}…")
    if dest_dir.exists():
        internal_dir = dest_dir / "_internal"
        if internal_dir.exists():
            if internal_dir.resolve().parent != dest_dir.resolve():
                raise ValueError("Directorio de aplicación inválido.")
            shutil.rmtree(internal_dir)
        old_exe = dest_dir / EXE_NAME
        if old_exe.exists():
            try:
                old_exe.unlink()
            except Exception:
                pass

    dest_dir.parent.mkdir(parents=True, exist_ok=True)
    files = [p for p in src_dir.rglob("*") if p.is_file() and p.name != 'strata_bundle.zip']
    for index, path in enumerate(files):
        target = dest_dir / path.relative_to(src_dir)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        if progress_cb:
            progress_cb(f"{int(10 + (index + 1) / len(files) * 78)}% · {path.relative_to(src_dir)}")
    if progress_cb:
        progress_cb("Verificando la aplicación instalada…")
    verify_runtime(dest_dir)
    cleanup_packaging_artifacts(dest_dir)

    # Asegurar que app_icon.ico también esté en la raíz de la instalación
    root_icon = get_base_dir() / "app_icon.ico"
    if root_icon.exists() and not (dest_dir / "app_icon.ico").exists():
        shutil.copy2(root_icon, dest_dir / "app_icon.ico")

    target_exe = dest_dir / EXE_NAME
    icon_file = dest_dir / "app_icon.ico"
    if not icon_file.exists():
        alt_icon = dest_dir / "_internal" / "app_icon.ico"
        icon_file = alt_icon if alt_icon.exists() else target_exe

    if progress_cb:
        progress_cb("Configurando desinstalador oficial (Desinstalar_Strata.exe)…")
    uninstaller_exe = copy_uninstaller_binary(dest_dir)
    uninstaller_for_reg = uninstaller_exe if uninstaller_exe.exists() else target_exe

    if progress_cb:
        progress_cb("Creando accesos directos en Escritorio y Menú Inicio…")
    desktop_dir = get_desktop_path()
    start_menu_dir = get_start_menu_programs_path()

    # Limpiar acceso directo con nombre antiguo si existía
    old_desk_lnk = desktop_dir / "Strata Beta 1.lnk"
    if old_desk_lnk.exists():
        try:
            old_desk_lnk.unlink()
        except Exception:
            pass

    desktop_shortcut = desktop_dir / "Strata.lnk"
    start_menu_shortcut = start_menu_dir / "Strata.lnk"
    start_menu_uninstall = start_menu_dir / "Desinstalar Strata.lnk"

    desc = "Strata — Entorno de Investigación y Escritura por Capas"
    create_windows_shortcut(desktop_shortcut, target_exe, dest_dir, icon_file, desc)
    create_windows_shortcut(start_menu_shortcut, target_exe, dest_dir, icon_file, desc)
    if uninstaller_exe.exists():
        create_windows_shortcut(
            start_menu_uninstall,
            uninstaller_exe,
            dest_dir,
            icon_file,
            "Desinstalar Strata de este equipo",
            arguments="--uninstall",
        )

    if progress_cb:
        progress_cb("Registrando Strata en Panel de Control y asociando archivos .strata…")
    register_windows_control_panel_and_associations(dest_dir, target_exe, uninstaller_for_reg, icon_file)

    if progress_cb:
        progress_cb("¡Instalación completada con éxito!")

    if launch_after and target_exe.exists():
        run_application(target_exe)

    return dest_dir, desktop_shortcut


def uninstall_strata(progress_cb=None) -> None:
    dest_dir = get_install_dir().resolve()
    if len(dest_dir.parts) < 3 or not (dest_dir / EXE_NAME).is_file():
        raise ValueError("No se encontró una instalación válida para desinstalar.")

    if progress_cb:
        progress_cb("Cerrando instancias abiertas de Strata.exe…")
    subprocess.run(
        ["taskkill", "/F", "/IM", EXE_NAME],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
    )

    if progress_cb:
        progress_cb("Eliminando accesos directos del Escritorio y Menú Inicio…")
    desktop_dir = get_desktop_path()
    start_menu_dir = get_start_menu_programs_path()

    for lnk in [
        desktop_dir / "Strata.lnk",
        desktop_dir / "Strata Beta 1.lnk",
        start_menu_dir / "Strata.lnk",
        start_menu_dir / "Strata Beta 1.lnk",
        start_menu_dir / "Desinstalar Strata.lnk",
    ]:
        if lnk.exists():
            try:
                lnk.unlink()
            except Exception:
                pass

    if progress_cb:
        progress_cb("Limpiando registro de Windows y asociación de archivos .strata…")
    delete_reg_tree_hkcu(UNINSTALL_REG_PATH)
    delete_reg_tree_hkcu(EXT_REG_PATH)
    delete_reg_tree_hkcu(PROGID_REG_PATH)
    notify_shell_associations_changed()

    if progress_cb:
        progress_cb(f"Eliminando carpeta de instalación ({dest_dir})…")

    if dest_dir.exists():
        cur_exe = Path(sys.executable).resolve() if getattr(sys, "frozen", False) else None
        # Sólo archivos del programa: proyectos, cuentas, backups y preferencias permanecen.
        names = ("_internal", "ui", "core", "main.py", "bootstrap.json", "app_icon.ico", EXE_NAME, UNINSTALLER_EXE_NAME)
        for name in names:
            child = dest_dir / name
            if child.resolve().parent != dest_dir or child.is_symlink():
                raise ValueError("Ruta de desinstalación no válida.")
            if not child.exists(): continue
            if cur_exe and child.resolve() == cur_exe:
                quoted = str(child).replace("'", "''")
                subprocess.Popen(["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command",
                                  f"Start-Sleep -Seconds 3; Remove-Item -LiteralPath '{quoted}' -Force"],
                                 creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000), close_fds=True)
            elif child.is_dir(): shutil.rmtree(child)
            else: child.unlink()

    if progress_cb:
        progress_cb("Strata ha sido desinstalado completamente del sistema.")


def quick_update(source, destination=None):
    from core.updater import apply_update
    return apply_update(source, destination or get_install_dir())


class StrataInstallerWindow:
    """El hilo de trabajo sólo envía eventos; Tk se actualiza en el hilo principal."""
    def __init__(self, start_in_uninstall=False):
        self.root = tk.Tk()
        self.root.title("Strata Studio 10 · Instalación")
        width=min(860,self.root.winfo_screenwidth()-48)
        height=min(540,self.root.winfo_screenheight()-80)
        self.root.geometry(f"{width}x{height}")
        self.root.minsize(min(640,width),min(470,height))
        self.root.configure(bg="#14161a")
        self.events = queue.Queue()
        self.destination = tk.StringVar(value=str(get_install_dir()))
        self.status = tk.StringVar(value="Elige dónde instalar Strata.")
        self.progress = tk.DoubleVar(value=0)
        self.busy = False
        self.art=tk.Canvas(self.root,width=210,bg='#0c1018',highlightthickness=0)
        self.art.pack(side='left',fill='y')
        self.art.create_text(26,32,text='STRATA',anchor='nw',fill='#c6d6ed',font=('Segoe UI',16,'bold'))
        for i in range(4):
            x,y=31+i*8,160-i*10
            self.art.create_polygon(x,y,x+110,y-30,x+145,y+125,x+37,y+153,fill=['#182332','#22344b','#304967','#527399'][i],outline='#6e91ba',width=1)
        for i in range(5):self.art.create_line(76+i*3,176+i*17,140+i*3,157+i*17,fill='#9ebada',width=1)
        self.art.create_text(26,380,text='Un lugar para\nescribir lo que sigue.',anchor='nw',fill='#8faccf',font=('Segoe UI',13),width=160)
        self.container = tk.Frame(self.root, bg="#14161a", padx=28, pady=24)
        self.container.pack(side='left',fill="both", expand=True)
        self.actions = tk.Frame(self.container, bg="#14161a")
        self.actions.pack(fill="x", side="bottom",pady=(12,0))
        self.label("INSTALACIÓN · 11.0", 9, "#8faed6").pack(anchor="w")
        self.label("Tu estudio de escritura", 21).pack(anchor="w", pady=(12, 6))
        self.label("En tu equipo. A tu ritmo.", 11, "#a5aab5").pack(anchor="w", pady=(0, 24))
        self.label("Carpeta de destino", 10).pack(anchor="w")
        row = tk.Frame(self.container, bg="#14161a"); row.pack(fill="x", pady=8)
        tk.Entry(row, textvariable=self.destination, bg="#22262e", fg="#e7e9ee", insertbackground="white", relief="flat", font=("Segoe UI", 10)).pack(side="left", fill="x", expand=True, ipady=8)
        self.button(row, "Examinar…", self.browse).pack(side="left", padx=(8, 0))
        self.label("Sin permisos de administrador.\nActualiza conservando tus proyectos y preferencias.\nGuarda tu trabajo y cierra Strata antes de continuar.", 10, "#a5aab5").pack(anchor="w", pady=10)
        style = ttk.Style(self.root); style.theme_use("clam")
        style.configure("Strata.Horizontal.TProgressbar", troughcolor="#242832", background="#8eafe0", bordercolor="#242832", lightcolor="#8eafe0", darkcolor="#8eafe0",thickness=4)
        track=tk.Frame(self.container,height=4,bg='#242832')
        track.pack(fill='x',pady=(18,12))
        ttk.Progressbar(track, variable=self.progress, maximum=100, style="Strata.Horizontal.TProgressbar").place(x=0,y=0,relwidth=1,relheight=1)
        self.status_label=tk.Label(self.container, textvariable=self.status, font=("Segoe UI", 10), bg="#14161a", fg="#b7c8e0", wraplength=480, anchor="w", justify="left")
        self.status_label.pack(fill="x", pady=(0, 18))
        self.install_button = self.button(self.actions, "Instalar / Actualizar", self.install); self.install_button.pack(side="left")
        self.button(self.actions, "Desinstalar", self.confirm_uninstall).pack(side="left", padx=8)
        self.button(self.actions, "Salir", self.close).pack(side="right")
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        def fit(event):
            if event.widget!=self.root:return
            if event.width<760:self.art.pack_forget()
            elif not self.art.winfo_manager():self.art.pack(side='left',fill='y',before=self.container)
            self.status_label.config(wraplength=max(200,self.container.winfo_width()-56))
        self.root.bind('<Configure>',fit)
        self.container.bind('<Configure>',lambda e:self.status_label.config(wraplength=max(200,e.width-56)))
        self.root.after(60, self.poll)
        if start_in_uninstall: self.root.after(150, self.confirm_uninstall)

    def label(self, text, size=12, color="#e7e9ee"):
        return tk.Label(self.container, text=text, font=("Segoe UI", size), bg="#14161a", fg=color, justify="left")

    def button(self, parent, text, action):
        button=tk.Button(parent, text=text, command=action, bg="#29384e", fg="#eef3fb", activebackground="#3a5071", activeforeground="white", relief="flat", borderwidth=0,highlightthickness=0,padx=12, pady=9, cursor="hand2", font=("Segoe UI", 10))
        button.bind('<Enter>',lambda e:button.configure(bg='#354c69'))
        button.bind('<Leave>',lambda e:button.configure(bg='#29384e'))
        return button

    def browse(self):
        if self.busy: return
        # Explorador dentro de la misma ventana, sin diálogos nativos blancos.
        panel = tk.Frame(self.container, bg="#1c2028", padx=12, pady=12)
        panel.place(relx=0, rely=.20, relwidth=1, relheight=.74)
        path = tk.StringVar(value=str(Path(self.destination.get()).parent))
        tk.Entry(panel, textvariable=path, bg="#29303b", fg="white", insertbackground="white", relief="flat").pack(fill="x", ipady=5)
        listing = tk.Listbox(panel, bg="#1c2028", fg="#dfe5ef", selectbackground="#374d6e", relief="flat", font=("Segoe UI", 10)); listing.pack(fill="both", expand=True, pady=8)
        children = []
        def show():
            try:
                folder = Path(path.get()).resolve()
                children[:] = [folder.parent] + sorted([p for p in folder.iterdir() if p.is_dir()], key=lambda p:p.name.lower())
                listing.delete(0, "end")
                for index, child in enumerate(children): listing.insert("end", ".." if index == 0 else child.name)
            except OSError as exc: self.status.set(str(exc))
        def enter(event=None):
            if listing.curselection(): path.set(str(children[listing.curselection()[0]])); show()
        def choose():
            chosen = Path(path.get()); self.destination.set(str(chosen if chosen.name.lower() == "strata" else chosen / "Strata")); panel.destroy()
        listing.bind("<Double-Button-1>", enter)
        row = tk.Frame(panel, bg="#1c2028"); row.pack(fill="x")
        self.button(row, "Ir a ruta", show).pack(side="left")
        self.button(row, "Elegir carpeta", choose).pack(side="left", padx=6)
        self.button(row, "Cancelar", panel.destroy).pack(side="right")
        show()

    def work(self, action):
        if self.busy: return
        self.busy = True; self.install_button.config(state="disabled"); self.progress.set(0)
        def run():
            try: self.events.put(("done", action()))
            except Exception as exc: self.events.put(("error", str(exc)))
        threading.Thread(target=run, daemon=True).start()

    def report(self, message): self.events.put(("progress", message))

    def install(self):
        destination = self.destination.get()
        self.work(lambda: install_strata(self.report, False, destination))

    def confirm_uninstall(self):
        if self.busy: return
        self.status.set("¿Desinstalar Strata? Revisa y respalda tus documentos guardados dentro de la carpeta de instalación antes de continuar.")
        self.install_button.config(text="Confirmar desinstalación", command=lambda: self.work(lambda: uninstall_strata(self.report)))

    def poll(self):
        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind == "progress":
                    self.status.set(value)
                    if "% ·" in value: self.progress.set(float(value.split("%")[0]))
                    elif self.progress.get() < 10: self.progress.set(self.progress.get() + 1)
                elif kind == "error":
                    self.busy = False; self.status.set("No se pudo completar: " + value)
                    self.install_button.config(state="normal", text="Reintentar instalación", command=self.install)
                else:
                    self.busy = False; self.progress.set(100)
                    if value:
                        dest, _ = value; self.status.set("100% · Strata está listo. Ya puedes abrirlo.")
                        self.install_button.config(state="normal", text="Abrir Strata", command=lambda d=dest: run_application(d / EXE_NAME))
                    else:
                        self.status.set("100% · Desinstalación completada.")
                        self.install_button.config(state="normal", text="Instalar Strata", command=self.install)
        except queue.Empty: pass
        self.root.after(60, self.poll)

    def close(self):
        if self.busy: self.status.set("Espera a que termine la operación antes de cerrar.")
        else: self.root.destroy()

    def run(self): self.root.mainloop()


if __name__ == "__main__":
    if "--quick-update" in sys.argv:
        index = sys.argv.index("--quick-update")
        print(json.dumps(quick_update(sys.argv[index + 1]), ensure_ascii=False))
        sys.exit(0)
    if "--self-test" in sys.argv:
        report = Path(sys.argv[sys.argv.index("--self-test") + 1]).resolve()
        try:
            verify_runtime(find_source_bundle(), report)
            sys.exit(0)
        except Exception as exc:
            report.write_text(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), encoding="utf-8")
            sys.exit(1)
    args = [a.lower() for a in sys.argv[1:]]
    is_silent = "--silent" in args or "--auto" in args
    is_uninstall = "--uninstall" in args or Path(sys.executable).name.lower()==UNINSTALLER_EXE_NAME.lower()
    is_quiet = "--quiet" in args
    do_launch = "--launch" in args

    if is_uninstall and is_quiet:
        uninstall_strata()
        sys.exit(0)

    if is_silent and not is_uninstall:
        dest, lnk = install_strata(launch_after=do_launch)
        print(f"Instalado en: {dest}")
        print(f"Acceso directo en: {lnk}")
        sys.exit(0)

    app = StrataInstallerWindow(start_in_uninstall=is_uninstall)
    app.run()
