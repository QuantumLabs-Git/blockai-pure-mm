// static/js/wallet_warmup.js

// Global variables to track warmup instances
const warmupInstances = {};
let pollInterval = null;

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for the start/stop buttons
    setupEventListeners();
    
    // Initialize token inputs based on dropdown value
    updateTokenInputs('1', document.getElementById('tokenCount-1').value);
    
    // Set up event listener for token count dropdown
    document.getElementById('tokenCount-1').addEventListener('change', function() {
        updateTokenInputs('1', this.value);
    });
    
    // Load saved state if available
    loadWarmupState();
});

// Set up event listeners for the UI elements
function setupEventListeners() {
    // Start warmup button
    document.querySelector('.start-warmup-btn[data-instance="1"]').addEventListener('click', function() {
        const instanceId = this.getAttribute('data-instance');
        startWarmup(instanceId);
    });
    
    // Stop warmup button
    document.querySelector('.stop-warmup-btn[data-instance="1"]').addEventListener('click', function() {
        const instanceId = this.getAttribute('data-instance');
        stopWarmup(instanceId);
    });
    
    // Clear log button
    document.querySelector('.clear-log-btn[data-instance="1"]').addEventListener('click', function() {
        const instanceId = this.getAttribute('data-instance');
        clearLog(instanceId);
    });
    
    // CSV file input handling
    document.getElementById('csvFile-1').addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            readCSVFile(this.files[0], '1');
        }
    });
}

// Update token input fields based on the selected count
function updateTokenInputs(instanceId, count) {
    const container = document.getElementById(`tokenInputsContainer-${instanceId}`);
    const currentCount = container.querySelectorAll('.token-input-group').length;
    
    // Convert to number
    count = parseInt(count);
    
    // Add or remove token input fields as needed
    if (count > currentCount) {
        // Add more token input fields
        for (let i = currentCount + 1; i <= count; i++) {
            const tokenGroup = document.createElement('div');
            tokenGroup.className = 'token-input-group mb-3';
            tokenGroup.setAttribute('data-token', i);
            tokenGroup.setAttribute('data-instance', instanceId);
            
            tokenGroup.innerHTML = `
                <label for="tokenAddress-${instanceId}-${i}" class="form-label">Token Address ${i}</label>
                <input type="text" class="form-control" id="tokenAddress-${instanceId}-${i}" 
                       placeholder="Enter token address">
                <div class="form-text">The Solana token address to use for transactions.</div>
            `;
            
            container.appendChild(tokenGroup);
        }
    } else if (count < currentCount) {
        // Remove excess token input fields
        const tokenGroups = container.querySelectorAll('.token-input-group');
        for (let i = count + 1; i <= currentCount; i++) {
            const groupToRemove = container.querySelector(`.token-input-group[data-token="${i}"][data-instance="${instanceId}"]`);
            if (groupToRemove) {
                container.removeChild(groupToRemove);
            }
        }
    }
    
    // Update CSS to show only the active token inputs
    const allGroups = container.querySelectorAll('.token-input-group');
    allGroups.forEach(group => {
        const tokenNum = parseInt(group.getAttribute('data-token'));
        if (tokenNum <= count) {
            group.classList.add('active');
            group.style.display = 'block';
        } else {
            group.classList.remove('active');
            group.style.display = 'none';
        }
    });
}

// Read CSV file and populate the textarea
function readCSVFile(file, instanceId) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        
        // Find the private_key column index
        const headers = lines[0].split(',');
        const keyIndex = headers.findIndex(h => h.trim().toLowerCase() === 'private_key');
        
        if (keyIndex === -1) {
            addLogEntry(instanceId, 'CSV file does not have a "private_key" column', 'error');
            return;
        }
        
        // Extract private keys
        const privateKeys = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const columns = lines[i].split(',');
            if (columns[keyIndex] && columns[keyIndex].trim() !== '') {
                privateKeys.push(columns[keyIndex].trim());
            }
        }
        
        // Update the textarea
        document.getElementById(`privateKeys-${instanceId}`).value = privateKeys.join('\n');
        
        addLogEntry(instanceId, `Loaded ${privateKeys.length} private keys from CSV file`, 'info');
    };
    
    reader.onerror = function() {
        addLogEntry(instanceId, 'Error reading CSV file', 'error');
    };
    
    reader.readAsText(file);
}

