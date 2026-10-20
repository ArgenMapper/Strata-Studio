"""Exporta únicamente fuentes distribuibles. No inicializa Git ni publica nada."""
import base64
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ROOT_FILES = (
    'main.py', 'bootstrap.py', 'Strata.spec', 'app_icon.ico', '.gitignore', '.gitattributes',
    'requirements.txt', 'requirements-build.txt', 'empaquetar_strata.py',
    'instalar_strata.py', 'compilar_multiplataforma.py', 'preparar_github.py',
    'README.md', 'DISTRIBUCION.md',
)


def source_files(root=ROOT):
    root = Path(root).resolve()
    files = [Path(name) for name in ROOT_FILES if (root / name).is_file()]
    policies = {
        'ui': {'.js', '.css', '.html', '.svg'},
        'core': {'.py'},
        'packaging': {'.py', '.sh', '.plist', '.desktop', '.xml'},
        '.github/workflows': {'.yml', '.yaml'},
        'downloads': {'.html', '.css', '.js', '.json'},
        'tests': {'.py'},
    }
    for folder, suffixes in policies.items():
        for path in (root / folder).rglob('*'):
            if folder == 'tests' and not path.name.startswith('test_'):
                continue
            if path.is_file() and path.suffix in suffixes and '__pycache__' not in path.parts and path.name != 'generar_licencias_admin.py':
                files.append(path.relative_to(root))
    for name in ('core/license_public.json', 'core/conexion_nube.json'):
        if (root / name).is_file():
            files.append(Path(name))
    for path in (root / 'qtwebengine_dictionaries').glob('*'):
        if path.is_file() and (path.suffix == '.bdic' or path.name in ('COPYING', 'COPYING.LESSER', 'LICENSE', 'README_es_ES.txt', 'SOURCE.txt')):
            files.append(path.relative_to(root))
    for relative in files:
        path = root / relative
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise ValueError(f'No se admiten enlaces: {relative}')
    return sorted(set(files))


def validate_public_connection(path):
    """La clave publishable/anon está destinada al cliente; jamás service_role."""
    if not path.is_file():
        return
    config = json.loads(path.read_text(encoding='utf-8'))
    allowed = {'url', 'public_key', 'google_enabled', 'recovery_enabled', 'storage_bucket', 'redirect_url', 'providers', 'google'}
    if set(config) - allowed:
        raise ValueError('Revisa conexion_nube.json: contiene campos no previstos para distribución.')
    key = config.get('public_key', '')
    if key.startswith('sb_publishable_'):
        return
    try:
        payload = key.split('.')[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
    except (ValueError, IndexError):
        raise ValueError('La conexión de nube no contiene una clave pública reconocida.') from None
    if claims.get('role') != 'anon':
        raise ValueError('Solo se permite incluir una clave pública anon de Supabase.')


def export():
    from core import APP_VERSION
    validate_public_connection(ROOT / 'core/conexion_nube.json')
    target = ROOT / 'build' / f'Strata-fuentes-{APP_VERSION}.zip'
    target.parent.mkdir(exist_ok=True)
    files = source_files()
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for relative in files:
            archive.write(ROOT / relative, relative.as_posix())
    print(f'Fuentes preparadas ({len(files)} archivos): {target}')
    print('No incluye proyectos, cuentas, sesiones ni claves de administración.')
    return target


if __name__ == '__main__':
    export()
