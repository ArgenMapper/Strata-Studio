"""El actualizador reemplaza código, preserva datos y rechaza paquetes inválidos."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.updater import apply_update
from core.auth import AuthService, LocalAuthProvider


class UpdateTests(unittest.TestCase):
    def test_transaction_and_personal_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); source = root / "source"; dest = root / "installed"
            for p in (source / "ui", source / "core", dest / "ui", dest / "core"): p.mkdir(parents=True)
            (source / "main.py").write_text('print("9.5")')
            (source / "core/__init__.py").write_text('APP_VERSION="9.5"')
            (source / "ui/index.html").write_text("New UI")
            (dest / "Strata.exe").touch(); (dest / "bootstrap.json").write_text('{"protocol":1}')
            (dest / "ui/obsolete.js").touch()
            (dest / "config_usuario.json").write_text("personal")
            (dest / "my.strata").write_text("manuscript")
            result = apply_update(source, dest)
            self.assertEqual(result["files"], 3)
            self.assertEqual((dest / "ui/index.html").read_text(), "New UI")
            self.assertFalse((dest / "ui/obsolete.js").exists())
            self.assertEqual((dest / "my.strata").read_text(), "manuscript")
            self.assertEqual((dest / "config_usuario.json").read_text(), "personal")
            (source / "main.py").write_text("invalid python(")
            with self.assertRaises(SyntaxError): apply_update(source, dest)
            self.assertEqual((dest / "main.py").read_text(), 'print("9.5")')

    def test_remember_session(self):
        with tempfile.TemporaryDirectory() as temp:
            provider = LocalAuthProvider(Path(temp)); service = AuthService(provider)
            result = service.dispatch("register", {"name":"Test", "email":"test@example.com", "password":"tencharacters123", "remember":False})
            self.assertTrue(result["ok"])
            self.assertIsNotNone(service.dispatch("status", {})["user"])
            restarted = AuthService(LocalAuthProvider(Path(temp)))
            self.assertIsNone(restarted.dispatch("status", {})["user"])
            self.assertTrue(restarted.dispatch("login", {"email":"test@example.com", "password":"tencharacters123", "remember":True})["ok"])
            self.assertIsNotNone(AuthService(LocalAuthProvider(Path(temp))).dispatch("status", {})["user"])


if __name__ == "__main__": unittest.main()