// Add an entry to the transaction log
function addLogEntry(instanceId, message, type = 'info') {
    const log = document.getElementById(`transactionLog-${instanceId}`);
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// Clear the transaction log
function clearLog(instanceId) {
    const log = document.getElementById(`transactionLog-${instanceId}`);
    log.innerHTML = '';
    addLogEntry(instanceId, 'Log cleared', 'info');
}

// Start the wallet warmup process
function startWarmup(instanceId) {
    // Get configuration values
    const isSimulation = document.getElementById('enableTestMode').checked;
    const gasFeeLamports = document.getElementById(`gasFeeLamports-${instanceId}`).value;
    const priorityFeeLamports = document.getElementById(`priorityFeeLamports-${instanceId}`).value;
    
    // Get private keys
    let privateKeys = [];
    if (document.getElementById(`csvUpload-${instanceId}`).checked) {
        // Keys should have been loaded from CSV
        const textarea = document.getElementById(`privateKeys-${instanceId}`);
        if (textarea.value.trim()) {
            privateKeys = textarea.value.trim().split('\n');
        } else {
            addLogEntry(instanceId, 'No private keys loaded from CSV', 'error');
            return;
        }
    } else {
        // Get keys from textarea
        const keysText = document.getElementById(`privateKeys-${instanceId}`).value.trim();
        if (keysText) {
            privateKeys = keysText.split('\n').filter(key => key.trim() !== '');
        }
    }
    
    if (privateKeys.length === 0) {
        addLogEntry(instanceId, 'No private keys provided', 'error');
        return;
    }
    
    // Get token addresses
    const tokenCount = parseInt(document.getElementById(`tokenCount-${instanceId}`).value);
    const tokenAddresses = [];
    
    for (let i = 1; i <= tokenCount; i++) {
        const tokenInput = document.getElementById(`tokenAddress-${instanceId}-${i}`);
        if (tokenInput && tokenInput.value.trim()) {
            tokenAddresses.push(tokenInput.value.trim());
        }
    }
    
    if (tokenAddresses.length === 0) {
        addLogEntry(instanceId, 'No token addresses provided', 'error');
        return;
    }
    
    // Get other configuration options
    const shuffleWallets = document.getElementById(`shuffleWallets-${instanceId}`).checked;
    const randomizeAmounts = document.getElementById(`randomizeAmounts-${instanceId}`).checked;
    
    // Create the configuration object to send to the server
    const config = {
        instance_id: `warmup_${new Date().getTime()}`,
        wallets: privateKeys,
        tokens: tokenAddresses,
        amount: 0.05, // Default amount in SOL
        time_period: 60, // Default time period in seconds
        rpc_url: 'https://mainnet.helius-rpc.com/?api-key=348d9ad3-98f8-48da-a636-959d0397c115', // Default RPC URL
        gas_fee: parseInt(gasFeeLamports),
        priority_fee: parseInt(priorityFeeLamports),
        shuffle_wallets: shuffleWallets,
        randomize_amounts: randomizeAmounts,
        simulation_mode: isSimulation
    };
    
    // Update the UI to show the process is starting
    addLogEntry(instanceId, 'Starting wallet warmup process...', 'info');
    document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).disabled = true;
    
    // In simulation mode, we'll just simulate the process locally
    if (isSimulation) {
        simulateWarmup(instanceId, config);
        return;
    }
    
    // Otherwise, make an API call to the backend
    fetch('/api/solana/start_warmup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Store the instance ID
            warmupInstances[instanceId] = data.instance_id;
            
            // Update UI
            addLogEntry(instanceId, `Warmup process started with ID: ${data.instance_id}`, 'success');
            document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).style.display = 'none';
            document.querySelector(`.stop-warmup-btn[data-instance="${instanceId}"]`).style.display = 'block';
            
            // Start polling for logs
            startLogPolling();
            
            // Save state
            saveWarmupState(instanceId, config, data.instance_id);
        } else {
            addLogEntry(instanceId, `Error: ${data.message}`, 'error');
            document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).disabled = false;
        }
    })
    .catch(error => {
        addLogEntry(instanceId, `Network error: ${error.message}`, 'error');
        document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).disabled = false;
    });
}

