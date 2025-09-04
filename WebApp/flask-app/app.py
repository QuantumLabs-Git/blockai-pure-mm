# app.py with all fixes incorporated and Solana warmup integration
from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify
import os
import sys
import pandas as pd
from web3 import Web3
import time
import traceback
import json
import re
import subprocess
import threading

# Dictionary to store logs by instance ID
warmup_logs = {}
# Dictionary to store warmup process status
running_processes = {}

# Function to handle logs from the warmup process
def log_handler(instance_id, message):
    if instance_id not in warmup_logs:
        warmup_logs[instance_id] = []
    
    # Add timestamp
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    
    # Limit logs to most recent 1000 entries
    warmup_logs[instance_id].append(log_entry)
    if len(warmup_logs[instance_id]) > 1000:
        warmup_logs[instance_id] = warmup_logs[instance_id][-1000:]

# Solana warmup functions
def run_solana_warmup(
    instance_id,
    wallets,
    tokens,
    amount=0.05,
    time_period=60,
    rpc_url=None,
    log_callback=None
):
    print(f"[DEBUG] run_solana_warmup called with instance_id: {instance_id}")
    """
    Start a Solana wallet warmup process
    
    Args:
        instance_id: Unique identifier for this warmup instance
        wallets: List of private keys for wallets to warm up
        tokens: List of token addresses to use for transactions
        amount: Amount of SOL to use per transaction
        time_period: Time between transactions in seconds
        rpc_url: Custom RPC URL (optional)
        log_callback: Function to handle log messages
    
    Returns:
        Dict with status information
    """
    if not wallets or not tokens:
        return {"status": "error", "message": "No wallets or tokens provided"}
    
    # Create temporary directory for files
    temp_dir = os.path.join(os.getcwd(), "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Write wallets to CSV
    wallets_csv = os.path.join(temp_dir, f"wallets_{instance_id}.csv")
    with open(wallets_csv, "w") as f:
        f.write("private_key,label\n")  # Header
        for i, wallet in enumerate(wallets):
            f.write(f"{wallet},wallet_{i+1}\n")
    
    # Write tokens to CSV
    tokens_csv = os.path.join(temp_dir, f"tokens_{instance_id}.csv")
    with open(tokens_csv, "w") as f:
        f.write("token_address,name,description\n")  # Header
        for i, token in enumerate(tokens):
            f.write(f"{token},token_{i+1},auto_generated\n")
    
    # Create a .env file with custom RPC URL if provided
    env_file = os.path.join(temp_dir, f".env_{instance_id}")
    with open(env_file, "w") as f:
        f.write(f"MAINNET_RPC_URL={rpc_url or 'https://mainnet.helius-rpc.com/?api-key=c3ccc39d-a8c8-40ec-880d-40ac14e92533'}\n")
        f.write("DEVNET_MODE=false\n")
    
    # Create a modified config.ts that points to our temporary files
    config_ts = os.path.join(temp_dir, f"config_{instance_id}.ts")
    with open("config.ts", "r") as src_file:
        config_content = src_file.read()
        
    # Modify paths in config.ts to point to our temporary files
    config_content = config_content.replace(
        "const csvFilePath = path.resolve(__dirname, 'tokens.csv')",
        f"const csvFilePath = path.resolve(__dirname, 'temp/tokens_{instance_id}.csv')"
    )
    config_content = config_content.replace(
        "const csvFilePath = path.resolve(__dirname, 'wallets.csv')",
        f"const csvFilePath = path.resolve(__dirname, 'temp/wallets_{instance_id}.csv')"
    )
    
    # Modify BUY_AMOUNT and TIME_PERIOD
    config_content = config_content.replace(
        "export const BUY_AMOUNT = 0.05",
        f"export const BUY_AMOUNT = {amount}"
    )
    config_content = config_content.replace(
        "export const TIME_PERIOD = 1 * 60",
        f"export const TIME_PERIOD = {time_period}"
    )
    
    with open(config_ts, "w") as dest_file:
        dest_file.write(config_content)
    
    # Create a flag to signal when the process should stop
    stop_flag_file = os.path.join(temp_dir, f"stop_{instance_id}")
    
    # Function to run the warmup script in a separate thread
    def run_script():
        print(f"[WARMUP THREAD] Starting run_script for instance {instance_id}")
        try:
            # Copy the temporary files to the locations expected by the script
            import shutil
            
            # Log what we're copying
            print(f"[WARMUP THREAD] Copying files...")
            if log_callback:
                log_callback(instance_id, f"Copying wallets from {wallets_csv} to wallets.csv")
                log_callback(instance_id, f"Copying tokens from {tokens_csv} to tokens.csv")
                log_callback(instance_id, f"Current directory: {os.getcwd()}")
            
            shutil.copy(wallets_csv, "wallets.csv")
            shutil.copy(tokens_csv, "tokens.csv")
            
            # Verify the files were copied
            if os.path.exists("wallets.csv") and os.path.exists("tokens.csv"):
                if log_callback:
                    log_callback(instance_id, "Files copied successfully")
            else:
                if log_callback:
                    log_callback(instance_id, "ERROR: Files were not copied!")
            
            # Also copy the modified config to replace the original
            shutil.copy(config_ts, "config.ts")
            
            # Set up command to run simple wrapper
            cmd = [
                sys.executable, "-u",  # -u for unbuffered output
                "simple_warmup.py"
            ]
            
            if log_callback:
                log_callback(instance_id, f"Running command: {' '.join(cmd)}")
                log_callback(instance_id, f"Working directory: {os.getcwd()}")
                log_callback(instance_id, f"Python: {sys.executable}")
            
            # Start the process
            print(f"[WARMUP THREAD] About to create subprocess...")
            if log_callback:
                log_callback(instance_id, "Creating subprocess...")
            
            # Set environment variables
            env = os.environ.copy()
            env['NODE_OPTIONS'] = '--max-old-space-size=4096'  # Increase memory
            
            print(f"[WARMUP THREAD] Running command: {' '.join(cmd)}")
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,  # Separate stderr
                text=True,
                bufsize=1,  # Line buffered
                universal_newlines=True,
                env=env,
                cwd=os.getcwd()  # Explicitly set working directory
            )
            
            print(f"[WARMUP THREAD] Process created with PID: {process.pid}")
            if log_callback:
                log_callback(instance_id, f"Process created with PID: {process.pid}")
            
            # Store process info
            running_processes[instance_id] = {
                "process": process,
                "start_time": time.time(),
                "status": "running",
                "wallets": len(wallets),
                "tokens": len(tokens),
                "configuration": {
                    "amount": amount,
                    "time_period": time_period,
                    "rpc_url": rpc_url
                }
            }
            
            # Log callback for initialization
            if log_callback:
                log_callback(instance_id, f"Process started with PID: {process.pid}")
                log_callback(instance_id, f"Using {len(wallets)} wallets and {len(tokens)} tokens")
                log_callback(instance_id, f"Transaction amount: {amount} SOL, period: {time_period} seconds")
            
            # Read output from the process
            if log_callback:
                log_callback(instance_id, "Starting to read process output...")
            
            try:
                # Simple line-by-line reading
                for line in iter(process.stdout.readline, ''):
                    if not line:
                        break
                        
                    # Check if stop signal received
                    if os.path.exists(stop_flag_file):
                        process.terminate()
                        if log_callback:
                            log_callback(instance_id, "Received stop signal, terminating process")
                        break
                    
                    # Log the line
                    line = line.strip()
                    if line and log_callback:
                        log_callback(instance_id, line)
                
                # Also capture stderr if process failed
                if process.poll() is not None and process.returncode != 0:
                    stderr_output = process.stderr.read()
                    if stderr_output and log_callback:
                        log_callback(instance_id, f"Process failed with stderr: {stderr_output}")
                        
            except Exception as e:
                if log_callback:
                    log_callback(instance_id, f"Error reading output: {str(e)}")
            
            # Clean up
            process.wait()
            running_processes[instance_id]["status"] = "stopped"
            
            # Delete temp files
            for file_path in [wallets_csv, tokens_csv, env_file, config_ts, stop_flag_file]:
                if os.path.exists(file_path):
                    os.remove(file_path)
            
            if log_callback:
                log_callback("Wallet warmup process has terminated")
        
        except Exception as e:
            if log_callback:
                log_callback(f"Error in warmup process: {str(e)}")
            running_processes[instance_id]["status"] = "error"
            running_processes[instance_id]["error"] = str(e)
    
    # Start the thread
    print(f"[MAIN] Creating thread for warmup instance {instance_id}")
    thread = threading.Thread(target=run_script, name=f"warmup-{instance_id}")
    thread.daemon = True
    print(f"[MAIN] Starting thread...")
    thread.start()
    print(f"[MAIN] Thread started: {thread.is_alive()}")
    
    return {
        "status": "started",
        "instance_id": instance_id,
        "config": {
            "wallets": len(wallets),
            "tokens": len(tokens),
            "amount": amount,
            "time_period": time_period
        }
    }

