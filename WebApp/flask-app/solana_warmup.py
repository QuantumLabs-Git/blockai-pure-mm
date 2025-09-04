# solana_warmup.py
import os
import json
import subprocess
import threading
import time
import uuid
from typing import Dict, List, Optional, Callable

# Dictionary to store warmup process status
running_processes: Dict[str, Dict] = {}

def run_solana_warmup(
    instance_id: str,
    wallets: List[str],
    tokens: List[str],
    amount: float = 0.05,
    time_period: int = 60,
    rpc_url: Optional[str] = None,
    log_callback: Optional[Callable[[str], None]] = None
) -> Dict:
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
    
    # Create temporary files for the wallet and token CSVs
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
        f.write(f"MAINNET_RPC_URL={rpc_url or 'https://mainnet.helius-rpc.com/?api-key=348d9ad3-98f8-48da-a636-959d0397c115'}\n")
        f.write("DEVNET_MODE=false\n")
    
    # Create a modified config.ts that points to our temporary files
    config_ts = os.path.join(temp_dir, f"config_{instance_id}.ts")
    solana_warmup_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "solana-warmup")
    with open(os.path.join(solana_warmup_dir, "config.ts"), "r") as src_file:
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
        try:
            # Set up Node.js command to run the script
            solana_warmup_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "solana-warmup")
            cmd = [
                "npx", "ts-node", os.path.join(solana_warmup_dir, "index.ts"),
                "--config", config_ts,
                "--env", env_file
            ]
            
            # Start the process
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
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
                log_callback(f"Started Solana warmup process (ID: {instance_id})")
                log_callback(f"Using {len(wallets)} wallets and {len(tokens)} tokens")
                log_callback(f"Transaction amount: {amount} SOL, period: {time_period} seconds")
            
            # Read output from the process
            for line in iter(process.stdout.readline, ""):
                if os.path.exists(stop_flag_file):
                    # Stop signal received
                    process.terminate()
                    if log_callback:
                        log_callback("Received stop signal, terminating process")
                    break
                
                if log_callback and line.strip():
                    log_callback(line.strip())
            
            # Check for errors
            for line in iter(process.stderr.readline, ""):
                if log_callback and line.strip():
                    log_callback(f"ERROR: {line.strip()}")
            
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
    thread = threading.Thread(target=run_script)
    thread.daemon = True
    thread.start()
    
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

def stop_solana_warmup(instance_id: str) -> Dict:
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

def get_solana_warmup_status(instance_id: str) -> Dict:
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