// Simulate the warmup process (for testing/simulation mode)
function simulateWarmup(instanceId, config) {
    // Create a random instance ID
    const simulationId = `sim_${new Date().getTime()}`;
    warmupInstances[instanceId] = simulationId;
    
    // Update UI
    addLogEntry(instanceId, `SIMULATION MODE: Starting warmup with ${config.wallets.length} wallets and ${config.tokens.length} tokens`, 'info');
    document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).style.display = 'none';
    document.querySelector(`.stop-warmup-btn[data-instance="${instanceId}"]`).style.display = 'block';
    
    // Save simulation state
    saveWarmupState(instanceId, config, simulationId, true);
    
    // Simulation loop
    let cycleCount = 0;
    let mode = "buy";
    let isRunning = true;
    
    function simulationLoop() {
        if (!isRunning) return;
        
        // Process each wallet
        for (let walletIndex = 0; walletIndex < Math.min(config.wallets.length, 3); walletIndex++) {
            const walletId = config.wallets[walletIndex].substring(0, 8) + '...';
            
            // Process each token
            for (let tokenIndex = 0; tokenIndex < config.tokens.length; tokenIndex++) {
                const tokenAddress = config.tokens[tokenIndex];
                const shortTokenAddress = tokenAddress.substring(0, 8) + '...';
                
                setTimeout(() => {
                    if (!isRunning) return;
                    
                    if (mode === "buy") {
                        // Simulate buying a token
                        const randomAmount = config.randomize_amounts ? 
                            (Math.random() * (0.029 - 0.012) + 0.012).toFixed(4) : 
                            0.025;
                        
                        addLogEntry(instanceId, `[SIMULATION] Buying ${randomAmount} SOL worth of ${shortTokenAddress} using wallet ${walletId}`, 'info');
                        
                        // Simulate transaction success after a delay
                        setTimeout(() => {
                            if (!isRunning) return;
                            const txId = 'sim' + Math.random().toString(36).substring(2, 10);
                            addLogEntry(instanceId, `[SIMULATION] Transaction successful: ${txId}`, 'success');
                        }, 2000 + Math.random() * 3000);
                    } else {
                        // Simulate selling a token
                        addLogEntry(instanceId, `[SIMULATION] Selling tokens from ${shortTokenAddress} using wallet ${walletId}`, 'info');
                        
                        // Simulate transaction success after a delay
                        setTimeout(() => {
                            if (!isRunning) return;
                            const txId = 'sim' + Math.random().toString(36).substring(2, 10);
                            addLogEntry(instanceId, `[SIMULATION] Transaction successful: ${txId}`, 'success');
                        }, 2000 + Math.random() * 3000);
                    }
                }, (walletIndex * config.tokens.length + tokenIndex) * 5000);
            }
        }
        
        // Schedule the next cycle
        setTimeout(() => {
            if (!isRunning) return;
            
            cycleCount++;
            mode = mode === "buy" ? "sell" : "buy";
            
            addLogEntry(instanceId, `[SIMULATION] Completed cycle ${cycleCount}. Switching to ${mode} mode.`, 'info');
            
            if (cycleCount < 10) {
                simulationLoop();
            } else {
                addLogEntry(instanceId, `[SIMULATION] Completed all cycles. Stopping simulation.`, 'info');
                stopWarmup(instanceId);
            }
        }, (Math.min(config.wallets.length, 3) * config.tokens.length * 5000) + 10000);
    }
    
    // Start the simulation loop
    simulationLoop();
    
    // Set up the stop button to stop the simulation
    document.querySelector(`.stop-warmup-btn[data-instance="${instanceId}"]`).addEventListener('click', function() {
        isRunning = false;
        addLogEntry(instanceId, `[SIMULATION] Stopping simulation`, 'warning');
        document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).style.display = 'block';
        document.querySelector(`.stop-warmup-btn[data-instance="${instanceId}"]`).style.display = 'none';
    });
}

