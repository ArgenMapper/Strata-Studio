"""Compilar en el sistema de destino: python compilar_multiplataforma.py.

No es un compilador cruzado. Cada resultado supera --self-test antes de empaquetarse.
"""
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

from core import APP_VERSION

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'release'


def run(*args, **options):
    subprocess.run(list(map(str, args)), cwd=ROOT, check=True, **options)


def copy_product(destination):
    from preparar_github import source_files
    for relative in source_files():
        if relative.parts[0] not in ('ui', 'core') and relative.as_posix() != 'main.py':
            continue
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / relative, target)
    (destination / 'bootstrap.json').write_text(json.dumps({
        'protocol': 1, 'version': APP_VERSION, 'runtime_features': ['ed25519'],
    }), encoding='utf-8')


def icon_images():
    from PySide6.QtWidgets import QApplication
    from PySide6.QtSvg import QSvgRenderer
    from PySide6.QtGui import QImage, QPainter
    from PySide6.QtCore import Qt
    app = QApplication.instance() or QApplication([])
    renderer = QSvgRenderer(str(ROOT / 'ui/logo.svg'))
    if not renderer.isValid():
        raise RuntimeError('El icono SVG no es válido.')
    iconset = ROOT / 'build/Strata.iconset'
    iconset.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 128, 256, 512):
        for scale in (1, 2):
            image = QImage(size * scale, size * scale, QImage.Format.Format_ARGB32)
            image.fill(Qt.GlobalColor.transparent)
            painter = QPainter(image)
            renderer.render(painter)
            painter.end()
            suffix = '@2x' if scale == 2 else ''
            if not image.save(str(iconset / f'icon_{size}x{size}{suffix}.png')):
                raise RuntimeError('No se pudo generar el icono.')
    shutil.copy2(iconset / 'icon_256x256@2x.png', ROOT / 'build/strata.png')
    if sys.platform == 'darwin':
        run('iconutil', '-c', 'icns', iconset, '-o', ROOT / 'build/Strata.icns')
    return app


def verify(executable, label):
    report = ROOT / 'build' / f'runtime-{label}.json'
    report.unlink(missing_ok=True)
    run(executable, '--self-test', report, timeout=90)
    result = json.loads(report.read_text(encoding='utf-8'))
    if not result.get('ok') or result.get('app_version') != APP_VERSION:
        raise RuntimeError(f'El paquete no completó la prueba de arranque: {report}')


def build():
    OUTPUT.mkdir(exist_ok=True)
    (ROOT / 'build').mkdir(exist_ok=True)
    if sys.platform == 'win32':
        from empaquetar_strata import build as windows_build
        windows_build()
        artifact = OUTPUT / f'Strata-{APP_VERSION}-windows-x64.exe'
        shutil.copy2(ROOT / 'dist/Instalar_Strata_11.exe', artifact)
        os_name, arch, minimum = 'windows', 'x64', 'Windows 10 / 11 de 64 bits'
    elif sys.platform in ('darwin', 'linux'):
        if sys.platform == 'linux' and platform.machine().lower() not in ('x86_64', 'amd64'):
            raise RuntimeError('Este flujo Linux genera paquetes x86_64. ARM requiere otra compilación.')
        app = icon_images()  # Conservar QApplication hasta terminar el renderizado.
        run(sys.executable, '-m', 'PyInstaller', '--clean', '--noconfirm', 'Strata.spec')
        if sys.platform == 'darwin':
            bundle = ROOT / 'dist/Strata.app'
            product = bundle / 'Contents/Resources/strata'
            product.mkdir(parents=True, exist_ok=True)
            copy_product(product)
            executable = bundle / 'Contents/MacOS/Strata'
            # Fallar si alguna biblioteca/executable Mach-O solo contiene una arquitectura.
            for path in bundle.rglob('*'):
                if not path.is_file() or path.is_symlink():
                    continue
                description = subprocess.check_output(['file', '-b', str(path)], text=True)
                if 'Mach-O' in description:
                    architectures = subprocess.check_output(['lipo', '-archs', str(path)], text=True).split()
                    if not {'arm64', 'x86_64'}.issubset(architectures):
                        raise RuntimeError(f'Biblioteca sin universal2: {path}')
            # El código externo se copia ANTES de sellar la aplicación.
            identity = os.environ.get('STRATA_CODESIGN_IDENTITY') or '-'
            sign = ['codesign', '--force', '--sign', identity, '--entitlements',
                    str(ROOT / 'packaging/macos-entitlements.plist')]
            if identity != '-':
                sign += ['--options', 'runtime', '--timestamp']
            run(*sign, bundle)
            run('codesign', '--verify', '--deep', '--strict', bundle)
            verify(executable, 'macos')
            stage = ROOT / 'build/dmg-content'
            # Carpeta exclusiva de este proceso: nunca contiene documentos del usuario.
            if stage.exists():
                if not stage.resolve().is_relative_to((ROOT / 'build').resolve()):
                    raise ValueError('Ruta de empaquetado inválida.')
                shutil.rmtree(stage)
            stage.mkdir()
            run('ditto', bundle, stage / 'Strata.app')
            (stage / 'Applications').symlink_to('/Applications')
            artifact = OUTPUT / f'Strata-{APP_VERSION}-macos-universal.dmg'
            artifact.unlink(missing_ok=True)
            run('hdiutil', 'create', '-volname', 'Strata Studio', '-srcfolder', stage,
                '-ov', '-format', 'UDZO', artifact)
            # Opcional: requiere credenciales reales de Apple Developer en el runner.
            profile = os.environ.get('STRATA_NOTARY_PROFILE')
            if profile:
                if identity == '-':
                    raise RuntimeError('La notarización requiere Developer ID, no una firma ad hoc.')
                run('xcrun', 'notarytool', 'submit', artifact, '--keychain-profile', profile, '--wait')
                run('xcrun', 'stapler', 'staple', artifact)
            os_name, arch, minimum = 'macos', 'universal2', 'macOS 14 o posterior · Intel y Apple Silicon'
        else:
            product = ROOT / 'dist/Strata'
            copy_product(product)
            shutil.copy2(ROOT / 'packaging/install-linux.sh', product / 'instalar.sh')
            (product / 'instalar.sh').chmod(0o755)
            shutil.copy2(ROOT / 'packaging/strata.desktop', product / 'strata.desktop')
            shutil.copy2(ROOT / 'packaging/strata-mime.xml', product / 'strata-mime.xml')
            shutil.copy2(ROOT / 'build/strata.png', product / 'strata.png')
            verify(product / 'Strata', 'linux')
            artifact = OUTPUT / f'Strata-{APP_VERSION}-linux-x86_64.tar.gz'
            with tarfile.open(artifact, 'w:gz', dereference=False) as archive:
                archive.add(product, arcname='Strata')
            os_name, arch, minimum = 'linux', 'x86_64', 'Ubuntu 24.04 o compatible reciente · x86_64'
    else:
        raise RuntimeError(f'Sistema no soportado: {sys.platform}')
    with artifact.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    metadata = {'version': APP_VERSION, 'os': os_name, 'arch': arch, 'minimum': minimum,
                'file': artifact.name, 'bytes': artifact.stat().st_size, 'sha256': digest,
                'notarized': bool(sys.platform == 'darwin' and os.environ.get('STRATA_NOTARY_PROFILE'))}
    (OUTPUT / f'{os_name}.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Paquete verificado: {artifact}', flush=True)


if __name__ == '__main__':
    build()
