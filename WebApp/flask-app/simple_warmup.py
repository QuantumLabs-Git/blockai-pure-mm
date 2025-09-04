#!/usr/bin/env python3
import subprocess
import sys
import threading
import time
import os

def run_warmup():
    """Run the warmup script with real-time output"""
    try:
        solana_warmup_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "solana-warmup")
        cmd = ["npx", "ts-node", os.path.join(solana_warmup_dir, "index.ts")]
        
        # Start the process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Read output line by line
        for line in iter(process.stdout.readline, ''):
            if line:
                print(f"[{time.strftime('%H:%M:%S')}] {line.strip()}", flush=True)
        
        process.wait()
        print(f"Process exited with code: {process.returncode}")
        
    except Exception as e:
        print(f"Error: {e}", flush=True)

if __name__ == "__main__":
    print("Starting warmup script...")
    run_warmup()