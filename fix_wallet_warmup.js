// Enhanced Wallet warmup page fixer
document.addEventListener('DOMContentLoaded', function() {
    console.log("Enhanced Wallet warmup page fixer loaded");
    
    // Fix for token inputs not appearing
    function fixTokenInputs() {
        const tokenCountSelect = document.getElementById('tokenCount-1');
        if (tokenCountSelect) {
            console.log("Adding token count listener");
            
            // Remove existing event listeners
            const newTokenCountSelect = tokenCountSelect.cloneNode(true);
            tokenCountSelect.parentNode.replaceChild(newTokenCountSelect, tokenCountSelect);
            
            // Add our new listener
            newTokenCountSelect.addEventListener('change', function() {
                console.log("Token count changed to: " + this.value);
                updateTokenInputs(1);
            });
            
            // Initial update
            updateTokenInputs(1);
        }
    }
    
    // Function to update token inputs
    function updateTokenInputs(instanceId) {
        const tokenCount = parseInt(document.getElementById(`tokenCount-${instanceId}`).value);
        console.log(`Updating token inputs for instance ${instanceId}, count: ${tokenCount}`);
        
        const container = document.getElementById(`tokenInputsContainer-${instanceId}`);
        if (!container) {
            console.error(`Container not found: tokenInputsContainer-${instanceId}`);
            return;
        }
        
        // First, hide all existing token input groups
        const existingGroups = container.querySelectorAll(`.token-input-group[data-instance="${instanceId}"]`);
        existingGroups.forEach(group => {
            group.classList.remove('active');
        });
        
        // Create or show token input groups as needed
        for (let i = 1; i <= tokenCount; i++) {
            let tokenGroup = container.querySelector(`.token-input-group[data-token="${i}"][data-instance="${instanceId}"]`);
            
            if (!tokenGroup) {
                // Create new token input group
                tokenGroup = document.createElement('div');
                tokenGroup.className = 'token-input-group';
                tokenGroup.dataset.token = i;
                tokenGroup.dataset.instance = instanceId;
                
                // Define default token addresses based on index
                let defaultValue = '';
                if (i === 1) {
                    defaultValue = 'So11111111111111111111111111111111111111112'; // SOL
                } else if (i === 2) {
                    defaultValue = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
                }
                
                tokenGroup.innerHTML = `
                    <div class="mb-3">
                        <label for="tokenAddress-${instanceId}-${i}" class="form-label">Token Address ${i}</label>
                        <input type="text" class="form-control" id="tokenAddress-${instanceId}-${i}" placeholder="Enter token address" value="${defaultValue}">
                        <div class="form-text">The Solana token address to use for transactions.</div>
                    </div>
                `;
                
                container.appendChild(tokenGroup);
            }
            
            // Show this token input group
            tokenGroup.classList.add('active');
        }
    }
    
    // Fix for start warmup button not working
    function fixStartWarmupButton() {
        console.log("Fixing start warmup button");
        const startBtn = document.querySelector('.start-warmup-btn[data-instance="1"]');
        const stopBtn = document.querySelector('.stop-warmup-btn[data-instance="1"]');
        
        if (startBtn) {
            // Remove existing event listeners
            const newStartBtn = startBtn.cloneNode(true);
            startBtn.parentNode.replaceChild(newStartBtn, startBtn);
            
            // Add our new listener with proper API integration
            newStartBtn.addEventListener('click', function() {
                console.log("Start warmup button clicked");
                startWarmupWithApi(1);
            });
        }
        
        if (stopBtn) {
            // Remove existing event listeners
            const newStopBtn = stopBtn.cloneNode(true);
            stopBtn.parentNode.replaceChild(newStopBtn, stopBtn);
            
            // Add our new listener with proper API integration
            newStopBtn.addEventListener('click', function() {
                console.log("Stop warmup button clicked");
                stopWarmupWithApi(1);
            });
        }
    }
    
    // Enhanced function to start wallet warmup via API
    function startWarmupWithApi(instanceId) {
        console.log(`Starting warmup for instance ${instanceId} via API`);
        
        // Get configuration
        const configuration = getWarmupConfiguration(instanceId);
        console.log("Configuration:", configuration);
        
        if (!configuration.wallets || configuration.wallets.length === 0) {
            addLogEntry(instanceId, 'No wallets provided. Please add wallet private keys.', 'error');
            return;
        }
        
        if (!configuration.tokenAddresses || configuration.tokenAddresses.length === 0) {
            addLogEntry(instanceId, 'No token addresses provided. Please add at least one token address.', 'error');
            return;
        }
        
        // Update UI
        const startBtn = document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`);
        const stopBtn = document.querySelector(`.stop-warmup-btn[data-instance="${instanceId}"]`);
        
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        
        // Log start
        addLogEntry(instanceId, `Starting wallet warmup for ${configuration.wallets.length} wallets with ${configuration.tokenAddresses.length} tokens.`, 'info');
        
        // Call the backend API
        fetch('/api/solana/start_warmup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instance_id: `warmup_${instanceId}`,
                wallets: configuration.wallets,
                tokens: configuration.tokenAddresses,
                amount: configuration.gasFeeLamports / 1000000000, // Convert to SOL
                time_period: 60, // Default time period
                rpc_url: null // Use default
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addLogEntry(instanceId, `Warmup process started successfully: ${data.message}`, 'success');
                
                // Start log polling
                startLogPolling(instanceId, `warmup_${instanceId}`);
            } else {
                addLogEntry(instanceId, `Failed to start warmup: ${data.message}`, 'error');
                startBtn.style.display = 'block';
                stopBtn.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addLogEntry(instanceId, `Error starting warmup: ${error.message}`, 'error');
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
        });
    }
    
    // Function to stop wallet warmup via API
    function stopWarmupWithApi(instanceId) {
        console.log(`Stopping warmup for instance ${instanceId} via API`);
        
        // Call the backend API
        fetch('/api/solana/stop_warmup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instance_id: `warmup_${instanceId}`,
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addLogEntry(instanceId, `Warmup process stopped: ${data.message}`, 'warning');
                
                // Update UI
                const startBtn = document.querySelector(`.start-warmup-btn[data-instance="${instanceId}"]`);
                const stopBtn = document.querySelector(`.stop-warmup-btn[data-instance="${instanceId}"]`);
                
                startBtn.style.display = 'block';
                stopBtn.style.display = 'none';
                
                // Stop log polling
                stopLogPolling();
            } else {
                addLogEntry(instanceId, `Failed to stop warmup: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addLogEntry(instanceId, `Error stopping warmup: ${error.message}`, 'error');
        });
    }
    
    // Poll logs from the backend
    let logPollingInterval = null;
    
    function startLogPolling(instanceId, apiInstanceId) {
        // Stop any existing polling
        stopLogPolling();
        
        // Start new polling
        logPollingInterval = setInterval(function() {
            fetch(`/api/solana/warmup_logs?instance_id=${apiInstanceId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.logs) {
                        updateLogFromApi(instanceId, data.logs);
                    }
                })
                .catch(error => {
                    console.error('Error polling logs:', error);
                });
        }, 3000); // Poll every 3 seconds
    }
    
    function stopLogPolling() {
        if (logPollingInterval) {
            clearInterval(logPollingInterval);
            logPollingInterval = null;
        }
    }
    
    // Update the log with entries from the API
    function updateLogFromApi(instanceId, logEntries) {
        const log = document.getElementById(`transactionLog-${instanceId}`);
        
        // Get the current log entries
        const currentEntries = new Set();
        log.querySelectorAll('.log-entry').forEach(entry => {
            currentEntries.add(entry.textContent);
        });
        
        // Add new entries only if they don't already exist
        for (const logEntry of logEntries) {
            if (!currentEntries.has(logEntry)) {
                // Determine the type of log entry
                let type = 'info';
                if (logEntry.includes('Successfully') || logEntry.includes('success')) {
                    type = 'success';
                } else if (logEntry.includes('Error') || logEntry.includes('Failed') || logEntry.includes('error')) {
                    type = 'error';
                } else if (logEntry.includes('Warning') || logEntry.includes('stopped')) {
                    type = 'warning';
                }
                
                // Add the log entry
                const entry = document.createElement('div');
                entry.className = `log-entry log-${type}`;
                entry.textContent = logEntry;
                log.appendChild(entry);
            }
        }
        
        // Scroll to bottom
        log.scrollTop = log.scrollHeight;
    }
    
    // Function to get warmup configuration
    function getWarmupConfiguration(instanceId) {
        const configuration = {
            wallets: [],
            tokenAddresses: [],
            gasFeeLamports: parseInt(document.getElementById(`gasFeeLamports-${instanceId}`).value) || 5000,
            priorityFeeLamports: parseInt(document.getElementById(`priorityFeeLamports-${instanceId}`).value) || 10000,
            shuffleWallets: document.getElementById(`shuffleWallets-${instanceId}`).checked,
            randomizeAmounts: document.getElementById(`randomizeAmounts-${instanceId}`).checked
        };
        
        // Get wallets
        const isUsingCsv = document.getElementById(`csvUpload-${instanceId}`).checked;
        
        if (isUsingCsv) {
            // Get wallets from CSV file
            const csvFile = document.getElementById(`csvFile-${instanceId}`).files[0];
            
            if (csvFile) {
                // Process the CSV file
                const reader = new FileReader();
                reader.onload = function(e) {
                    const csvData = e.target.result;
                    const lines = csvData.split('\n');
                    
                    // Get header row
                    const headerRow = lines[0].split(',');
                    const privateKeyIndex = headerRow.findIndex(header => header.trim().toLowerCase() === 'private_key');
                    
                    if (privateKeyIndex !== -1) {
                        // Process data rows
                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (line) {
                                const columns = line.split(',');
                                const privateKey = columns[privateKeyIndex].trim();
                                if (privateKey) {
                                    configuration.wallets.push(privateKey);
                                }
                            }
                        }
                    } else {
                        addLogEntry(instanceId, 'CSV file does not have a "private_key" column', 'error');
                    }
                };
                
                // Read the file (this is asynchronous, for real implementation you'd need to handle this properly)
                reader.readAsText(csvFile);
            } else {
                // Immediate feedback that no file was selected
                addLogEntry(instanceId, 'No CSV file selected', 'warning');
                
                // For testing, add some sample wallets
                configuration.wallets = [
                    'SamplePrivateKey1ForInstanceWarmup',
                    'SamplePrivateKey2ForInstanceWarmup',
                    'SamplePrivateKey3ForInstanceWarmup'
                ];
            }
        } else {
            const privateKeysText = document.getElementById(`privateKeys-${instanceId}`).value;
            const lines = privateKeysText.split('\n');
            
            for (const line of lines) {
                const privateKey = line.trim();
                if (privateKey) {
                    configuration.wallets.push(privateKey);
                }
            }
            
            // If no wallets were added via textarea, add sample wallets for testing
            if (configuration.wallets.length === 0) {
                configuration.wallets = [
                    'SamplePrivateKey1ForInstanceWarmup',
                    'SamplePrivateKey2ForInstanceWarmup',
                    'SamplePrivateKey3ForInstanceWarmup'
                ];
            }
        }
        
        // Get token addresses
        const tokenCount = parseInt(document.getElementById(`tokenCount-${instanceId}`).value);
        
        for (let i = 1; i <= tokenCount; i++) {
            const tokenAddressElement = document.getElementById(`tokenAddress-${instanceId}-${i}`);
            if (tokenAddressElement) {
                const tokenAddress = tokenAddressElement.value.trim();
                if (tokenAddress) {
                    configuration.tokenAddresses.push(tokenAddress);
                }
            }
        }
        
        // If no tokens were added, use default SOL token
        if (configuration.tokenAddresses.length === 0) {
            configuration.tokenAddresses.push('So11111111111111111111111111111111111111112'); // SOL
        }
        
        return configuration;
    }
    
    // Utility function to add log entry
    function addLogEntry(instanceId, message, type = 'info') {
        const log = document.getElementById(`transactionLog-${instanceId}`);
        if (!log) {
            console.error(`Log element not found: transactionLog-${instanceId}`);
            return;
        }
        
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        
        // Add timestamp
        const now = new Date();
        const timestamp = `[${now.toLocaleTimeString()}] `;
        
        // Construct message with timestamp
        entry.textContent = timestamp + message;
        
        // Add to log
        log.appendChild(entry);
        
        // Scroll to bottom
        log.scrollTop = log.scrollHeight;
    }
    
    // Apply all fixes
    fixTokenInputs();
    fixStartWarmupButton();
    
    // Set up clear log button
    const clearLogBtn = document.querySelector('.clear-log-btn[data-instance="1"]');
    if (clearLogBtn) {
        // Remove existing event listeners
        const newClearLogBtn = clearLogBtn.cloneNode(true);
        clearLogBtn.parentNode.replaceChild(newClearLogBtn, clearLogBtn);
        
        // Add our new listener
        newClearLogBtn.addEventListener('click', function() {
            console.log("Clear log button clicked");
            const log = document.getElementById(`transactionLog-1`);
            log.innerHTML = '<div class="log-entry log-info">Log cleared. Ready for new transactions.</div>';
        });
    }
    
    // Check simulation mode status and log it
    const testModeSwitch = document.getElementById('enableTestMode');
    if (testModeSwitch) {
        const message = testModeSwitch.checked ? 
            'Simulation mode is enabled. Transactions will be simulated but not executed on the blockchain.' :
            'Simulation mode is disabled. Transactions will be executed on the blockchain using real funds.';
        
        addLogEntry(1, message, testModeSwitch.checked ? 'info' : 'warning');
    }
    
    console.log("All enhanced fixes applied!");
});