def stop_solana_warmup(instance_id):
    """Stop a running Solana warmup process"""
    if instance_id not in running_processes:
        return {"status": "error", "message": f"No running process with ID {instance_id}"}
    
    # Create a flag file to signal the process to stop
    stop_flag_file = os.path.join(os.getcwd(), "temp", f"stop_{instance_id}")
    with open(stop_flag_file, "w") as f:
        f.write("stop")
    
    # Wait for the process to terminate (max 10 seconds)
    for _ in range(10):
        if running_processes[instance_id]["status"] != "running":
            break
        time.sleep(1)
    
    # Force terminate if still running
    if running_processes[instance_id]["status"] == "running":
        process = running_processes[instance_id]["process"]
        process.terminate()
        running_processes[instance_id]["status"] = "stopped"
    
    return {
        "status": "stopped",
        "instance_id": instance_id
    }

def get_solana_warmup_status(instance_id):
    """Get the status of a Solana warmup process"""
    if instance_id not in running_processes:
        return {"status": "not_found", "instance_id": instance_id}
    
    process_info = running_processes[instance_id].copy()
    
    # Remove process object from the response
    if "process" in process_info:
        del process_info["process"]
    
    # Add runtime information
    if process_info["status"] == "running":
        runtime = int(time.time() - process_info["start_time"])
        process_info["runtime_seconds"] = runtime
        process_info["runtime_formatted"] = f"{runtime // 3600}h {(runtime % 3600) // 60}m {runtime % 60}s"
    
    return process_info

