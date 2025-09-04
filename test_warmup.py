#!/usr/bin/env python3
"""
Test the warmup functionality directly
"""
import os
import subprocess
import sys

# Change to the script directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print(f"Working directory: {os.getcwd()}")
print(f"Python executable: {sys.executable}")

# Check if files exist
print("\nChecking files:")
print(f"tokens.csv exists: {os.path.exists('tokens.csv')}")
print(f"wallets.csv exists: {os.path.exists('wallets.csv')}")
print(f"index.ts exists: {os.path.exists('index.ts')}")

# Read tokens.csv
if os.path.exists('tokens.csv'):
    with open('tokens.csv', 'r') as f:
        print(f"\ntokens.csv content:")
        print(f.read())

# Read wallets.csv
if os.path.exists('wallets.csv'):
    with open('wallets.csv', 'r') as f:
        print(f"\nwallets.csv content (first 3 lines):")
        for i, line in enumerate(f):
            if i < 3:
                print(line.strip())

# Try to run the TypeScript script
print("\nAttempting to run TypeScript script...")
try:
    cmd = ["npx", "ts-node", "index.ts"]
    print(f"Command: {' '.join(cmd)}")
    
    # Run with timeout
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for a bit and check output
    import time
    time.sleep(2)
    
    if process.poll() is None:
        print("Process is still running after 2 seconds")
        
        # Try to read some output
        import select
        readable, _, _ = select.select([process.stdout, process.stderr], [], [], 0)
        
        for stream in readable:
            if stream == process.stdout:
                print("STDOUT available")
            if stream == process.stderr:
                print("STDERR available")
    else:
        print(f"Process exited with code: {process.poll()}")
        stdout, stderr = process.communicate()
        if stdout:
            print(f"STDOUT:\n{stdout}")
        if stderr:
            print(f"STDERR:\n{stderr}")
            
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()