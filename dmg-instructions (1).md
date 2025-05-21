# Building BlockAI Pure MM: macOS DMG Compilation Guide

This guide will walk you through the process of compiling the BlockAI Pure MM application into a macOS DMG installer file.

## Prerequisites

Before you begin, ensure you have the following installed:

- Python 3.8 or higher
- pip (Python package manager)
- Git (for version control)
- macOS operating system (for building DMG files)

## Step 1: Set Up the Environment

```bash
# Clone the repository (if you haven't already)
git clone <your-repo-url>
cd blockai-pure-mm

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install required packages
pip install -r requirements.txt

# Install PyInstaller and additional build requirements
pip install pyinstaller
```

## Step 2: Verify Project Structure

Ensure all necessary files are in place:

- `app.py` - Main Flask application
- `improved_launcher.py` - Enhanced launcher script
- `requirements.txt` - Python dependencies
- `static/` directory with all assets
- `templates/` directory with all HTML files
- `modules/` directory with Python modules

## Step 3: Build the Application

You have two options for building the application:

### Option 1: Using the build_mac_app.py Script (Recommended)

The project includes a comprehensive build script specifically designed for macOS.

```bash
# Run the build script with DMG creation enabled
python build_mac_app.py --dmg
```

This script will:
1. Clean up any existing builds
2. Create the improved launcher script
3. Build the application using PyInstaller
4. Create a DMG installer

### Option 2: Using PyInstaller with the Spec File

If you prefer to use the spec file directly:

```bash
# Ensure you're in the project root directory
pyinstaller blockai_mac.spec

# Create DMG manually
hdiutil create -volname "BlockAI Pure MM" -srcfolder "dist/BlockAI Pure MM.app" -ov -format UDZO BlockAI_Pure_MM.dmg
```

## Step 4: Test the Built Application

Before distributing:

1. Mount the created DMG file by double-clicking it
2. Drag the application to your Applications folder
3. Open the application to verify it works correctly
4. Check that all features are functioning properly
5. Verify that only one instance runs when opened multiple times

## Troubleshooting

### Multiple Instances Issue

If multiple instances of the application open when launched:
- Verify you're using the `improved_launcher.py` as the entry point in your spec file
- Check for proper lock file implementation in the launcher
- Ensure the application has permission to create a lock file

### Missing Dependencies

If you encounter missing dependency errors:
- Add the missing packages to the `--hidden-import` list in your spec file
- Rebuild the application

### Code Signing Issues

For distribution outside of development:
- Consider code signing your application with an Apple Developer certificate
- Use the `codesign` command to sign the application

```bash
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name (TEAM_ID)" "BlockAI Pure MM.app"
```

### Notarization for Public Distribution

For public distribution, you'll need to notarize your application with Apple:

```bash
xcrun altool --notarize-app --primary-bundle-id "com.blockai.puremm" --username "your.apple.id@example.com" --password "app-specific-password" --file "BlockAI_Pure_MM.dmg"
```

## Final Steps

Once your DMG is built and tested:

1. Rename the DMG to include the version number (e.g., `BlockAI_Pure_MM_v1.0.0.dmg`)
2. Consider adding a README or installation instructions
3. Distribute through your preferred channels

## Command Summary

```bash
# Complete build process with DMG creation
python build_mac_app.py --dmg

# Alternative manual process
pyinstaller blockai_mac.spec
hdiutil create -volname "BlockAI Pure MM" -srcfolder "dist/BlockAI Pure MM.app" -ov -format UDZO BlockAI_Pure_MM.dmg
```

---

By following these instructions, you'll be able to compile the BlockAI Pure MM codebase into a distributable DMG installer for macOS users.