# Debug logging for binary dependencies in frozen application
if getattr(sys, 'frozen', False):
    # Create a log file to debug binary loading issues
    log_path = os.path.expanduser("~/blockai_debug.log")
    with open(log_path, 'w') as log_file:
        log_file.write(f"Application started at: {os.path.dirname(sys.executable)}\n")
        log_file.write(f"Working directory: {os.getcwd()}\n")
        log_file.write(f"Python path: {sys.path}\n\n")
        
        # Log environment variables
        log_file.write("Environment variables:\n")
        for key, value in os.environ.items():
            log_file.write(f"  {key}: {value}\n")
        
        # Check for nacl and base58
        log_file.write("\nChecking for critical libraries:\n")
        try:
            import nacl
            log_file.write(f"✓ nacl imported from: {nacl.__file__}\n")
            try:
                import nacl.signing
                log_file.write(f"✓ nacl.signing imported\n")
            except Exception as e:
                log_file.write(f"✗ Failed to import nacl.signing: {e}\n")
                log_file.write(traceback.format_exc())
        except Exception as e:
            log_file.write(f"✗ Failed to import nacl: {e}\n")
            log_file.write(traceback.format_exc())
        
        try:
            import base58
            log_file.write(f"✓ base58 imported from: {base58.__file__}\n")
        except Exception as e:
            log_file.write(f"✗ Failed to import base58: {e}\n")
            log_file.write(traceback.format_exc())

# Try to import Solana wallet generator module
try:
    from solana_wallet_generator import generate_solana_keypair
    print("Using dedicated Solana wallet generator module")
except ImportError:
    print("Dedicated Solana generator module not found, using built-in generator")
    # Import Solana wallet generation dependencies
    import base58
    import csv
    import nacl.signing
    from hashlib import sha256

app = Flask(__name__, static_folder='static')
app.config['APP_NAME'] = 'BlockAI Pure MM'
app.config['DOWNLOADS_FOLDER'] = os.path.join(app.static_folder, 'downloads')
app.config['INSTANCE_STATES_FOLDER'] = os.path.join(app.static_folder, 'instance_states')

# Add a diagnostic route
@app.route('/diagnostic')
def run_diagnostic():
    try:
        import diagnostic
        return "Diagnostic complete. Check console for results."
    except Exception as e:
        return f"Error running diagnostic: {str(e)}"

