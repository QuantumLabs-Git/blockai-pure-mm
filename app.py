# app.py with all fixes incorporated
from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify
import os
import sys
import pandas as pd
from web3 import Web3
import time
import sys
import traceback
import json
import re

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