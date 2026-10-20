"""Cuentas y conector remoto; no envía peticiones ni crea cuentas externas."""
import json
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlencode, urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core.auth import AuthService, LocalAuthProvider
from core.auth_supabase import SupabaseAuthProvider
from core.secrets import read_secret, write_secret
from core.layout import normalize_layout


class AccountTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="auth_qa_", dir=ROOT / "build")
        self.root = Path(self.temp.name).resolve()
        assert self.root.is_relative_to((ROOT / "build").resolve())

    def tearDown(self):
        self.temp.cleanup()

    def test_local_registration_persistence_logout_and_plan(self):
        provider = LocalAuthProvider(self.root)
        service = AuthService(provider)
        password = "Contraseña de prueba 123"
        result = service.dispatch("register", {"name": "Autora", "email": "autora@example.test", "password": password, "plan": "pro"})
        self.assertTrue(result["ok"])
        self.assertEqual(result["user"]["plan"], "free")
        self.assertNotIn("password_hash", result["user"])
        self.assertNotIn(password, (self.root / "accounts.json").read_text())
        self.assertEqual(LocalAuthProvider(self.root).current_user()["name"], "Autora")
        session = read_secret(self.root / "session.json")
        if sys.platform == "win32":
            self.assertNotIn(session["token"], (self.root / "session.json").read_text())
        self.assertFalse(service.dispatch("login", {"email": "autora@example.test", "password": "incorrecta"})["ok"])
        self.assertFalse(service.dispatch("register", {"email": "autora@example.test", "password": password})["ok"])
        self.assertTrue(service.dispatch("logout", {})["ok"])
        self.assertIsNone(provider.current_user())
        self.assertTrue(service.dispatch("login", {"email": "AUTORA@example.test", "password": password})["ok"])
        service.dispatch("profile", {"name": "Nueva autora", "avatar": ""})
        self.assertEqual(provider.current_user()["name"], "Nueva autora")

    def test_supabase_session_and_server_verified_plan(self):
        provider = SupabaseAuthProvider("https://example.supabase.co", "sb_publishable_test", self.root)
        calls = []
        user = {"id": "user-test", "email": "a@example.test", "user_metadata": {"name": "A", "strata_plan": "pro"}, "app_metadata": {}}
        def request(endpoint, data=None, token=None, method=None):
            calls.append((endpoint, data, token))
            if endpoint == "/user": return user
            return {"access_token": "test-access", "refresh_token": "test-refresh", "expires_in": 3600}
        provider._request = request
        logged_in = provider.login("a@example.test", "example-password")
        self.assertEqual(logged_in["plan"], "free")
        self.assertTrue(any(call[0] == "/user" for call in calls))
        user["app_metadata"]["strata_plan"] = "pro"
        self.assertEqual(provider.current_user()["plan"], "free")
        write_secret(provider.path, {"access_token": "expired", "refresh_token": "test-refresh", "expires_at": time.time() - 60})
        provider.current_user()
        self.assertTrue(any(call[0] == "/token?grant_type=refresh_token" for call in calls))
        provider.logout()
        self.assertIsNone(provider.current_user())

    def test_google_pkce_nonce_expiry_and_single_use(self):
        provider = SupabaseAuthProvider("https://example.supabase.co", "sb_publishable_test", self.root)
        provider.callback_url = "http://127.0.0.1:8123/auth/callback"
        with patch("core.auth_supabase.webbrowser.open", return_value=True) as browser:
            self.assertTrue(provider.google_login()["pending"])
            query = parse_qs(urlparse(browser.call_args.args[0]).query)
            self.assertEqual(query["code_challenge_method"], ["s256"])
            self.assertNotIn(provider.pending["verifier"], browser.call_args.args[0])
        with self.assertRaises(ValueError):
            provider.oauth_callback("flow=incorrect&code=test")
        verifier, nonce = provider.pending["verifier"], provider.pending["nonce"]
        calls = []
        def request(endpoint, data=None, token=None, method=None):
            calls.append((endpoint, data))
            if endpoint == "/user": return {"id": "user-test", "email": "a@example.test"}
            return {"access_token": "test-access", "refresh_token": "test-refresh", "expires_in": 3600}
        provider._request = request
        self.assertTrue(provider.oauth_callback(urlencode({"flow": nonce, "code": "test-code"}))["ok"])
        self.assertEqual(calls[0][1]["code_verifier"], verifier)
        with self.assertRaises(ValueError):
            provider.oauth_callback(urlencode({"flow": nonce, "code": "test-code"}))

    def test_layout_clamps_invalid_measurements(self):
        layout = normalize_layout({"paper": "letter", "orientation": "landscape", "preset": "apa", "margins": {"top": "NaN", "left": 999}, "columns": 2})
        self.assertEqual(layout["width_mm"], 279.4)
        self.assertEqual(layout["margins"]["top"], 2.54)
        self.assertEqual(layout["margins"]["left"], 8)
        self.assertEqual(layout["columns"], 2)

    def test_account_api_rejects_external_origins(self):
        from core.server import make_handler
        from http.server import ThreadingHTTPServer
        from urllib.request import Request, urlopen
        from urllib.error import HTTPError
        import threading
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(lambda action, body: {}, LocalAuthProvider(self.root)))
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        url = f"http://127.0.0.1:{server.server_port}/api/auth/status"
        try:
            with urlopen(Request(url, data=b'{}', headers={"Content-Type":"application/json"}), timeout=5) as response:
                self.assertTrue(json.load(response)["ok"])
            with self.assertRaises(HTTPError) as rejected:
                urlopen(Request(url, data=b'{}', headers={"Content-Type":"application/json", "Origin":"https://external.example"}), timeout=5)
            self.assertEqual(rejected.exception.code, 403)
            rejected.exception.close()
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
