"""Regresión: un PATH de herramientas no puede contaminar las DLL del paquete."""
from pathlib import Path
import os
import sys
import unittest
import runpy
import tempfile
import io
import zipfile
import hashlib
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from empaquetar_strata import build_environment


class PackagingTests(unittest.TestCase):
    @unittest.skipUnless(sys.platform == 'win32', 'Puente ABI de Python en Windows')
    def test_missing_abi_dll_uses_verified_official_archive(self):
        helper = runpy.run_path(str(ROOT / 'packaging/windows_python_abi.py'))
        resolve = helper['runtime_binaries']
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, 'w') as bundle:
            bundle.writestr('python3t.dll', b'official-dll-fixture')
        payload = archive.getvalue()
        namespace = resolve.__globals__
        with tempfile.TemporaryDirectory(dir=ROOT / 'build') as directory:
            root = Path(directory)
            with patch.dict(namespace, SHA256=hashlib.sha256(payload).hexdigest(),
                            urlopen=lambda *args, **kwargs: io.BytesIO(payload)):
                entries = resolve(root / 'python', root / 'cache')
            self.assertEqual(Path(entries[0][0]).read_bytes(), b'official-dll-fixture')
            with patch.dict(namespace, urlopen=lambda *args, **kwargs: io.BytesIO(b'corrupt')):
                with self.assertRaises(ValueError):
                    resolve(root / 'python', root / 'corrupt-cache')
            self.assertFalse((root / 'corrupt-cache').exists())

    @unittest.skipUnless(sys.platform == 'win32', 'Búsqueda de DLL en Windows')
    def test_build_removes_third_party_dll_search_paths(self):
        with patch.dict(os.environ, {"PATH": r"C:\tools\poppler;C:\tools\libheif", "QT_PLUGIN_PATH": r"C:\otherQt", "PYTHONPATH": r"C:\otherPython"}):
            env = build_environment()
        self.assertNotIn("poppler", env["PATH"])
        self.assertNotIn("libheif", env["PATH"])
        self.assertNotIn("QT_PLUGIN_PATH", env)
        self.assertNotIn("PYTHONPATH", env)
        self.assertIn("System32", env["PATH"])

    @unittest.skipUnless(sys.platform == 'win32' and (ROOT / 'dist/Strata/_internal/PySide6/Qt6Core.dll').is_file(), 'Requiere compilación Windows')
    def test_qt_icu_imports_are_resolvable(self):
        import pefile
        core = ROOT / "dist/Strata/_internal/PySide6/Qt6Core.dll"
        image = pefile.PE(str(core), fast_load=True)
        image.parse_data_directories(directories=[pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_IMPORT"]])
        bundle = ROOT / "dist/Strata/_internal"
        for entry in image.DIRECTORY_ENTRY_IMPORT:
            if entry.dll.lower() not in (b"icuuc.dll", b"icuin.dll", b"icu.dll"):
                continue
            name = entry.dll.decode()
            candidates = [bundle / "PySide6" / name, bundle / name, Path(os.environ["SystemRoot"]) / "System32" / name]
            dependency = next(path for path in candidates if path.exists())
            exports = {symbol.name for symbol in pefile.PE(str(dependency)).DIRECTORY_ENTRY_EXPORT.symbols}
            missing = [symbol.name.decode() for symbol in entry.imports if symbol.name and symbol.name not in exports]
            self.assertFalse(missing, f"{dependency} no exporta: {missing}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