// Stop the wallet warmup process
function stopWarmup(instanceId) {
    const instanceRealId = warmupInstances[instanceId];
    
    if (!instanceRealId) {
        addLogEntry(instanceId, 'No active warmup process to stop', 'warning');
        return;
    }
    
    // Check if this is a simulation
    if (instanceRealId.startsWith('sim_')) {
        // Just update the UI for simulation
        addLogEntry(instanceId, 'Simulation stopped', 'warning');
        document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).style.display = 'block';
        document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).disabled = false;
        document.querySelector(`.stop-warmup-btn[data-instance="${instanceId}"]`).style.display = 'none';
        delete warmupInstances[instanceId];
        
        // Remove saved state
        localStorage.removeItem(`warmup_state_${instanceId}`);
        return;
    }
    
    // Make an API call to stop the actual process
    fetch('/api/solana/stop_warmup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instance_id: instanceRealId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addLogEntry(instanceId, 'Warmup process stopped', 'warning');
        } else {
            addLogEntry(instanceId, `Error stopping process: ${data.message}`, 'error');
        }
        
        // Update UI
        document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).style.display = 'block';
        document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).disabled = false;
        document.querySelector(`.stop-warmup-btn[data-instance="${instanceId}"]`).style.display = 'none';
        
        // Remove instance from tracking
        delete warmupInstances[instanceId];
        
        // Stop polling if no more instances
        if (Object.keys(warmupInstances).length === 0) {
            stopLogPolling();
        }
        
        // Remove saved state
        localStorage.removeItem(`warmup_state_${instanceId}`);
    })
    .catch(error => {
        addLogEntry(instanceId, `Network error: ${error.message}`, 'error');
    });
}

