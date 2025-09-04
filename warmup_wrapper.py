#!/usr/bin/env python3
import subprocess
import sys
import os

# Run the TypeScript warmup script
try:
    # Change to the script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Run the command
    cmd = ["npx", "ts-node", "index.ts"]
    print(f"Running command: {' '.join(cmd)}", flush=True)
    print(f"Working directory: {os.getcwd()}", flush=True)
    
    # Run with real-time output
    process = subprocess.Popen(cmd, stdout=sys.stdout, stderr=sys.stderr)
    process.wait()
    
except Exception as e:
    print(f"Error: {e}", flush=True)
    sys.exit(1)