# Ensure the img, downloads, and instance_states directories exist
os.makedirs(os.path.join(app.static_folder, 'img'), exist_ok=True)
os.makedirs(app.config['DOWNLOADS_FOLDER'], exist_ok=True)
os.makedirs(app.config['INSTANCE_STATES_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.config['INSTANCE_STATES_FOLDER'], 'features'), exist_ok=True)
os.makedirs(os.path.join(os.getcwd(), 'temp'), exist_ok=True)  # Create temp directory for warmup files

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/token_management')
def token_management():
    return render_template('token_management.html')

@app.route('/wallet_management')
def wallet_management():
    return render_template('wallet_management.html')

@app.route('/wallet_warmup')
def wallet_warmup():
    return render_template('wallet_warmup.html')

@app.route('/trading')
def trading():
    return render_template('trading.html')

# New trading related routes
@app.route('/cex_mm')
def cex_mm():
    return render_template('cex_mm.html')

@app.route('/dex_mm')
def dex_mm():
    return render_template('dex_mm.html')

@app.route('/mexc')
def mexc():
    return render_template('mexc.html')

@app.route('/multisender')
def multisender():
    return render_template('multisender.html')

@app.route('/privacy_transfers')
def privacy_transfers():
    return render_template('privacy_transfers.html')

@app.route('/liquidity_management')
def liquidity_management():
    return render_template('liquidity_management.html')

@app.route('/launch')
def launch():
    return render_template('launch.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

# Solana Warmup API routes
@app.route('/api/solana/start_warmup', methods=['POST'])
def api_start_solana_warmup():
    try:
        data = request.json
        instance_id = data.get('instance_id', f"warmup_{int(time.time())}")
        wallets = data.get('wallets', [])
        tokens = data.get('tokens', [])
        amount = float(data.get('amount', 0.05))
        time_period = int(data.get('time_period', 60))
        rpc_url = data.get('rpc_url')
        
        # Validate inputs
        if not wallets:
            return jsonify({'success': False, 'message': 'No wallets provided'})
        
        if not tokens:
            return jsonify({'success': False, 'message': 'No tokens provided'})
        
        # Set up log handling
        warmup_logs[instance_id] = []
        log_callback = lambda message: log_handler(instance_id, message)
        
        # Run the warmup
        result = run_solana_warmup(
            instance_id=instance_id,
            wallets=wallets,
            tokens=tokens,
            amount=amount,
            time_period=time_period,
            rpc_url=rpc_url,
            log_callback=log_callback
        )
        
        return jsonify({
            'success': True,
            'message': 'Solana wallet warmup started',
            'instance_id': instance_id,
            'status': result
        })
    
    except Exception as e:
        print(f"Error starting Solana warmup: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False, 
            'message': f'Error starting Solana warmup: {str(e)}'
        }), 500

@app.route('/api/solana/stop_warmup', methods=['POST'])
def api_stop_solana_warmup():
    try:
        data = request.json
        instance_id = data.get('instance_id')
        
        if not instance_id:
            return jsonify({'success': False, 'message': 'No instance ID provided'})
        
        # Stop the warmup
        result = stop_solana_warmup(instance_id)
        
        return jsonify({
            'success': True,
            'message': 'Stopped Solana warmup',
            'status': result
        })
    
    except Exception as e:
        print(f"Error stopping Solana warmup: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'Error stopping Solana warmup: {str(e)}'
        }), 500

@app.route('/api/solana/warmup_status', methods=['GET'])
def api_solana_warmup_status():
    try:
        instance_id = request.args.get('instance_id')
        
        # Get status
        result = get_solana_warmup_status(instance_id)
        
        return jsonify({
            'success': True,
            'instance_id': instance_id,
            'status': result
        })
    
    except Exception as e:
        print(f"Error getting Solana warmup status: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'Error getting Solana warmup status: {str(e)}'
        }), 500

@app.route('/api/solana/warmup_logs', methods=['GET'])
def api_solana_warmup_logs():
    try:
        instance_id = request.args.get('instance_id')
        
        if not instance_id or instance_id not in warmup_logs:
            return jsonify({
                'success': False,
                'message': f'No logs found for instance ID {instance_id}'
            })
        
        # Get logs
        logs = warmup_logs[instance_id]
        
        return jsonify({
            'success': True,
            'instance_id': instance_id,
            'logs': logs
        })
    
    except Exception as e:
        print(f"Error getting Solana warmup logs: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'Error getting Solana warmup logs: {str(e)}'
        }), 500

