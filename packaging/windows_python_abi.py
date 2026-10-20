"""Incluye el puente ABI de Python 3.15 que necesitan las ruedas abi3t.

Algunos Python de actions/setup-python omiten python3t.dll. Si falta, se toma
únicamente del paquete embebible oficial de la MISMA versión, verificado por SHA.
No se cambia el Python del equipo ni se descargan DLL de sitios de terceros.
"""
import hashlib
import io
import sys
import zipfile
from pathlib import Path
from urllib.request import urlopen

VERSION = (3, 15, 0)
URL = 'https://www.python.org/ftp/python/3.15.0/python-3.15.0-embed-amd64.zip'
SHA256 = 'a6999bcbcbe56f937159ef79c2630260eca99f65f7860bc5cd20430324079a44'


def runtime_binaries(runtime_dir=None, cache_dir=None):
    if sys.platform != 'win32':
        return []
    library = Path(runtime_dir or sys.base_prefix) / 'python3t.dll'
    if library.is_file():
        return [(str(library), '.')]
    if sys.version_info[:3] != VERSION or sys.maxsize <= 2**32:
        raise RuntimeError('Falta python3t.dll. Usa el instalador oficial de tu versión de Python x64; no mezcles DLL de versiones distintas.')
    with urlopen(URL, timeout=60) as response:
        payload = response.read(24 * 1024 * 1024 + 1)
    if hashlib.sha256(payload).hexdigest() != SHA256:
        raise ValueError('El paquete oficial de Python no coincide con su SHA-256. Se canceló la compilación.')
    folder = Path(cache_dir or 'build/python-runtime-dlls')
    folder.mkdir(parents=True, exist_ok=True)
    library = folder / 'python3t.dll'
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        library.write_bytes(archive.read('python3t.dll'))
    print('Incluyendo python3t.dll del paquete oficial verificado de Python 3.15.0.', flush=True)
    return [(str(library.resolve()), '.')]
