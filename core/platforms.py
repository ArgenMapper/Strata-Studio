"""Rutas y operaciones de escritorio independientes del sistema operativo."""
import os
import sys
from pathlib import Path

SOURCE_ROOT = Path(__file__).resolve().parent.parent


def configure_tls():
    """Python embebido en Mac no puede depender del Python del compilador."""
    if sys.platform == 'darwin':
        import ssl
        if not ssl.get_default_verify_paths().cafile and not os.environ.get('SSL_CERT_DIR'):
            import certifi
            os.environ.setdefault('SSL_CERT_FILE', certifi.where())


def application_root(*, platform_name=None, executable=None, frozen=None):
    platform_name = platform_name or sys.platform
    executable = Path(executable or sys.executable).resolve()
    frozen = getattr(sys, 'frozen', False) if frozen is None else frozen
    if not frozen:
        return SOURCE_ROOT
    if platform_name == 'darwin':
        for parent in executable.parents:
            if parent.suffix == '.app':
                return parent / 'Contents' / 'Resources' / 'strata'
    return executable.parent


def data_directory(*, platform_name=None, home=None, environment=None, app_root=None):
    platform_name = platform_name or sys.platform
    home = Path(home or Path.home())
    env = os.environ if environment is None else environment
    if platform_name == 'win32':
        # Mantener las rutas existentes: no mover proyectos ni sesiones Windows.
        return Path(app_root or application_root())
    if platform_name == 'darwin':
        return home / 'Library' / 'Application Support' / 'Strata'
    xdg = Path(env.get('XDG_DATA_HOME', ''))
    return (xdg if xdg.is_absolute() else home / '.local' / 'share') / 'strata'


def reveal_command(path, platform_name=None):
    path = Path(path).resolve()
    platform_name = platform_name or sys.platform
    if platform_name == 'win32':
        return ['explorer.exe', '/select,', str(path)]
    if platform_name == 'darwin':
        return ['open', '-R', str(path)]
    return ['xdg-open', str(path.parent)]


def immutable_bundle(path, platform_name=None, environment=None):
    platform_name = platform_name or sys.platform
    env = os.environ if environment is None else environment
    path = Path(path)
    return (platform_name == 'darwin' and any(p.suffix == '.app' for p in (path, *path.parents))) or bool(env.get('APPIMAGE'))
