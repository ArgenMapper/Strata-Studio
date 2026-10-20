# -*- mode: python ; coding: utf-8 -*-


from pathlib import Path
import os
import sys
from PyInstaller.utils.hooks import collect_submodules
is_mac = sys.platform == 'darwin'
target_arch = 'universal2' if is_mac else None
extra_imports = collect_submodules('keyring.backends') if sys.platform != 'win32' else []
core_data=[(str(p),'core/'+str(p.parent.relative_to('core'))) for p in Path('core').rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='generar_licencias_admin.py' and (p.suffix=='.py' or p.name in ('license_public.json','conexion_nube.json'))]
a = Analysis(
    ['bootstrap.py'],
    pathex=[],
    binaries=[],
    datas=[('ui', 'ui'), *core_data, ('app_icon.ico', '.'), ('qtwebengine_dictionaries', 'qtwebengine_dictionaries')],
    hiddenimports=["main", "core.updater", "PySide6.QtTextToSpeech",'PySide6.QtSvg','cryptography.hazmat.primitives.asymmetric.ed25519', 'cryptography.fernet', *extra_imports],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['core.generar_licencias_admin','matplotlib','scipy','numpy','pandas','tkinter','unittest','pydoc','test',
              'PySide6.QtQuick','PySide6.QtQml','PySide6.QtQuickWidgets','PySide6.QtQuickControls2','PySide6.Qt3DCore',
              'PySide6.QtDesigner','PySide6.QtTest'],
    noarchive=False,
    optimize=0,
)
# WebEngineWidgets necesita las DLL de Qt detectadas por dependencia, pero no
# utiliza el árbol de componentes QML, Designer ni herramientas de pruebas.
a.datas = [entry for entry in a.datas if not entry[0].replace('\\','/').startswith(('PySide6/qml/','PySide6/translations/qt_help_'))]
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Strata',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=target_arch,
    codesign_identity=os.environ.get('STRATA_CODESIGN_IDENTITY') or None,
    entitlements_file='packaging/macos-entitlements.plist' if is_mac else None,
    icon=['build/Strata.icns'] if is_mac else ['app_icon.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='Strata',
)
if is_mac:
    app = BUNDLE(
        coll, name='Strata.app', icon='build/Strata.icns',
        bundle_identifier='studio.strata.editor',
        version='11.0.0', target_arch=target_arch,
        codesign_identity=os.environ.get('STRATA_CODESIGN_IDENTITY') or None,
        entitlements_file='packaging/macos-entitlements.plist',
        info_plist={
            'CFBundleShortVersionString': '11.0.0',
            'NSHighResolutionCapable': True,
            'LSMinimumSystemVersion': '14.0',
            'NSHumanReadableCopyright': 'Strata Studio',
            'CFBundleDocumentTypes': [{
                'CFBundleTypeName': 'Proyecto Strata', 'CFBundleTypeRole': 'Editor',
                'LSHandlerRank': 'Owner', 'CFBundleTypeExtensions': ['strata'],
            }],
        },
    )