// Start polling for logs from active warmup processes
function startLogPolling() {
    if (pollInterval) return;
    
    pollInterval = setInterval(() => {
        // Check each instance for logs
        for (const [instanceId, realId] of Object.entries(warmupInstances)) {
            // Skip simulations
            if (realId.startsWith('sim_')) continue;
            
            // Poll for logs
            fetch(`/api/solana/warmup_logs?instance_id=${realId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Get the log element
                    const log = document.getElementById(`transactionLog-${instanceId}`);
                    
                    // Count existing log entries
                    const existingCount = log.querySelectorAll('.log-entry').length;
                    
                    // Add new log entries if any
                    if (data.logs && data.logs.length > existingCount) {
                        for (let i = existingCount; i < data.logs.length; i++) {
                            const entry = document.createElement('div');
                            
                            // Determine the log type
                            let type = 'info';
                            if (data.logs[i].includes('ERROR') || data.logs[i].includes('Error')) {
                                type = 'error';
                            } else if (data.logs[i].includes('success')) {
                                type = 'success';
                            } else if (data.logs[i].includes('warning') || data.logs[i].includes('stopping')) {
                                type = 'warning';
                            }
                            
                            entry.className = `log-entry log-${type}`;
                            entry.textContent = data.logs[i];
                            log.appendChild(entry);
                        }
                        
                        // Scroll to bottom
                        log.scrollTop = log.scrollHeight;
                    }
                }
            })
            .catch(error => {
                console.error(`Error polling logs: ${error.message}`);
            });
            
            // Also check status to detect if process has stopped
            fetch(`/api/solana/warmup_status?instance_id=${realId}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'stopped' || data.status === 'error' || data.status === 'not_found') {
                    // Process has stopped, update UI
                    document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).style.display = 'block';
                    document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`).disabled = false;
                    document.querySelector(`.stop-warmup-btn[data-instance="${instanceId}"]`).style.display = 'none';
                    
                    // Add a log entry
                    if (data.status === 'error') {
                        addLogEntry(instanceId, `Process error: ${data.error || 'Unknown error'}`, 'error');
                    } else if (data.status === 'stopped') {
                        addLogEntry(instanceId, 'Process has completed or was stopped', 'info');
                    }
                    
                    // Remove from tracking
                    delete warmupInstances[instanceId];
                    
                    // Remove saved state
                    localStorage.removeItem(`warmup_state_${instanceId}`);
                }
            })
            .catch(error => {
                console.error(`Error checking status: ${error.message}`);
            });
        }
        
        // Stop polling if no more instances
        if (Object.keys(warmupInstances).length === 0) {
            stopLogPolling();
        }
    }, 5000);
}

// Stop polling for logs
function stopLogPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// Save the current warmup state
function saveWarmupState(instanceId, config, processId, isSimulation = false) {
    const state = {
        config: config,
        process_id: processId,
        is_simulation: isSimulation,
        timestamp: new Date().getTime()
    };
    
    localStorage.setItem(`warmup_state_${instanceId}`, JSON.stringify(state));
    
    // Also save to server for persistence across sessions
    if (!isSimulation) {
        fetch('/api/save_feature_state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                feature_id: `warmup_${instanceId}`,
                feature_data: state
            })
        }).catch(error => {
            console.error('Error saving state to server:', error);
        });
    }
}

// Load saved warmup state
function loadWarmupState() {
    // Check for saved state in localStorage
    for (let i = 1; i <= 10; i++) {
        const savedState = localStorage.getItem(`warmup_state_${i}`);
        
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                
                // Check if the state is still valid (less than 1 day old)
                const isRecent = (new Date().getTime() - state.timestamp) < 86400000; // 24 hours
                
                if (isRecent) {
                    // Restore the state
                    restoreWarmupState(i.toString(), state);
                } else {
                    // State is too old, remove it
                    localStorage.removeItem(`warmup_state_${i}`);
                }
            } catch (e) {
                console.error(`Error parsing saved state for instance ${i}:`, e);
            }
        }
    }
}

// Restore warmup state from saved data
function restoreWarmupState(instanceId, state) {
    // Only restore if this is instance 1 (we only have one UI instance right now)
    if (instanceId !== '1') return;
    
    // Fill in form fields
    document.getElementById(`privateKeys-${instanceId}`).value = state.config.wallets.join('\n');
    document.getElementById(`tokenCount-${instanceId}`).value = state.config.tokens.length;
    
    // Update token inputs
    updateTokenInputs(instanceId, state.config.tokens.length);
    
    // Set token addresses
    for (let i = 0; i < state.config.tokens.length; i++) {
        const tokenInput = document.getElementById(`tokenAddress-${instanceId}-${i+1}`);
        if (tokenInput) {
            tokenInput.value = state.config.tokens[i];
        }
    }
    
    // Set other options
    document.getElementById(`shuffleWallets-${instanceId}`).checked = state.config.shuffle_wallets;
    document.getElementById(`randomizeAmounts-${instanceId}`).checked = state.config.randomize_amounts;
    document.getElementById('enableTestMode').checked = state.config.simulation_mode;
    
    // Add log entry
    addLogEntry(instanceId, 'Restored previous warmup configuration', 'info');
}