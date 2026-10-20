"""Compilar cryptography actual para Intel + Apple Silicon, sin versiones antiguas.

Ejecutar con el Python universal2 oficial en un Mac con Xcode y rustup.
Maturin compila Intel con OpenSSL estático; se combina con la rueda ARM64
oficial de la misma versión. CFFI enlaza con libffi del SDK de Apple.
"""
import hashlib
import importlib
import importlib.metadata
import io
import json
import os
import platform
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path
from urllib.request import urlopen

VERSION = '50.0.2'
ROOT = Path(__file__).resolve().parents[1]


def run(*args, env=None, **options):
    subprocess.run(list(map(str, args)), check=True, env=env, **options)


def prepare():
    if sys.platform != 'darwin' or platform.machine() != 'x86_64':
        raise RuntimeError('Este preparador requiere el runner macOS Intel del flujo.')
    build = ROOT / 'build'
    build.mkdir(exist_ok=True)
    environment = os.environ.copy()
    environment.update(ARCHFLAGS='-arch x86_64 -arch arm64', MACOSX_DEPLOYMENT_TARGET='14.0',
                       _PYTHON_HOST_PLATFORM='macosx-14.0-universal2', PKG_CONFIG='/usr/bin/false')
    for key in ('OPENSSL_DIR', 'OPENSSL_LIB_DIR', 'OPENSSL_INCLUDE_DIR', 'OPENSSL_NO_VENDOR'):
        environment.pop(key, None)
    environment['SDKROOT'] = subprocess.check_output(['xcrun', '--sdk', 'macosx', '--show-sdk-path'], text=True).strip()
    # CFFI debe ser universal también. Evitar una rueda thin o la libffi de Homebrew.
    run(sys.executable, '-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel', 'maturin>=1.14.1,<2')
    run(sys.executable, '-m', 'pip', 'install', '--no-cache-dir', '--force-reinstall',
        '--no-binary=cffi', 'cffi>=2.1', env=environment)
    with urlopen(f'https://pypi.org/pypi/cryptography/{VERSION}/json', timeout=60) as response:
        metadata = json.load(response)
    source = next(item for item in metadata['urls'] if item['packagetype'] == 'sdist')
    arm_wheel = next(item for item in metadata['urls'] if item['filename'] ==
                     f'cryptography-{VERSION}-cp315-abi3.abi3t-macosx_11_0_arm64.whl')
    def download(item):
        if not item['url'].startswith('https://files.pythonhosted.org/'):
            raise ValueError('Origen de cryptography no reconocido.')
        with urlopen(item['url'], timeout=60) as response:
            payload = response.read(16 * 1024 * 1024 + 1)
        if hashlib.sha256(payload).hexdigest() != item['digests']['sha256']:
            raise ValueError('cryptography no coincide con el SHA-256 publicado por PyPI.')
        return payload
    payload = download(source)
    digest = source['digests']['sha256']
    with tempfile.TemporaryDirectory(prefix='macos-crypto-', dir=build) as directory:
        directory = Path(directory)
        archive = directory / 'source.tar.gz'
        archive.write_bytes(payload)
        with tarfile.open(archive) as bundle:
            bundle.extractall(directory / 'source', filter='data')
        project = next((directory / 'source').glob('cryptography-*'))
        native_env = environment.copy()
        for key in ('ARCHFLAGS', '_PYTHON_HOST_PLATFORM', 'PKG_CONFIG'):
            native_env.pop(key, None)
        native_env['OPENSSL_DIR'] = subprocess.check_output(['brew', '--prefix', 'openssl@3'], text=True).strip()
        native_env['OPENSSL_STATIC'] = '1'
        run(sys.executable, '-m', 'pip', 'install', '--no-deps', '--no-build-isolation',
            '--force-reinstall', '--no-cache-dir',
            '--config-settings=maturin.build-args=--target x86_64-apple-darwin',
            project, env=native_env)
        (build / 'macos-crypto-Cargo.lock').write_bytes((project / 'Cargo.lock').read_bytes())
        distribution = importlib.metadata.distribution('cryptography')
        native_library = next(Path(distribution.locate_file(path)) for path in distribution.files
                              if str(path).startswith('cryptography/hazmat/bindings/_rust') and str(path).endswith('.so'))
        linked = subprocess.check_output(['otool', '-L', native_library], text=True)
        if any('libcrypto' in line or 'libssl' in line for line in linked.splitlines()[1:]):
            raise RuntimeError('OpenSSL no quedó enlazado estáticamente en el cifrado Intel.')
        with zipfile.ZipFile(io.BytesIO(download(arm_wheel))) as wheel:
            name = next(name for name in wheel.namelist()
                        if name.startswith('cryptography/hazmat/bindings/_rust') and name.endswith('.so'))
            arm_library = directory / 'arm64.so'
            arm_library.write_bytes(wheel.read(name))
        combined = directory / 'universal.so'
        run('lipo', '-create', native_library, arm_library, '-output', combined)
        combined.chmod(native_library.stat().st_mode)
        shutil.copyfile(combined, native_library)
        run('codesign', '--force', '--sign', '-', native_library)
    importlib.invalidate_caches()
    libraries = [importlib.import_module(name).__file__ for name in
                 ('_cffi_backend', 'cryptography.hazmat.bindings._rust')]
    for library in libraries:
        architectures = subprocess.check_output(['lipo', '-archs', library], text=True).split()
        if not {'x86_64', 'arm64'}.issubset(architectures):
            raise RuntimeError(f'La biblioteca de cifrado no es universal2: {library}')
    report = {'version': VERSION, 'source_sha256': digest, 'arm64_wheel_sha256': arm_wheel['digests']['sha256'],
              'architectures': ['x86_64', 'arm64'], 'openssl': 'static', 'verified': True}
    (build / 'macos-crypto.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('Cifrado universal2 verificado: Intel + Apple Silicon.', flush=True)


if __name__ == '__main__':
    prepare()
