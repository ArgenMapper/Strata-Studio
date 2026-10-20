"""Compilar cryptography actual para Intel + Apple Silicon, sin versiones antiguas.

Ejecutar con el Python universal2 oficial en un Mac con Xcode y rustup.
Maturin compila ambas arquitecturas; OpenSSL se compila estáticamente desde
el crate vendored y CFFI enlaza con libffi del SDK de Apple.
"""
import hashlib
import importlib
import json
import os
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path
from urllib.request import urlopen

VERSION = '50.0.2'
ROOT = Path(__file__).resolve().parents[1]


def run(*args, env=None, **options):
    subprocess.run(list(map(str, args)), check=True, env=env, **options)


def prepare():
    if sys.platform != 'darwin':
        raise RuntimeError('Este preparador se ejecuta únicamente en macOS.')
    build = ROOT / 'build'
    build.mkdir(exist_ok=True)
    environment = os.environ.copy()
    environment.update(ARCHFLAGS='-arch x86_64 -arch arm64', MACOSX_DEPLOYMENT_TARGET='14.0',
                       _PYTHON_HOST_PLATFORM='macosx-14.0-universal2', PKG_CONFIG='/usr/bin/false')
    for key in ('OPENSSL_DIR', 'OPENSSL_LIB_DIR', 'OPENSSL_INCLUDE_DIR', 'OPENSSL_NO_VENDOR'):
        environment.pop(key, None)
    environment['SDKROOT'] = subprocess.check_output(['xcrun', '--sdk', 'macosx', '--show-sdk-path'], text=True).strip()
    run('rustup', 'target', 'add', 'x86_64-apple-darwin', 'aarch64-apple-darwin')
    # CFFI debe ser universal también. Evitar una rueda thin o la libffi de Homebrew.
    run(sys.executable, '-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel', 'maturin>=1.14.1,<2')
    run(sys.executable, '-m', 'pip', 'install', '--no-cache-dir', '--force-reinstall',
        '--no-binary=cffi', 'cffi>=2.1', env=environment)
    with urlopen(f'https://pypi.org/pypi/cryptography/{VERSION}/json', timeout=60) as response:
        metadata = json.load(response)
    source = next(item for item in metadata['urls'] if item['packagetype'] == 'sdist')
    if not source['url'].startswith('https://files.pythonhosted.org/'):
        raise ValueError('Origen de cryptography no reconocido.')
    with urlopen(source['url'], timeout=60) as response:
        payload = response.read(8 * 1024 * 1024 + 1)
    digest = hashlib.sha256(payload).hexdigest()
    if digest != source['digests']['sha256']:
        raise ValueError('El código fuente de cryptography no coincide con el SHA-256 publicado por PyPI.')
    with tempfile.TemporaryDirectory(prefix='macos-crypto-', dir=build) as directory:
        directory = Path(directory)
        archive = directory / 'source.tar.gz'
        archive.write_bytes(payload)
        with tarfile.open(archive) as bundle:
            bundle.extractall(directory / 'source', filter='data')
        project = next((directory / 'source').glob('cryptography-*'))
        manifest = project / 'src/rust/Cargo.toml'
        # Añadir al lock únicamente el soporte vendored, antes del build --locked.
        run('cargo', 'metadata', '--format-version', '1', '--manifest-path', manifest,
            '--features', 'openssl/vendored', env=environment, stdout=subprocess.DEVNULL)
        run(sys.executable, '-m', 'pip', 'install', '--no-deps', '--no-build-isolation',
            '--force-reinstall', '--no-cache-dir',
            '--config-settings=maturin.build-args=--target universal2-apple-darwin --features openssl/vendored',
            project, env=environment)
        (build / 'macos-crypto-Cargo.lock').write_bytes((project / 'Cargo.lock').read_bytes())
    importlib.invalidate_caches()
    libraries = [importlib.import_module(name).__file__ for name in
                 ('_cffi_backend', 'cryptography.hazmat.bindings._rust')]
    for library in libraries:
        architectures = subprocess.check_output(['lipo', '-archs', library], text=True).split()
        if not {'x86_64', 'arm64'}.issubset(architectures):
            raise RuntimeError(f'La biblioteca de cifrado no es universal2: {library}')
    report = {'version': VERSION, 'source_sha256': digest, 'architectures': ['x86_64', 'arm64'],
              'openssl': 'vendored-static', 'verified': True}
    (build / 'macos-crypto.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('Cifrado universal2 verificado: Intel + Apple Silicon.', flush=True)


if __name__ == '__main__':
    prepare()
