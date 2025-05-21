#!/usr/bin/env python3
import os
import sys
import webbrowser
import threading
import time
import socket
import atexit
import signal
import traceback
import fcntl  # For file locking

# Set up logging for debugging
is_frozen = getattr(sys, 'frozen', False)
if is_frozen:
    # Create a log file in the user's home directory
    log_path = os.path.expanduser("~/blockai_launcher.log")
    with open(log_path, 'w') as f:
        f.write(f"BlockAI Pure MM Launcher started at {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Python executable: {sys.executable}\n")
        f.write(f"Initial working directory: {os.getcwd()}\n")
        f.write(f"sys.frozen: {is_frozen}\n")
        f.write(f"sys.path: {sys.path}\n\n")

# Lock file path
lock_file_path = os.path.expanduser("~/blockai_app.lock")
lock_file = None

def acquire_lock():
    """Try to acquire a lock file to ensure only one instance runs"""
    global lock_file
    try:
        lock_file = open(lock_file_path, 'w')
        fcntl.lockf(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"Successfully acquired lock file: {lock_file_path}\n")
        return True
    except IOError:
        # Another instance is already running
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"Failed to acquire lock file - another instance is running\n")
        return False
    except Exception as e:
        error_message = f"Error acquiring lock: {str(e)}"
        print(error_message)
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"{error_message}\n")
                f.write(traceback.format_exc())
        return False

def release_lock():
    """Release the lock file when the application exits"""
    global lock_file
    if lock_file is not None:
        try:
            fcntl.lockf(lock_file, fcntl.LOCK_UN)
            lock_file.close()
            os.unlink(lock_file_path)
            if is_frozen:
                with open(log_path, 'a') as f:
                    f.write(f"Successfully released lock file\n")
        except Exception as e:
            print(f"Error releasing lock: {str(e)}")
            if is_frozen:
                with open(log_path, 'a') as f:
                    f.write(f"Error releasing lock: {str(e)}\n")
                    f.write(traceback.format_exc())

# Try importing Flask app - with error handling
try:
    from app import app
    if is_frozen:
        with open(log_path, 'a') as f:
            f.write("Successfully imported app\n")
except Exception as e:
    error_message = f"Failed to import app: {str(e)}"
    print(error_message)
    if is_frozen:
        with open(log_path, 'a') as f:
            f.write(f"{error_message}\n")
            f.write(traceback.format_exc())
    sys.exit(1)

def is_port_in_use(port):
    """Check if the port is already in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def find_free_port():
    """Find a free port to run the Flask app"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', 0))
            port = s.getsockname()[1]
            if is_frozen:
                with open(log_path, 'a') as f:
                    f.write(f"Found free port: {port}\n")
            return port
    except Exception as e:
        error_message = f"Error finding free port: {str(e)}"
        print(error_message)
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"{error_message}\n")
                f.write(traceback.format_exc())
        return 5000  # Default fallback

def open_browser(port):
    """Open the browser after a short delay"""
    try:
        time.sleep(1.5)
        url = f'http://127.0.0.1:{port}/'
        print(f"Opening browser at {url}")
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"Opening browser at {url}\n")
        webbrowser.open(url)
    except Exception as e:
        error_message = f"Error opening browser: {str(e)}"
        print(error_message)
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"{error_message}\n")
                f.write(traceback.format_exc())

def cleanup():
    """Clean up function to run when app is closing"""
    print("Shutting down BlockAI Pure MM...")
    if is_frozen:
        with open(log_path, 'a') as f:
            f.write("Shutting down BlockAI Pure MM...\n")
    release_lock()

# Register cleanup function
atexit.register(cleanup)

# Handle SIGINT (Ctrl+C) gracefully
def signal_handler(sig, frame):
    print('BlockAI Pure MM is shutting down...')
    if is_frozen:
        with open(log_path, 'a') as f:
            f.write("Received signal to shut down\n")
    release_lock()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

if __name__ == '__main__':
    try:
        # Try to acquire lock
        if not acquire_lock():
            print("Another instance of BlockAI Pure MM is already running.")
            # Try to open the browser to the running instance
            # We'll try common ports that Flask might be using
            for port in [5000, 8080, 8000]:
                if is_port_in_use(port):
                    print(f"Detected running instance on port {port}")
                    webbrowser.open(f'http://127.0.0.1:{port}/')
                    sys.exit(0)
            # If we can't find it, just open default port
            webbrowser.open('http://127.0.0.1:5000/')
            sys.exit(0)
        
        # Ensure working directory is correct
        bundle_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
        if is_frozen:
            # Running as a bundle
            if sys.platform == 'darwin':
                # On macOS, move up from MacOS directory to Resources
                os.chdir(os.path.join(bundle_dir, '..', 'Resources'))
            else:
                # On Windows or Linux
                os.chdir(bundle_dir)
            
            with open(log_path, 'a') as f:
                f.write(f"Set working directory to: {os.getcwd()}\n")
        else:
            # Running as a script
            os.chdir(os.path.dirname(os.path.abspath(__file__)))
            print(f"Set working directory to: {os.getcwd()}")
        
        # Ensure directories exist
        os.makedirs('static/downloads', exist_ok=True)
        os.makedirs('static/img', exist_ok=True)
        os.makedirs('static/instance_states', exist_ok=True)  # Add this directory
        
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write("Created directories:\n")
                f.write(f"  static/downloads exists: {os.path.exists('static/downloads')}\n")
                f.write(f"  static/img exists: {os.path.exists('static/img')}\n")
                f.write(f"  static/instance_states exists: {os.path.exists('static/instance_states')}\n")
                f.write(f"  static/downloads writable: {os.access('static/downloads', os.W_OK)}\n")
                f.write(f"  static/img writable: {os.access('static/img', os.W_OK)}\n")
                f.write(f"  static/instance_states writable: {os.access('static/instance_states', os.W_OK)}\n")
        
        # Generate logos if needed
        if not os.path.exists('static/img/blockai-logo.png'):
            try:
                print("Generating logos...")
                if is_frozen:
                    with open(log_path, 'a') as f:
                        f.write("Generating logos...\n")
                import generate_logos_patched
            except Exception as e:
                print(f"Warning: Could not generate logos: {e}")
                if is_frozen:
                    with open(log_path, 'a') as f:
                        f.write(f"Warning: Could not generate logos: {e}\n")
                        f.write(traceback.format_exc())
        
        # Find an available port
        port = find_free_port()
        
        # Start the browser opening thread
        threading.Thread(target=open_browser, args=(port,)).start()
        
        # Set Flask to run on the selected port
        print(f"Starting Flask server on port {port}...")
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"Starting Flask server on port {port}...\n")
        
        app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)
    
    except Exception as e:
        error_message = f"Error in main launcher: {str(e)}"
        print(error_message)
        if is_frozen:
            with open(log_path, 'a') as f:
                f.write(f"{error_message}\n")
                f.write(traceback.format_exc())
        release_lock()
        sys.exit(1)