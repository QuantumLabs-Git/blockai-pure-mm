# diagnostic.py
import sys
import os
import importlib
import traceback

def test_import(module_name):
    try:
        module = importlib.import_module(module_name)
        print(f"✅ Successfully imported {module_name}")
        return True
    except Exception as e:
        print(f"❌ Failed to import {module_name}: {e}")
        print(traceback.format_exc())
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
        print(traceback.format_exc())
        return False

print(f"Python version: {sys.version}")
print(f"Executable path: {sys.executable}")
print(f"Working directory: {os.getcwd()}")
print(f"sys.path: {sys.path}")

print("\nTesting module imports:")
modules_to_test = ['nacl', 'nacl.signing', 'base58', 'web3', 'pandas', 'openpyxl']
for module in modules_to_test:
    test_import(module)

print("\nTesting directory access:")
dirs_to_test = ['static/downloads', 'static/img']
for directory in dirs_to_test:
    test_directory(directory)

# Test Solana keypair generation specifically
print("\nTesting Solana keypair generation:")
try:
    import os
    import base58
    import nacl.signing
    
    # Generate a random keypair
    seed = os.urandom(32)
    signing_key = nacl.signing.SigningKey(seed)
    verify_key = signing_key.verify_key
    
    # Get the private key and public key
    private_key_bytes = seed + bytes(verify_key)
    public_key_bytes = bytes(verify_key)
    
    # Encode in base58
    private_key = base58.b58encode(private_key_bytes).decode('utf-8')
    public_key = base58.b58encode(public_key_bytes).decode('utf-8')
    
    print(f"✅ Successfully generated Solana keypair")
    print(f"  Public key: {public_key}")
    print(f"  Private key (first 10 chars): {private_key[:10]}...")
except Exception as e:
    print(f"❌ Failed to generate Solana keypair: {e}")
    print(traceback.format_exc())