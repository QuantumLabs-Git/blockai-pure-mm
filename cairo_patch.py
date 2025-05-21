# cairo_patch.py
import os
import sys
import ctypes.util

# Define the original find_library function
original_find_library = ctypes.util.find_library

# Define a custom find_library function
def patched_find_library(name):
    if name in ('cairo', 'cairo-2', 'libcairo-2'):
        paths = [
            '/opt/homebrew/lib/libcairo.2.dylib',
            '/opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.2.dylib',
            '/usr/local/lib/libcairo.2.dylib'
        ]
        for path in paths:
            if os.path.exists(path):
                print(f"Found Cairo at: {path}")
                return path
    return original_find_library(name)

# Patch the find_library function
ctypes.util.find_library = patched_find_library