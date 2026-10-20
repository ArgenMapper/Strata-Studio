"""Rutas nativas, llavero simulado y exportación sin datos del usuario."""
import base64
import json
import sys
import tempfile
import unittest
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core import platforms, secrets, storage
from core.auth import configured_provider
from core.auth_supabase import SupabaseAuthProvider
from core.updater import apply_update
from preparar_github import source_files, validate_public_connection


class MemoryKeyring:
    def __init__(self):
        self.values = {}

    def get_password(self, service, account):
        return self.values.get((service, account))

    def set_password(self, service, account, value):
        self.values[service, account] = value

    def delete_password(self, service, account):
        self.values.pop((service, account), None)


class PlatformTests(unittest.TestCase):
    def setUp(self):
        (ROOT / 'build').mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=ROOT / 'build')
        self.root = Path(self.temp.name)

    def tearDown(self):
        secrets._volatile.clear()
        self.temp.cleanup()

    def test_user_data_routes_and_windows_compatibility(self):
        self.assertEqual(platforms.data_directory(platform_name='win32', app_root=self.root), self.root)
        self.assertEqual(platforms.data_directory(platform_name='darwin', home=self.root), self.root / 'Library/Application Support/Strata')
        self.assertEqual(platforms.data_directory(platform_name='linux', home=self.root, environment={}), self.root / '.local/share/strata')
        self.assertEqual(platforms.data_directory(platform_name='linux', home=self.root, environment={'XDG_DATA_HOME':'relative'}), self.root / '.local/share/strata')
        self.assertEqual(platforms.data_directory(platform_name='linux', home=self.root, environment={'XDG_DATA_HOME':str(self.root / 'xdg')}), self.root / 'xdg/strata')

    def test_macos_https_uses_bundled_ca_when_build_python_is_absent(self):
        import os
        import ssl
        certifi = SimpleNamespace(where=lambda:'/bundle/cacert.pem')
        with patch.object(platforms.sys, 'platform', 'darwin'), patch.dict(sys.modules, {'certifi':certifi}), patch.object(ssl, 'get_default_verify_paths', return_value=SimpleNamespace(cafile=None)), patch.dict(os.environ, {}, clear=True):
            platforms.configure_tls()
            self.assertEqual(os.environ['SSL_CERT_FILE'], '/bundle/cacert.pem')

    def test_macos_bundle_resources_and_native_reveal(self):
        app = self.root / 'Strata.app'
        self.assertEqual(platforms.application_root(platform_name='darwin', frozen=True, executable=app / 'Contents/MacOS/Strata'), app / 'Contents/Resources/strata')
        path = self.root / 'Mi manuscrito.strata'
        self.assertEqual(platforms.reveal_command(path, 'darwin'), ['open', '-R', str(path)])
        self.assertEqual(platforms.reveal_command(path, 'linux'), ['xdg-open', str(path.parent)])
        self.assertEqual(platforms.reveal_command(path, 'win32'), ['explorer.exe', '/select,', str(path)])

    def test_immutable_applications_reject_code_updates(self):
        dest = self.root / 'Strata.app/Contents/Resources/strata'
        with patch.object(platforms.sys, 'platform', 'darwin'):
            with self.assertRaisesRegex(ValueError, 'nuevo paquete'):
                apply_update(self.root / 'source', dest)
        self.assertTrue(platforms.immutable_bundle(self.root, platform_name='linux', environment={'APPIMAGE':'/app/Strata.AppImage'}))
        self.assertFalse(platforms.immutable_bundle(self.root, platform_name='linux', environment={}))

    def test_keyring_encryption_survives_memory_reset_and_logout(self):
        path = self.root / 'session.json'
        vault = MemoryKeyring()
        with patch.object(secrets.sys, 'platform', 'darwin'), patch.object(secrets, '_keyring', return_value=vault):
            secrets.write_secret(path, {'refresh_token':'private-token'})
            self.assertNotIn('private-token', path.read_text())
            self.assertTrue(secrets.session_is_persistent(path))
            secrets._volatile.clear()
            self.assertEqual(secrets.read_secret(path)['refresh_token'], 'private-token')
            secrets.delete_secret(path)
            self.assertEqual(vault.values, {})
            self.assertFalse(path.exists())

    def test_unavailable_keyring_never_saves_plaintext(self):
        path = self.root / 'session.json'
        with patch.object(secrets.sys, 'platform', 'linux'), patch.object(secrets, '_keyring', side_effect=RuntimeError('locked')):
            secrets.write_secret(path, {'token':'sensitive'})
            self.assertNotIn('sensitive', path.read_text())
            self.assertFalse(secrets.session_is_persistent(path))
            self.assertEqual(secrets.read_secret(path), {'token':'sensitive'})
            secrets._volatile.clear()  # Simula otro proceso: obliga a iniciar sesión.
            self.assertEqual(secrets.read_secret(path), {})

    def test_encrypted_secret_with_missing_key_fails_closed(self):
        path = self.root / 'session.json'
        vault = MemoryKeyring()
        with patch.object(secrets.sys, 'platform', 'linux'), patch.object(secrets, '_keyring', return_value=vault):
            secrets.write_secret(path, {'token':'private'})
            vault.values.clear()
            self.assertEqual(secrets.read_secret(path), {})

    def test_source_export_uses_allowlist(self):
        for name in ('main.py','ui/app.js','core/storage.py','core/generar_licencias_admin.py',
                     'core/private-key.json','config_usuario.json','my.strata','cuentas/session.json',
                     'admin_privado/key.json','dist/Strata.exe'):
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('fixture')
        actual = {p.as_posix() for p in source_files(self.root)}
        self.assertEqual(actual, {'main.py','ui/app.js','core/storage.py'})

    def test_supabase_export_rejects_privileged_key(self):
        path = self.root / 'connection.json'
        def jwt(role):
            claims = base64.urlsafe_b64encode(json.dumps({'role':role}).encode()).decode().rstrip('=')
            return 'header.' + claims + '.signature'
        path.write_text(json.dumps({'public_key':jwt('service_role')}))
        with self.assertRaises(ValueError):
            validate_public_connection(path)
        path.write_text(json.dumps({'public_key':jwt('anon')}))
        validate_public_connection(path)

    def test_bundled_cloud_configuration_separate_from_user_data(self):
        bundle = self.root / 'bundle'
        bundle.mkdir()
        (bundle / 'conexion_nube.json').write_text(json.dumps({'url':'https://example.supabase.co', 'public_key':'public-test'}))
        with patch.object(storage, 'BASE_DIR', self.root / 'user-data'), patch.object(storage, 'resource_path', return_value=bundle), patch.dict('os.environ', {'STRATA_SUPABASE_URL':'', 'STRATA_SUPABASE_ANON_KEY':''}):
            self.assertIsInstance(configured_provider(), SupabaseAuthProvider)


if __name__ == '__main__':
    unittest.main()
