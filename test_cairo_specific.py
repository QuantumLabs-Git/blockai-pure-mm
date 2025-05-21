# test_cairo_specific.py
import ctypes.util
import os

# Print paths
print(f"Current working directory: {os.getcwd()}")
print(f"LD_LIBRARY_PATH: {os.environ.get('LD_LIBRARY_PATH')}")
print(f"DYLD_LIBRARY_PATH: {os.environ.get('DYLD_LIBRARY_PATH')}")
print(f"DYLD_FALLBACK_LIBRARY_PATH: {os.environ.get('DYLD_FALLBACK_LIBRARY_PATH')}")

# Try to find cairo library
cairo_lib = ctypes.util.find_library('cairo')
print(f"find_library('cairo'): {cairo_lib}")

cairo_lib = ctypes.util.find_library('cairo-2')
print(f"find_library('cairo-2'): {cairo_lib}")

# Try to directly load the library
try:
    lib_path = '/opt/homebrew/lib/libcairo.2.dylib'
    cairo = ctypes.cdll.LoadLibrary(lib_path)
    print(f"Successfully loaded {lib_path}")
except Exception as e:
    print(f"Failed to load {lib_path}: {e}")

# Try with a custom finder
def find_cairo():
    paths = [
        '/opt/homebrew/lib/libcairo.2.dylib',
        '/opt/homebrew/Cellar/cairo/1.18.4/lib/libcairo.2.dylib',
        '/usr/local/lib/libcairo.2.dylib'
    ]
    for path in paths:
        if os.path.exists(path):
            return path
    return None

cairo_path = find_cairo()
print(f"Custom finder found cairo at: {cairo_path}")

if cairo_path:
    try:
        cairo = ctypes.cdll.LoadLibrary(cairo_path)
        print(f"Successfully loaded {cairo_path}")
    except Exception as e:
        print(f"Failed to load {cairo_path}: {e}")