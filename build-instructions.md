# Fixed DMG Build Instructions for Wallet Generation

This guide will help you fix the wallet generation issue in your BlockAI Pure MM application and rebuild the DMG installer.

## Problem Diagnosis

The issue you're experiencing (wallet generation working when running Python directly but failing in the DMG) is typically caused by:

1. Missing dependencies in the PyInstaller bundle
2. Path and permission issues in the packaged application
3. Improper error handling masking the root cause

## Solution Steps

### Step 1: Replace the Launcher Script

Replace your current `improved_launcher.py` with the enhanced version provided. This new version:

- Adds comprehensive logging
- Properly handles paths in macOS app bundles
- Verifies write permissions for key directories
- Checks for critical dependencies
- Provides better error handling

```bash
# Back up your original file first
mv improved_launcher.py improved_launcher.py.backup
# Copy the new enhanced file
# (Use the newly downloaded file)
```

### Step 2: Update the Spec File

Replace your `blockai_mac.spec` file with the enhanced version provided. This new spec file:

- Includes additional dependencies needed for wallet generation
- Adds proper permissions in the app bundle info.plist
- Ensures all binary modules are included

```bash
# Back up your original file first
mv blockai_mac.spec blockai_mac.spec.backup
# Copy the new enhanced file
# (Use the newly downloaded file)
```

### Step 3: Rebuild the Application

Now rebuild the application with the enhanced files:

```bash
# Make sure you're in the application directory
cd /path/to/your/project

# Activate your virtual environment (if you're using one)
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows

# Rebuild using PyInstaller with the new spec file
pyinstaller blockai_mac.spec
```

### Step 4: Create the DMG

You can create the DMG using either:

#### Option 1: Using the build_mac_app.py script

```bash
python build_mac_app.py --dmg
```

#### Option 2: Manual DMG creation

```bash
hdiutil create -volname "BlockAI Pure MM" -srcfolder "dist/BlockAI Pure MM.app" -ov -format UDZO BlockAI_Pure_MM.dmg
```

### Step 5: Testing the Fixed Application

To ensure the wallet generation works properly:

1. Install the app from the new DMG
2. Launch the application
3. Navigate to Wallet Management
4. Select "Solana" from the blockchain dropdown
5. Try generating wallets again

## Debugging Tips

If you still experience issues:

1. Run the app from the terminal to see error output:
   ```bash
   open -a "BlockAI Pure MM"
   ```

2. Check Console.app for any application errors

3. Look for permissions issues:
   ```bash
   ls -la /Applications/BlockAI\ Pure\ MM.app/Contents/Resources/static/downloads
   ```

4. Temporarily enable console output:
   Edit your spec file to set `console=True` to see output when the app runs

## Advanced Fixes (If Still Not Working)

If the above steps don't resolve the issue, try these additional steps:

### Fix 1: Manually Include Binary Modules

Create a `hook-app.py` file in your project directory:

```python
# hook-app.py
from PyInstaller.utils.hooks import collect_all

datas, binaries, hiddenimports = collect_all('nacl')
datas2, binaries2, hiddenimports2 = collect_all('base58')
datas3, binaries3, hiddenimports3 = collect_all('web3')

datas += datas2 + datas3
binaries += binaries2 + binaries3
hiddenimports += hiddenimports2 + hiddenimports3
```

Then update your spec file to include:

```python
hookspath=['./'],
```

### Fix 2: Direct Binary Inclusion

If specific binary modules are causing issues, you can directly include them in your spec file:

```python
binaries=[
    ('/path/to/your/venv/lib/python3.x/site-packages/nacl/_sodium.abi3.so', 'nacl'),
    # Add other problematic binaries here
],
```

Replace `/path/to/your/venv/` with your actual virtualenv path.

### Fix 3: Create a Runtime Test Script

Add a diagnostic script to verify the environment inside the packaged app:

```python
# diagnostic.py
import sys
import os
import importlib

def test_import(module_name):
    try:
        module = importlib.import_module(module_name)
        print(f"✅ Successfully imported {module_name}")
        return True
    except Exception as e:
        print(f"❌ Failed to import {module_name}: {e}")
        return False

def test_directory(path):
    try:
        os.makedirs(path, exist_ok=True)
        test_file = os.path.join(path, 'test_write.txt')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        print(f"✅ Successfully wrote to {path}")
        return True
    except Exception as e:
        print(f"❌ Failed to write to {path}: {e}")
        return False

print(f"Python version: {sys.version}")
print(f"Executable path: {sys.executable}")
print(f"Working directory: {os.getcwd()}")
print(f"sys.path: {sys.path}")

modules_to_test = ['nacl', 'base58', 'web3', 'pandas', 'openpyxl']
for module in modules_to_test:
    test_import(module)

dirs_to_test = ['static/downloads', 'temp']
for directory in dirs_to_test:
    test_directory(directory)
```

Include this in your application and add a route to run it:

```python
@app.route('/diagnostic')
def run_diagnostic():
    import diagnostic
    return "Diagnostic complete. Check console for results."
```

## Final Notes

- Keep backups of original files before making changes
- If you continue to face issues, consider distributing your app as a Python package or using a different packaging method
- For debugging, temporarily enable the console output in the spec file
- Consider using a CI/CD pipeline for more consistent builds
