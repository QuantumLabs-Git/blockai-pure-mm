# hook-app.py - Enhanced version
from PyInstaller.utils.hooks import collect_all, copy_metadata

# Collect all binary dependencies for problematic packages
packages = [
    'nacl',
    'base58',
    'web3',
    'cryptography',
    'pandas',
    'PIL',
    'cairosvg',
    'flask',
    'openpyxl',
    'xlsxwriter'
]

datas = []
binaries = []
hiddenimports = []

# Process each package to collect all required files
for package in packages:
    try:
        print(f"Collecting dependencies for {package}...")
        package_datas, package_binaries, package_hiddenimports = collect_all(package)
        datas.extend(package_datas)
        binaries.extend(package_binaries)
        hiddenimports.extend(package_hiddenimports)
        print(f"Successfully collected {len(package_datas)} data files, {len(package_binaries)} binaries, and {len(package_hiddenimports)} imports for {package}")
    except Exception as e:
        print(f"Warning: Error collecting dependencies for {package}: {str(e)}")

# Add metadata for packages that need it
metadata_packages = [
    'web3',
    'cryptography',
    'pandas',
    'flask',
    'eth_account',
    'eth_keys',
    'openpyxl'
]

for package in metadata_packages:
    try:
        print(f"Copying metadata for {package}...")
        meta_datas = copy_metadata(package)
        datas.extend(meta_datas)
        print(f"Successfully copied metadata for {package}: {len(meta_datas)} files")
    except Exception as e:
        print(f"Warning: Could not copy metadata for {package}: {str(e)}")

# Add additional well-known hidden imports that might be missed
additional_hidden_imports = [
    'nacl._sodium',
    'nacl.bindings',
    'nacl.encoding',
    'eth_account',
    'eth_utils',
    'eth_keys',
    'json',
    'fcntl',
    'secrets',
    'hashlib',
    'logging',
    'jinja2.ext',  # Flask template extensions
    'numpy',
    'csv',
    're',
    'webbrowser',
    'shutil',
    'threading',
    'traceback'
]

hiddenimports.extend(additional_hidden_imports)
print(f"Added {len(additional_hidden_imports)} additional hidden imports")

# Explicitly add solana_wallet_generator.py to data files
datas.append(('solana_wallet_generator.py', '.'))
print("Added solana_wallet_generator.py to datas")

# Final summary
print(f"Total data files: {len(datas)}")
print(f"Total binaries: {len(binaries)}")
print(f"Total hidden imports: {len(hiddenimports)}")