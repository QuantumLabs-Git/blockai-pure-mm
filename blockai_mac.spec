# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['improved_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
        ('modules', 'modules'),
    ],
    hiddenimports=[
        'flask',
        'pandas',
        'web3',
        'base58',
        'nacl',
        'nacl.signing',
        'cairosvg',
        'io',
        'PIL',
        'PIL.Image',
        'socket',
        'atexit',
        'signal',
        # Additional dependencies for wallet generation
        'eth_account',
        'eth_keys',
        'eth_utils',
        'hexbytes',
        'cryptography',
        'openpyxl',
        'xlsxwriter',
        'numpy',
        'hashlib',
        'csv',
        'base64',
        'secrets',  # For secure random generation
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='BlockAI Pure MM',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Keep True for debugging
    disable_windowed_traceback=False,
    argv_emulation=True,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='static/img/blockai-logo-large.png',
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='BlockAI Pure MM',
)
app = BUNDLE(
    coll,
    name='BlockAI Pure MM.app',
    icon='static/img/blockai-logo-large.png',
    bundle_identifier='com.blockai.puremm',
    info_plist={
        'NSHighResolutionCapable': 'True',
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleVersion': '1.0.0',
        'NSPrincipalClass': 'NSApplication',
        'NSAppleScriptEnabled': False,
        'LSUIElement': False,
        # Add file permissions
        'NSAppTransportSecurity': {
            'NSAllowsArbitraryLoads': True
        },
        'NSCalendarsUsageDescription': 'This app needs access to your calendars.',
        'NSAllowsLocalNetworking': True,
    },
)