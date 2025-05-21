#!/usr/bin/env python3
"""
Improved build script for packaging BlockAI Pure MM as a macOS application.
This script addresses common issues with Mac distribution:
- Creates a proper app bundle structure
- Includes all dependencies
- Creates a launcher that handles Flask correctly
- Supports both Intel and Apple Silicon Macs
"""
import os
import sys
import subprocess
import shutil
import plistlib
import platform
import argparse
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a shell command and print output"""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    return True

def build_mac_app(create_dmg=False, use_pyinstaller=True):
    print("Building BlockAI Pure MM for macOS...")
    
    # Determine system architecture
    arch = platform.machine()
    is_arm = arch == 'arm64'
    arch_display = "Apple Silicon" if is_arm else "Intel"
    print(f"Building for {arch_display} Mac ({arch})")
    
    # Set app details
    app_name = "BlockAI Pure MM"
    app_dir = Path(f"{app_name}.app")
    dist_dir = Path("dist")
    build_dir = Path("build")
    
    # Clean up existing builds
    for path in [app_dir, dist_dir, build_dir]:
        if path.exists():
            print(f"Removing existing {path}")
            shutil.rmtree(path)
    
    if use_pyinstaller:
        # Use PyInstaller method
        print("Building with PyInstaller...")
        
        # Create an improved launcher script
        with open("improved_launcher.py", "w") as f:
            f.write('''#!/usr/bin/env python3
import os
import sys
import webbrowser
import threading
import time
import socket
import atexit
import signal

# Import Flask app from app.py
from app import app

def find_free_port():
    """Find a free port to run the Flask app"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('localhost', 0))
        return s.getsockname()[1]

def open_browser(port):
    """Open the browser after a short delay"""
    time.sleep(1.5)
    url = f'http://127.0.0.1:{port}/'
    print(f"Opening browser at {url}")
    webbrowser.open(url)

def cleanup():
    """Clean up function to run when app is closing"""
    print("Shutting down BlockAI Pure MM...")

# Register cleanup function
atexit.register(cleanup)

# Handle SIGINT (Ctrl+C) gracefully
def signal_handler(sig, frame):
    print('BlockAI Pure MM is shutting down...')
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

if __name__ == '__main__':
    # Ensure working directory is correct
    bundle_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
    if getattr(sys, 'frozen', False):
        # Running as a bundle
        # Move up from MacOS directory to Resources
        os.chdir(os.path.join(bundle_dir, '..', 'Resources'))
    else:
        os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Ensure directories exist
    os.makedirs('static/downloads', exist_ok=True)
    os.makedirs('static/img', exist_ok=True)
    
    # Generate logos if needed
    if not os.path.exists('static/img/blockai-logo.png'):
        try:
            print("Generating logos...")
            import generate_logos_patched
        except Exception as e:
            print(f"Warning: Could not generate logos: {e}")
    
    # Find an available port
    port = find_free_port()
    
    # Start the browser opening thread
    threading.Thread(target=open_browser, args=(port,)).start()
    
    # Set Flask to run on the selected port
    print(f"Starting Flask server on port {port}...")
    app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)
''')
        
        # Create PyInstaller command
        pyinstaller_cmd = [
            "pyinstaller",
            "--noconfirm",
            "--clean",
            "--name", app_name,
            "--icon", "static/img/blockai-logo-large.png",
            "--add-data", "templates:templates",
            "--add-data", "static:static",
            "--add-data", "modules:modules",
            "--hidden-import", "flask",
            "--hidden-import", "pandas",
            "--hidden-import", "web3",
            "--hidden-import", "base58",
            "--hidden-import", "nacl.signing",
            "--hidden-import", "cairosvg",
            "--hidden-import", "PIL.Image",
            "--hidden-import", "socket",
            "--hidden-import", "atexit",
            "--hidden-import", "signal",
            "--windowed",  # Use --windowed instead of --console
            "improved_launcher.py"
        ]
        
        # Run PyInstaller
        success = run_command(pyinstaller_cmd)
        if not success:
            print("PyInstaller build failed!")
            return False
        
        # Check if build was successful
        built_app = dist_dir / f"{app_name}.app"
        if not built_app.exists():
            print(f"Error: Expected app bundle at {built_app} not found!")
            return False
        
        # Move app to current directory
        shutil.move(built_app, app_dir)
        print(f"App bundle created at {app_dir}")
        
    else:
        # Manual app bundle creation method
        print("Building app bundle manually...")
        
        # Create app bundle structure
        contents_dir = app_dir / "Contents"
        macos_dir = contents_dir / "MacOS"
        resources_dir = contents_dir / "Resources"
        frameworks_dir = contents_dir / "Frameworks"
        
        for dir_path in [macos_dir, resources_dir, frameworks_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # Create Info.plist
        info_plist = {
            'CFBundleName': app_name,
            'CFBundleDisplayName': app_name,
            'CFBundleIdentifier': 'com.blockai.puremm',
            'CFBundleVersion': '1.0.0',
            'CFBundleShortVersionString': '1.0.0',
            'CFBundlePackageType': 'APPL',
            'CFBundleSignature': '????',
            'CFBundleExecutable': 'launcher.sh',
            'CFBundleIconFile': 'AppIcon.icns',
            'NSHighResolutionCapable': True,
            'NSPrincipalClass': 'NSApplication',
            'LSMinimumSystemVersion': '10.14.0',  # Minimum macOS version
            'LSApplicationCategoryType': 'public.app-category.finance',
            'LSUIElement': False,  # Show in dock
        }
        
        with open(contents_dir / "Info.plist", 'wb') as f:
            plistlib.dump(info_plist, f)
        
        # Create launcher script
        with open(macos_dir / "launcher.sh", 'w') as f:
            f.write('''#!/bin/bash
# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RESOURCES_DIR="$DIR/../Resources"
cd "$RESOURCES_DIR"

# Activate the virtual environment
source venv/bin/activate

# Run the application
exec python launcher.py
''')
        
        # Make the launcher executable
        os.chmod(macos_dir / "launcher.sh", 0o755)
        
        # Create Python launcher
        with open(resources_dir / "launcher.py", 'w') as f:
            f.write('''#!/usr/bin/env python3
import os
import sys
import webbrowser
import threading
import time
import socket
import atexit
import signal

# Import Flask app
from app import app

def find_free_port():
    """Find a free port to run the Flask app"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('localhost', 0))
        return s.getsockname()[1]

def open_browser(port):
    """Open the browser after a short delay"""
    time.sleep(1.5)
    url = f'http://127.0.0.1:{port}/'
    print(f"Opening browser at {url}")
    webbrowser.open(url)

def cleanup():
    """Clean up function to run when app is closing"""
    print("Shutting down BlockAI Pure MM...")

# Register cleanup function
atexit.register(cleanup)

# Handle SIGINT (Ctrl+C) gracefully
def signal_handler(sig, frame):
    print('BlockAI Pure MM is shutting down...')
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

if __name__ == '__main__':
    # Ensure working directory is correct
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Ensure directories exist
    os.makedirs('static/downloads', exist_ok=True)
    os.makedirs('static/img', exist_ok=True)
    
    # Find an available port
    port = find_free_port()
    
    # Start the browser opening thread
    threading.Thread(target=open_browser, args=(port,)).start()
    
    # Start Flask app
    app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)
''')
        
        # Create virtual environment and install dependencies
        print("Creating virtual environment...")
        venv_path = resources_dir / "venv"
        success = run_command([sys.executable, "-m", "venv", str(venv_path)])
        if not success:
            print("Failed to create virtual environment!")
            return False
        
        # Determine pip path
        pip_path = venv_path / "bin" / "pip"
        
        # Install requirements
        print("Installing requirements...")
        requirements_path = Path("requirements.txt")
        if not requirements_path.exists():
            # If requirements.txt doesn't exist, create it from your requirements-file.txt
            shutil.copy("requirements-file.txt", "requirements.txt")
        
        success = run_command([str(pip_path), "install", "-r", "requirements.txt"])
        if not success:
            print("Failed to install requirements!")
            return False
        
        # Copy application files
        print("Copying application files...")
        files_to_copy = [
            "app.py",
            "requirements.txt",
            "cairo_patch.py",
            "generate_logos.py",
            "generate_logos_patched.py",
            "solana_wallet_generator.py",
            "houdini.js",
            "mexc-implementation-summary.md",
        ]
        
        for file in files_to_copy:
            if os.path.exists(file):
                shutil.copy(file, resources_dir)
        
        # Copy directories
        dirs_to_copy = ["static", "templates", "modules"]
        
        for directory in dirs_to_copy:
            if os.path.exists(directory):
                shutil.copytree(directory, resources_dir / directory, dirs_exist_ok=True)
        
        # Generate an icns file from the png (simplified approach)
        print("Creating app icon...")
        icon_path = Path("static/img/blockai-logo-large.png")
        if icon_path.exists():
            shutil.copy(icon_path, resources_dir / "AppIcon.png")
            # In a real scenario, you'd use iconutil to create a proper icns file
            # For simplicity, we're just copying the png as AppIcon.icns
            shutil.copy(icon_path, resources_dir / "AppIcon.icns")
    
    # Create a DMG if requested
    if create_dmg:
        print("Creating DMG installer...")
        try:
            dmg_path = f"{app_name.replace(' ', '_')}.dmg"
            create_dmg_cmd = [
                "hdiutil", "create", 
                "-volname", app_name, 
                "-srcfolder", str(app_dir),
                "-ov", "-format", "UDZO", 
                dmg_path
            ]
            success = run_command(create_dmg_cmd)
            if success:
                print(f"DMG created at {dmg_path}")
            else:
                print("Failed to create DMG")
        except Exception as e:
            print(f"Error creating DMG: {e}")
            print("Skipping DMG creation")
    
    print("\n===== BUILD COMPLETE =====")
    print(f"✅ BlockAI Pure MM.app created successfully!")
    print(f"Application is located at: {app_dir.absolute()}")
    print("\nTroubleshooting tips for your friend:")
    print("1. Right-click on the app and select 'Open' (bypass Gatekeeper)")
    print("2. If that doesn't work, go to System Preferences > Security & Privacy")
    print("   and allow the application to run")
    print("3. Make sure they have Python 3.8+ installed if using manual method")
    print("4. Check if architecture matches (Intel vs Apple Silicon)")
    
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build BlockAI Pure MM for macOS")
    parser.add_argument("--dmg", action="store_true", help="Create DMG installer")
    parser.add_argument("--method", choices=["pyinstaller", "manual"], default="pyinstaller",
                        help="Build method: pyinstaller or manual")
    
    args = parser.parse_args()
    build_mac_app(create_dmg=args.dmg, use_pyinstaller=(args.method == "pyinstaller"))