# Fallback Solana keypair generation using standard library
def generate_solana_keypair_fallback():
    """
    Fallback method for generating Solana keypairs using just standard library
    """
    print("Using fallback method for Solana wallet generation")
    
    # Log to file if in frozen app
    is_frozen = getattr(sys, 'frozen', False)
    if is_frozen:
        log_path = os.path.expanduser("~/solana_wallet_generation.log")
        with open(log_path, 'a') as f:
            f.write("Using fallback method for Solana wallet generation\n")
    
    try:
        import hashlib
        import secrets
        import base64
        
        # Use secrets module for cryptographically secure random bytes
        seed = secrets.token_bytes(32)
        
        # Hash the seed to create a verify key
        h = hashlib.sha256(seed).digest()
        
        # Combine seed and hash to form private key (64 bytes total)
        private_key_bytes = seed + h
        public_key_bytes = h
        
        # Create a simplified Base58 encoding function
        def b58encode(byte_data):
            alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
            n = int.from_bytes(byte_data, 'big')
            result = ''
            while n > 0:
                n, remainder = divmod(n, 58)
                result = alphabet[remainder] + result
            # Add '1' characters for leading zeros
            for b in byte_data:
                if b == 0:
                    result = '1' + result
                else:
                    break
            return result
        
        # Encode keys in Base58
        private_key = b58encode(private_key_bytes)
        public_key = b58encode(public_key_bytes)
        
        # Log success if in frozen app
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write("Fallback method succeeded\n")
                f.write(f"Public key: {public_key}\n")
                f.write(f"Private key (first 10 chars): {private_key[:10]}...\n")
        
        return private_key, public_key
    
    except Exception as e:
        error_message = f"Fallback method failed: {str(e)}"
        print(error_message)
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"{error_message}\n")
                f.write(traceback.format_exc())
        raise Exception(error_message)

# Original Solana keypair generation with enhanced error handling
def generate_solana_keypair_original():
    """
    Generate a Solana keypair with enhanced error handling and logging
    """
    # Determine if we're running in a compiled app
    is_frozen = getattr(sys, 'frozen', False)
    
    # Log file for debug information in frozen applications
    log_path = os.path.expanduser("~/solana_wallet_generation.log")
    if is_frozen:
        with open(log_path, 'a') as f:
            f.write(f"\n--- Solana Wallet Generation Attempt at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
    
    try:
        # Log the import attempts if frozen
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write("Attempting to import nacl.signing...\n")
        
        # Try to import nacl.signing
        import nacl.signing
        
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write("Successfully imported nacl.signing\n")
                f.write("Attempting to import base58...\n")
        
        # Try to import base58
        import base58
        
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write("Successfully imported base58\n")
                f.write("Generating random seed...\n")
        
        # Generate a random keypair using Ed25519
        seed = os.urandom(32)
        
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"Generated seed: {seed.hex()[:10]}...\n")
                f.write("Creating signing key...\n")
        
        signing_key = nacl.signing.SigningKey(seed)
        
        # Get the verify key (public key)
        verify_key = signing_key.verify_key
        
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write("Got verify key\n")
                f.write("Preparing key bytes...\n")
        
        # Get the bytes of the private key and public key
        # In Solana, the private key is both the seed and the public key
        private_key_bytes = seed + bytes(verify_key)  # This makes it 64 bytes (32 seed + 32 public key)
        public_key_bytes = bytes(verify_key)
        
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write("Encoding with base58...\n")
        
        # Encode both in base58 format
        private_key = base58.b58encode(private_key_bytes).decode('utf-8')
        public_key = base58.b58encode(public_key_bytes).decode('utf-8')
        
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"Successfully generated keypair\n")
                f.write(f"Public key: {public_key}\n")
                f.write(f"Private key (first 10 chars): {private_key[:10]}...\n")
        
        return private_key, public_key
        
    except ImportError as e:
        # Special handling for import errors
        error_message = f"Import error: {str(e)}"
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"{error_message}\n")
                f.write(f"Python path: {sys.path}\n")
                f.write(traceback.format_exc())
        print(error_message)
        
        # Try alternative method if in frozen app
        if is_frozen:
            try:
                return generate_solana_keypair_fallback()
            except:
                with open(log_path, 'a') as f:
                    f.write("Fallback method also failed\n")
        
        raise Exception(error_message)
        
    except Exception as e:
        # General error handling
        error_message = f"Error generating Solana keypair: {str(e)}"
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"{error_message}\n")
                f.write(traceback.format_exc())
        print(error_message)
        raise Exception(error_message)

