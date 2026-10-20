"""Seguridad Beta 2 sin cuentas ni peticiones externas."""
import json
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core import licenses
from core.auth import LocalAuthProvider
from core.auth_supabase import SupabaseAuthProvider
from core.updater import apply_update


class Beta2Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=ROOT / 'build')
        self.root = Path(self.tmp.name)
        self.key = Ed25519PrivateKey.generate()
        self.public = self.root / 'public.json'
        self.public.write_text(json.dumps({'public_key': licenses.encode(self.key.public_key().public_bytes_raw())}))
        self.patch = patch.object(licenses, 'PUBLIC_KEY_FILE', self.public)
        self.patch.start()

    def tearDown(self):
        self.patch.stop()
        self.tmp.cleanup()

    def serial(self, **overrides):
        claims = dict(v=1, id='test-only', plan='pro', subject=licenses.subject('a@example.test'), expires=int(time.time())+3600)
        claims.update(overrides)
        raw = json.dumps(claims).encode()
        return 'STRATA-PRO-' + licenses.encode(raw) + '.' + licenses.encode(self.key.sign(raw))

    def test_bound_signed_license_persists_and_reverifies(self):
        user = {'email': 'a@example.test', 'plan': 'free'}
        serial = self.serial()
        self.assertEqual(licenses.activate_license(self.root, user, serial)['plan'], 'pro')
        self.assertEqual(licenses.apply_license(self.root, user)['plan_source'], 'license')
        self.assertNotIn(serial, licenses.license_path(self.root, user).read_text())
        self.public.write_text('{}')
        self.assertEqual(licenses.apply_license(self.root, user)['plan'], 'free')

    def test_invalid_expired_wrong_email_and_modified_payload(self):
        serial = self.serial()
        for value, email in [(self.serial(expires=1), 'a@example.test'), (serial, 'other@example.test'),
                             ('STRATA-PRO-'+licenses.encode(b'{"plan":"pro"}')+'.'+serial.split('.')[1], 'a@example.test'),
                             ('STRATA-PRO-invalid', 'a@example.test')]:
            with self.subTest(value=value[:24]):
                with self.assertRaises(ValueError): licenses.verify_license(value, email)

    def test_server_profile_controls_pro(self):
        provider = SupabaseAuthProvider('https://example.supabase.co', 'sb_publishable_test', self.root)
        plan = ['free']
        def request(endpoint, data=None, token=None, method=None):
            if endpoint == '/user': return {'id':'test','email':'a@example.test','user_metadata':{'plan':'pro'}}
            if endpoint.startswith('/profiles?'): return [{'plan': plan[0]}]
            return {'access_token':'test','refresh_token':'test','expires_in':3600}
        provider._request = request
        self.assertEqual(provider.login('a@example.test','test-password')['plan'], 'free')
        plan[0] = 'pro'
        self.assertEqual(provider.current_user()['plan'], 'pro')
        plan[0] = 'invalid'
        self.assertEqual(provider.current_user()['plan'], 'free')

    def test_large_avatar_migrates_out_of_jwt_before_reading_plan(self):
        from core.secrets import write_secret, read_secret
        provider=SupabaseAuthProvider('https://example.supabase.co','sb_publishable_test',self.root)
        avatar='data:image/png;base64,'+'A'*43000
        remote={'id':'avatar-user','email':'a@example.test','user_metadata':{'avatar_url':avatar}}
        write_secret(provider.path,{'access_token':'oversized','refresh_token':'refresh','expires_at':time.time()+3600})
        calls=[]
        def request(endpoint,data=None,token=None,method=None):
            calls.append((endpoint,data,token))
            if endpoint=='/user':
                if method=='PUT': remote['user_metadata'].update(data['data'])
                return remote
            if endpoint.startswith('/token?'): return {'access_token':'small','refresh_token':'new-refresh','expires_in':3600}
            if endpoint.startswith('/profiles?'):
                self.assertEqual(token,'small')
                return [{'plan':'pro'}]
            raise AssertionError(endpoint)
        provider._request=request
        user=provider.current_user()
        self.assertEqual(user['plan'],'pro')
        self.assertTrue(user['plan_verified'])
        self.assertEqual(user['avatar'],avatar)
        self.assertEqual(remote['user_metadata']['avatar_url'],'')
        self.assertEqual(read_secret(provider.path)['access_token'],'small')
        self.assertNotIn(avatar,provider._avatar_path('avatar-user').read_text())
        provider.update_profile('Nombre nuevo',avatar)
        for endpoint,data,token in calls:
            if data and endpoint=='/user': self.assertNotIn(avatar,json.dumps(data))

    def test_plan_connection_failure_is_not_reported_as_verified_free(self):
        from core.secrets import write_secret
        provider=SupabaseAuthProvider('https://example.supabase.co','sb_publishable_test',self.root)
        write_secret(provider.path,{'access_token':'test','refresh_token':'test','expires_at':time.time()+3600})
        def request(endpoint,data=None,token=None,method=None):
            if endpoint=='/user': return {'id':'test','email':'a@example.test'}
            raise ValueError('REST unavailable')
        provider._request=request
        user=provider.current_user()
        self.assertFalse(user['plan_verified'])
        self.assertIn('verificar',user['plan_error'])
        self.assertEqual(user['plan'],'free')

    def test_local_account_ignores_editable_plan(self):
        self.assertEqual(LocalAuthProvider._public({'id':'x','name':'Test','email':'a@example.test','plan':'pro'})['plan'], 'free')

    def test_old_runtime_rejects_incompatible_quick_update_before_changes(self):
        source, dest = self.root/'source', self.root/'installed'
        for folder in (source/'core', source/'ui', dest): folder.mkdir(parents=True, exist_ok=True)
        for path in ('main.py','core/__init__.py','core/licenses.py','ui/index.html'): (source/path).write_text('')
        (dest/'Strata.exe').write_bytes(b'test')
        (dest/'bootstrap.json').write_text('{"protocol":1}')
        with self.assertRaisesRegex(ValueError, 'Instalar_Strata_10'): apply_update(source,dest)
        self.assertFalse((dest/'main.py').exists())

    def test_apa_block_docx_indent_and_no_private_annotations(self):
        import zipfile
        from xml.etree import ElementTree as ET
        from core.docx_export import write_docx
        path=self.root/'apa.docx'
        write_docx(path,'<blockquote class="apa-block">CITA VISIBLE</blockquote><p data-export="ignore">NOTA PRIVADA</p>')
        with zipfile.ZipFile(path) as archive:
            document=ET.fromstring(archive.read('word/document.xml'))
        ns='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
        self.assertIn('CITA VISIBLE',''.join(document.itertext()))
        self.assertNotIn('NOTA PRIVADA',''.join(document.itertext()))
        self.assertTrue(any(n.get(ns+'left')=='720' for n in document.iter(ns+'ind')))


if __name__ == '__main__': unittest.main()
