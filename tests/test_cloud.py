"""Contratos de cuenta/nube sin contactar servicios ni enviar correos reales."""
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core.auth import AuthService, LocalAuthProvider, configured_provider
from core.auth_supabase import SupabaseAuthProvider
from core.cloud import CloudBackups


class CloudTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=ROOT / "build")
        self.provider = SupabaseAuthProvider("https://example.supabase.co", "sb_publishable_test", Path(self.temp.name))
        self.provider.authenticated_session = lambda: ({"id":"user-test"}, "private-access-token")
    def tearDown(self): self.temp.cleanup()

    def test_portable_public_connection_and_environment_override(self):
        directory = Path(self.temp.name)
        config = {"url":"https://example.supabase.co", "public_key":"sb_publishable_test",
                  "storage_bucket":"strata-projects", "google_enabled":False, "recovery_enabled":False}
        (directory / "core").mkdir()
        (directory / "core/conexion_nube.json").write_text(json.dumps(config))
        with patch("core.storage.BASE_DIR", directory), patch.dict(os.environ, {}, clear=True):
            provider = configured_provider()
            self.assertEqual(provider.bucket, "strata-projects")
            self.assertTrue(provider.capabilities()["cloud_backups"])
            self.assertFalse(provider.capabilities()["google"])
            self.assertFalse(provider.capabilities()["password_recovery"])
            with patch.dict(os.environ, {"STRATA_SUPABASE_URL":"https://other.supabase.co", "STRATA_SUPABASE_ANON_KEY":"sb_publishable_other"}):
                self.assertEqual(configured_provider().url, "https://other.supabase.co/auth/v1")
            config["public_key"]="sb_secret_forbidden"
            (directory / "conexion_nube.json").write_text(json.dumps(config))
            with self.assertRaises(ValueError): configured_provider()

    def test_portable_bucket_used_without_environment(self):
        self.provider.bucket="strata-projects"
        with patch.dict(os.environ, {}, clear=True):
            root, bucket, user, token = CloudBackups(self.provider)._context()
            self.assertEqual(bucket, "strata-projects")
            self.assertEqual(user["id"], "user-test")

    def test_local_capabilities_and_remote_recovery(self):
        service = AuthService(LocalAuthProvider(Path(self.temp.name)))
        capabilities = service.dispatch("capabilities", {})["capabilities"]
        self.assertFalse(capabilities["cloud_backups"])
        self.assertFalse(capabilities["google"])
        self.assertFalse(service.dispatch("recover", {"email":"a@example.test"})["ok"])
        self.provider._request = lambda *args, **kwargs: {}
        result = AuthService(self.provider).dispatch("recover", {"email":"a@example.test"})
        self.assertTrue(result["ok"])
        self.provider.pending={"nonce":"cancel-me"}
        self.assertTrue(AuthService(self.provider).dispatch("cancel",{})["ok"])
        self.assertIsNone(self.provider.pending)
        self.assertIn("Si la cuenta existe", result["message"])

    def test_private_upload_list_download(self):
        project = {"_file_path":"private-local-path", "document":{"title":"Mi libro", "sheets":[{"id":"one","pages":["Texto"]} ]}, "fichas":[]}
        requests = []
        def request(req, timeout):
            requests.append(req)
            if "/object/list/" in req.full_url:
                return io.BytesIO(json.dumps([{"name":"copy.strata","created_at":"2026-10-18","metadata":{"size":180}}]).encode())
            if "/authenticated/" in req.full_url: return io.BytesIO(json.dumps(project).encode())
            return io.BytesIO(b'{}')
        with patch.dict(os.environ, {"STRATA_SUPABASE_STORAGE_BUCKET":"strata-projects"}), patch("core.cloud.urlopen", side_effect=request):
            cloud = CloudBackups(self.provider)
            uploaded = cloud.upload(project)
            self.assertTrue(uploaded["ok"])
            self.assertIn("/object/strata-projects/user-test/", requests[0].full_url)
            self.assertNotIn("private-local-path", requests[0].data.decode())
            self.assertEqual(requests[0].get_header("Authorization"), "Bearer private-access-token")
            self.assertEqual(cloud.list()["copies"][0]["name"], "copy.strata")
            self.assertEqual(json.loads(requests[1].data)["prefix"], "user-test/")
            self.assertEqual(cloud.download("copy.strata")["project"]["document"]["title"], "Mi libro")
            self.assertIn("/object/authenticated/strata-projects/user-test/copy.strata", requests[2].full_url)
            with self.assertRaises(ValueError): cloud.download("../other-user/copy.strata")
            with self.assertRaises(ValueError): cloud.upload({"document":[]})
        with patch.dict(os.environ, {"STRATA_SUPABASE_STORAGE_BUCKET":""}):
            with self.assertRaises(ValueError): CloudBackups(self.provider).list()


if __name__ == "__main__": unittest.main()