# Function to use if module import failed
def generate_solana_keypair():
    """
    Main Solana keypair generator with multiple fallback methods
    """
    methods = [
        generate_solana_keypair_original,
        generate_solana_keypair_fallback
    ]
    
    last_error = None
    for method in methods:
        try:
            return method()
        except Exception as e:
            last_error = e
            print(f"Method {method.__name__} failed: {str(e)}")
            continue
    
    # If all methods fail, raise the last error
    raise Exception(f"All Solana wallet generation methods failed. Last error: {str(last_error)}")

@app.route('/generate_wallets', methods=['POST'])
def generate_wallets():
    wallet_count = int(request.form.get('walletCount', 10))
    file_name = request.form.get('fileName', 'wallets.xlsx')
    blockchain = request.form.get('blockchain', 'ethereum')
    
    print(f"Starting wallet generation: {wallet_count} {blockchain} wallets, filename: {file_name}")
    
    # Validate blockchain type
    if blockchain not in ['ethereum', 'bsc', 'base', 'solana']:
        print(f"Invalid blockchain selected: {blockchain}")
        return jsonify({
            'success': False,
            'message': "Invalid blockchain selected"
        }), 400
    
    # Limit wallet count for safety
    wallet_count = min(max(1, wallet_count), 1000)
    
    # Generate wallets based on blockchain type
    wallets = []
    
    try:
        if blockchain == 'solana':
            print("Generating Solana wallets...")
            
            # Generate Solana wallets
            for i in range(wallet_count):
                try:
                    print(f"Generating Solana wallet {i+1}/{wallet_count}")
                    private_key, public_key = generate_solana_keypair()
                    wallets.append([public_key, private_key])
                    print(f"Successfully generated wallet: {public_key[:10]}...")
                except Exception as e:
                    print(f"Error generating Solana wallet {i+1}: {str(e)}")
                    import traceback
                    print(traceback.format_exc())
            
            # Set columns for Solana
            columns = ["Public Key", "Private Key"]
        else:
            print(f"Generating {blockchain} wallets...")
            # Generate EVM wallets (Ethereum, BSC, Base)
            for i in range(wallet_count):
                try:
                    print(f"Generating {blockchain} wallet {i+1}/{wallet_count}")
                    acct = Web3().eth.account.create()
                    # Make sure we're getting the full 64-character private key (32 bytes)
                    private_key = acct.key.hex()
                    if private_key.startswith('0x'):
                        private_key = private_key[2:]  # Remove '0x' prefix if present
                    
                    # Ensure the private key is exactly 64 characters
                    if len(private_key) != 64:
                        print(f"Invalid private key length: {len(private_key)}")
                        continue
                        
                    wallets.append([acct.address, private_key])
                    print(f"Successfully generated wallet: {acct.address[:10]}...")
                except Exception as e:
                    print(f"Error generating {blockchain} wallet {i+1}: {str(e)}")
                    import traceback
                    print(traceback.format_exc())
            
            # Set columns for EVM chains
            columns = ["Address", "Private Key"]
        
        print(f"Successfully generated {len(wallets)} wallets")
        
        # Check if we actually generated any wallets
        if len(wallets) == 0:
            return jsonify({
                'success': False,
                'message': f"Failed to generate any {blockchain} wallets. Please check logs for details."
            }), 500
        
        # Convert to DataFrame
        print("Converting to DataFrame...")
        df = pd.DataFrame(wallets, columns=columns)
        
        # Set default filename based on blockchain if not specified
        if file_name == 'wallets.xlsx':
            file_name = f"{blockchain}_wallets.xlsx"
        elif not file_name.endswith('.xlsx'):
            file_name += '.xlsx'
        
        # Add timestamp to prevent overwrites
        timestamp = int(time.time())
        
        # Make sure downloads folder exists
        downloads_folder = app.config['DOWNLOADS_FOLDER']
        os.makedirs(downloads_folder, exist_ok=True)
        
        file_path = os.path.join(downloads_folder, f"{timestamp}_{file_name}")
        print(f"Saving to Excel: {file_path}")
        
        try:
            # Save to Excel
            df.to_excel(file_path, index=False)
            print(f"File saved successfully to {file_path}")
            
            # Verify file exists and is readable
            if not os.path.exists(file_path):
                raise Exception(f"File not created: {file_path}")
                
            # Try to read file size to ensure it's accessible
            file_size = os.path.getsize(file_path)
            print(f"File size: {file_size} bytes")
            
        except Exception as e:
            print(f"Error saving Excel file: {str(e)}")
            import traceback
            print(traceback.format_exc())
            
            # Fallback to CSV if Excel fails
            csv_path = os.path.join(downloads_folder, f"{timestamp}_{file_name.replace('.xlsx', '.csv')}")
            print(f"Trying CSV fallback: {csv_path}")
            df.to_csv(csv_path, index=False)
            
            return jsonify({
                'success': True,
                'message': f"Excel save failed, generated {len(wallets)} {blockchain.upper()} wallets as CSV instead!",
                'download_url': url_for('download_file', filename=os.path.basename(csv_path))
            })
        
        # Return JSON response
        blockchain_name = blockchain.upper()
        return jsonify({
            'success': True,
            'message': f"Generated {len(wallets)} {blockchain_name} wallets successfully!",
            'download_url': url_for('download_file', filename=f"{timestamp}_{file_name}")
        })
    except Exception as e:
        print(f"Error in wallet generation: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f"Error generating wallets: {str(e)}"
        }), 500

