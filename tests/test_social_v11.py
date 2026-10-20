import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from core import storage
from core.social import SocialService


class SocialTests(unittest.TestCase):
    def test_local_contacts_duo_nudges_and_persistence(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]/'build') as folder:
            with patch.object(storage,'BASE_DIR',Path(folder)):
                service=SocialService(object())
                first=service.call('snapshot',{})
                self.assertRegex(first['code'],r'^STRATA-[A-F0-9]{8}$')
                code='STRATA-12345678'
                for _ in range(2):service.call('add',{'code':code,'name':'Contacto'})
                self.assertEqual(len(service.call('snapshot',{})['friends']),1)
                service.call('edit',{'code':code,'xp':250,'active':True,'tier':'regular'})
                result=service.call('duo',{'code':code,'today_active':True})
                self.assertEqual(result['friends'][0]['duo_days'],1)
                result=service.call('snapshot',{'today_active':True})
                self.assertEqual(result['friends'][0]['duo_days'],1)
                self.assertEqual(len(service.call('nudge',{'code':code})['notifications']),1)
                self.assertEqual(SocialService(object()).call('snapshot',{})['code'],first['code'])
                self.assertEqual(service.call('remove',{'code':code})['friends'],[])
                with self.assertRaises(ValueError):service.call('add',{'code':'correo@example.com'})
                with self.assertRaises(ValueError):service.call('add',{'code':first['code']})
                with self.assertRaises(ValueError):service.call('invalid',{})

    def test_cloud_requires_authenticated_provider(self):
        with self.assertRaises(ValueError):SocialService(object()).cloud({})

if __name__=='__main__':unittest.main()
