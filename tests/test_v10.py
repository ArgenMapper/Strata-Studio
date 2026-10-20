import sys,tempfile,unittest,zipfile
from unittest.mock import patch
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from core.window_geometry import fit_window
if sys.platform == 'win32':
    from instalar_strata import cleanup_packaging_artifacts,copy_uninstaller_binary
from core import storage

class DesktopTests(unittest.TestCase):
    def test_theme_reset_does_not_resurrect_removed_colors(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'build') as folder:
            with patch.object(storage,'CONFIG_FILE',Path(folder)/'config.json'):
                storage.save_config({'custom_theme':{'accent':'#e4c020','paper':'#ffffff'}})
                storage.save_config({'custom_theme':{'accent':'#88aabb'}})
                self.assertEqual(storage.load_config()['custom_theme'],{'accent':'#88aabb'})
                storage.save_config({'custom_theme':{}})
                self.assertEqual(storage.load_config()['custom_theme'],{})

    def test_geometry_clamps_oversized_offscreen_and_corrupt_settings(self):
        for saved in ({'w':1920,'h':1080,'x':3000,'y':-300},{'w':'bad','h':None},{'w':30,'h':20},{}):
            x,y,w,h,mw,mh=fit_window(saved,(0,0,1366,728))
            self.assertGreaterEqual(x,0);self.assertGreaterEqual(y,0)
            self.assertLessEqual(x+w,1366);self.assertLessEqual(y+h,728)
            self.assertGreaterEqual(w,mw);self.assertGreaterEqual(h,mh)
        x,y,w,h,*_=fit_window({'x':9000},(-1280,0,1280,680))
        self.assertGreaterEqual(x,-1280);self.assertLessEqual(x+w,0)

    @unittest.skipUnless(sys.platform == 'win32', 'Mantenimiento del instalador Windows')
    def test_cleanup_only_identifiable_runtime_archives_and_small_uninstaller(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'build') as folder:
            root=Path(folder);(root/'_internal').mkdir()
            for path,entry in [(root/'strata_bundle.zip','Strata.exe'),(root/'_internal/strata_bundle.zip','manuscrito.txt'),(root/'_internal/base_library.zip','encodings.py')]:
                with zipfile.ZipFile(path,'w') as z:z.writestr(entry,'fixture')
            cleanup_packaging_artifacts(root)
            self.assertFalse((root/'strata_bundle.zip').exists())
            self.assertTrue((root/'_internal/strata_bundle.zip').exists())
            self.assertTrue((root/'_internal/base_library.zip').exists())
            (root/'Desinstalar_Strata.exe').write_bytes(b'tiny-maintenance')
            self.assertEqual(copy_uninstaller_binary(root).read_bytes(),b'tiny-maintenance')

if __name__=='__main__':unittest.main()