@app.route('/downloads/<filename>')
def download_file(filename):
    # Sanitize filename to prevent directory traversal
    if '..' in filename or '/' in filename or '\\' in filename:
        return "Invalid filename", 400
        
    return send_from_directory(app.config['DOWNLOADS_FOLDER'], filename, as_attachment=True)

# API endpoint for MEXC MM operations
@app.route('/api/mexc/start_instance', methods=['POST'])
def start_mexc_instance():
    # In a real implementation, this would start a background task/thread
    # For now, we'll just return a success response
    data = request.json
    return jsonify({
        'success': True,
        'message': f"Started MEXC market making for {data.get('trading_pair', 'unknown pair')}",
        'instance_id': f"mexc_{int(time.time())}",
        'config': data
    })

@app.route('/api/mexc/stop_instance', methods=['POST'])
def stop_mexc_instance():
    instance_id = request.json.get('instance_id')
    return jsonify({
        'success': True,
        'message': f"Stopped MEXC market making instance {instance_id}"
    })

@app.route('/api/mexc/update_instance', methods=['POST'])
def update_mexc_instance():
    data = request.json
    instance_id = data.get('instance_id')
    return jsonify({
        'success': True,
        'message': f"Updated MEXC market making instance {instance_id}",
        'config': data
    })

