# -*- mode: python ; coding: utf-8 -*-
import os  # Added for determining OS

block_cipher = None

a = Analysis(
    ['improved_launcher.py'],  # Changed from app.py to improved_launcher.py
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
        ('modules', 'modules'),
        ('solana_wallet_generator.py', '.'),  # Include our dedicated wallet generator
    ],
    hiddenimports=[
        'flask',
        'pandas',
        'web3',
        'base58',
        'nacl',
        'nacl.signing',
        'nacl._sodium',
        'nacl.bindings',
        'cairosvg',
        'io',
        'PIL',
        'PIL.Image',
        'socket',  # Added for improved launcher
        'atexit',  # Added for improved launcher
        'fcntl',   # Added for file locking
        'threading',
        'webbrowser',
        'traceback',
        'json',
        'shutil',
        're',
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
        'logging',
        'jinja2.ext',  # Flask template extensions
    ],
    hookspath=['.'],  # Look for hooks in the current directory
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# Add hooks for problematic packages
from PyInstaller.utils.hooks import collect_all

# Collect all necessary dependencies for problematic packages
for package in ['nacl', 'base58', 'web3', 'cryptography']:
    try:
        package_datas, package_binaries, package_hiddenimports = collect_all(package)
        a.datas.extend(package_datas)
        a.binaries.extend(package_binaries)
        a.hiddenimports.extend(package_hiddenimports)
    except Exception as e:
        print(f"Warning: Error collecting dependencies for {package}: {str(e)}")

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
    console=True,  # Set to True for debugging, change to False for production
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

# For macOS
if 'darwin' in os.sys.platform:
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
            'LSUIElement': False,  # Set to True for background app, False for dock icon
            # Add file permissions
            'NSAppTransportSecurity': {
                'NSAllowsArbitraryLoads': True
            },
            'NSAllowsLocalNetworking': True,
        },
    )