# Fixed routes for instance state persistence
@app.route('/api/save_instance_state', methods=['POST'])
def save_instance_state():
    try:
        data = request.json
        instance_id = data.get('instance_id')
        instance_data = data.get('instance_data')
        
        if not instance_id or not instance_data:
            return jsonify({'success': False, 'message': 'Missing required data'})
        
        # Sanitize instance_id to prevent path traversal
        if not re.match(r'^[a-zA-Z0-9_\-]+$', instance_id):
            return jsonify({'success': False, 'message': 'Invalid instance ID format'})
        
        # Ensure the directory exists
        instance_states_folder = app.config['INSTANCE_STATES_FOLDER']
        os.makedirs(instance_states_folder, exist_ok=True)
        
        # Save the instance data to a file
        file_path = os.path.join(instance_states_folder, f'{instance_id}.json')
        
        # Create a backup of the existing file if it exists
        if os.path.exists(file_path):
            import shutil
            backup_path = f"{file_path}.bak"
            shutil.copy2(file_path, backup_path)
        
        # Save the new data
        with open(file_path, 'w') as f:
            json.dump(instance_data, f, indent=2)
        
        return jsonify({'success': True, 'message': 'Instance state saved'})
    except Exception as e:
        print(f"Error saving instance state: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Error saving instance state: {str(e)}'})

@app.route('/api/load_instance_state/<instance_id>', methods=['GET'])
def load_instance_state(instance_id):
    try:
        # Sanitize instance_id to prevent path traversal
        if not re.match(r'^[a-zA-Z0-9_\-]+$', instance_id):
            return jsonify({'success': False, 'message': 'Invalid instance ID format'})
        
        instance_states_folder = app.config['INSTANCE_STATES_FOLDER']
        file_path = os.path.join(instance_states_folder, f'{instance_id}.json')
        
        if not os.path.exists(file_path):
            # Try to find a backup
            backup_path = f"{file_path}.bak"
            if os.path.exists(backup_path):
                file_path = backup_path
                print(f"Main state file not found, using backup: {backup_path}")
            else:
                return jsonify({'success': False, 'message': 'Instance state not found'})
        
        with open(file_path, 'r') as f:
            try:
                instance_data = json.load(f)
            except json.JSONDecodeError:
                # If the file is corrupted, try the backup
                backup_path = f"{file_path}.bak"
                if os.path.exists(backup_path):
                    with open(backup_path, 'r') as bf:
                        instance_data = json.load(bf)
                        print(f"Main state file corrupted, using backup")
                else:
                    return jsonify({'success': False, 'message': 'Instance state file is corrupted'})
        
        return jsonify({'success': True, 'data': instance_data})
    except Exception as e:
        print(f"Error loading instance state: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Error loading instance state: {str(e)}'})

# Fixed routes for feature state management
@app.route('/api/save_feature_state', methods=['POST'])
def save_feature_state():
    try:
        data = request.json
        feature_id = data.get('feature_id')
        feature_data = data.get('feature_data')
        
        if not feature_id or not feature_data:
            return jsonify({'success': False, 'message': 'Missing required data'})
        
        # Sanitize feature_id to prevent path traversal
        if not re.match(r'^[a-zA-Z0-9_\-]+$', feature_id):
            return jsonify({'success': False, 'message': 'Invalid feature ID format'})
        
        # Create a features directory if it doesn't exist
        instance_states_folder = app.config['INSTANCE_STATES_FOLDER']
        features_dir = os.path.join(instance_states_folder, 'features')
        os.makedirs(features_dir, exist_ok=True)
        
        # Create a backup of the existing file if it exists
        file_path = os.path.join(features_dir, f'{feature_id}.json')
        if os.path.exists(file_path):
            import shutil
            backup_path = f"{file_path}.bak"
            shutil.copy2(file_path, backup_path)
        
        # Save the feature data to a file
        with open(file_path, 'w') as f:
            json.dump(feature_data, f, indent=2)
        
        return jsonify({'success': True, 'message': 'Feature state saved'})
    except Exception as e:
        print(f"Error saving feature state: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Error saving feature state: {str(e)}'})

@app.route('/api/load_feature_state/<feature_id>', methods=['GET'])
def load_feature_state(feature_id):
    try:
        # Sanitize feature_id to prevent path traversal
        if not re.match(r'^[a-zA-Z0-9_\-]+$', feature_id):
            return jsonify({'success': False, 'message': 'Invalid feature ID format'})
        
        instance_states_folder = app.config['INSTANCE_STATES_FOLDER']
        features_dir = os.path.join(instance_states_folder, 'features')
        file_path = os.path.join(features_dir, f'{feature_id}.json')
        
        if not os.path.exists(file_path):
            # Try to find a backup
            backup_path = f"{file_path}.bak"
            if os.path.exists(backup_path):
                file_path = backup_path
                print(f"Main feature state file not found, using backup: {backup_path}")
            else:
                return jsonify({'success': False, 'message': 'Feature state not found'})
        
        with open(file_path, 'r') as f:
            try:
                feature_data = json.load(f)
            except json.JSONDecodeError:
                # If the file is corrupted, try the backup
                backup_path = f"{file_path}.bak"
                if os.path.exists(backup_path):
                    with open(backup_path, 'r') as bf:
                        feature_data = json.load(bf)
                        print(f"Main feature state file corrupted, using backup")
                else:
                    return jsonify({'success': False, 'message': 'Feature state file is corrupted'})
        
        return jsonify({'success': True, 'data': feature_data})
    except Exception as e:
        print(f"Error loading feature state: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Error loading feature state: {str(e)}'})

# Health check endpoint
@app.route('/api/health')
def health_check():
    """
    Health check endpoint to verify the application is running correctly
    """
    return jsonify({
        'status': 'ok',
        'version': '1.0.0',
        'app_name': app.config['APP_NAME'],
        'timestamp': int(time.time())
    })

if __name__ == '__main__':
    app.run(debug=True)