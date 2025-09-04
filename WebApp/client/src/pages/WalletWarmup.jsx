import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

const WalletWarmup = () => {
  const { currentProject, updateProject, addLog: addProjectLog } = useProject();
  const navigate = useNavigate();
  
  // State Management
  const [simulationMode, setSimulationMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [instanceId, setInstanceId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({
    gasFee: 100000,
    priorityFee: 1000000,
    wallets: '',
    tokenCount: 2,
    tokens: ['Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
    timeBetweenTx: 60,
    shuffleWallets: true,
    randomizeAmounts: true
  });

  const logPollingInterval = useRef(null);
  const logContainerRef = useRef(null);

  // Load saved state on mount
  useEffect(() => {
    if (!currentProject) return;
    
    // Load warmup config from project settings
    if (currentProject.settings?.warmupConfig) {
      setConfig(prev => ({ ...prev, ...currentProject.settings.warmupConfig }));
    } else {
      // Fallback to localStorage for backward compatibility
      const savedState = localStorage.getItem('walletWarmupState');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setConfig(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Error loading saved state:', error);
        }
      }
    }
  }, [currentProject]);

  // Save state when config changes
  useEffect(() => {
    if (!currentProject) return;
    
    // Save to localStorage for backward compatibility
    localStorage.setItem('walletWarmupState', JSON.stringify(config));
    
    // Save to project settings
    const saveToProject = async () => {
      try {
        await updateProject(currentProject._id, {
          settings: {
            ...currentProject.settings,
            warmupConfig: config
          }
        });
      } catch (error) {
        console.error('Error saving warmup config to project:', error);
      }
    };
    
    // Debounce the save
    const timeoutId = setTimeout(saveToProject, 1000);
    return () => clearTimeout(timeoutId);
  }, [config, currentProject, updateProject]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (logPollingInterval.current) {
        clearInterval(logPollingInterval.current);
      }
    };
  }, []);

  const updateTokenInputs = (count) => {
    const newTokens = [...config.tokens];
    if (count > newTokens.length) {
      // Add default tokens
      while (newTokens.length < count) {
        newTokens.push('');
      }
    } else {
      // Remove excess tokens
      newTokens.splice(count);
    }
    setConfig(prev => ({ ...prev, tokenCount: count, tokens: newTokens }));
  };

  const handleTokenChange = (index, value) => {
    const newTokens = [...config.tokens];
    newTokens[index] = value;
    setConfig(prev => ({ ...prev, tokens: newTokens }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Find header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const privateKeyIndex = headers.findIndex(h => h.includes('private') && h.includes('key'));
      
      if (privateKeyIndex === -1) {
        toast.error('CSV must contain a "private_key" column');
        return;
      }

      // Extract private keys
      const privateKeys = lines.slice(1)
        .map(line => line.split(',')[privateKeyIndex]?.trim())
        .filter(key => key && key.length > 0);

      if (privateKeys.length === 0) {
        toast.error('No valid private keys found in CSV');
        return;
      }

      setConfig(prev => ({ ...prev, wallets: privateKeys.join('\n') }));
      toast.success(`Loaded ${privateKeys.length} wallets from CSV`);
    } catch (error) {
      toast.error('Error reading CSV file: ' + error.message);
    }
  };

  const startLogPolling = () => {
    if (logPollingInterval.current) {
      clearInterval(logPollingInterval.current);
    }

    logPollingInterval.current = setInterval(async () => {
      if (!instanceId) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/warmup/logs/${instanceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (data.success && data.logs) {
          setLogs(data.logs);
        }

        // Check status
        const statusResponse = await fetch(`/api/warmup/status/${instanceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const statusData = await statusResponse.json();
        
        if (statusData.success && statusData.status !== 'running') {
          setIsRunning(false);
          clearInterval(logPollingInterval.current);
          toast.info('Warmup process completed');
        }
      } catch (error) {
        console.error('Error polling logs:', error);
      }
    }, 5000);
  };

  const simulateWarmup = async () => {
    const walletCount = config.wallets.split('\n').filter(w => w.trim()).length;
    const messages = [
      'Starting wallet warmup simulation...',
      `Loaded ${walletCount} wallets`,
      `Using ${config.tokenCount} tokens for warmup`,
      'Simulation mode - no real transactions',
      'Wallet 1: Simulating buy transaction...',
      'Transaction successful (simulated)',
      'Waiting 60 seconds...',
      'Wallet 2: Simulating sell transaction...',
      'Transaction successful (simulated)',
      'Warmup simulation complete!'
    ];

    let index = 0;
    const interval = setInterval(async () => {
      if (index < messages.length) {
        await addLog(messages[index], index < 4 ? 'info' : 'success');
        index++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
        toast.success('Simulation completed');
      }
    }, 1000);
  };

  const startWarmup = async () => {
    if (!currentProject) {
      toast.error('Please select a project first');
      navigate('/projects');
      return;
    }
    
    if (simulationMode) {
      setIsRunning(true);
      setLogs([]);
      await addLog(`Starting wallet warmup simulation for project: ${currentProject.name}`, 'info');
      simulateWarmup();
      return;
    }

    // Validate inputs
    const walletList = config.wallets.split('\n').filter(w => w.trim());
    if (walletList.length === 0) {
      toast.error('Please enter at least one wallet private key');
      return;
    }

    const validTokens = config.tokens.slice(0, config.tokenCount).filter(t => t.trim());
    if (validTokens.length === 0) {
      toast.error('Please enter at least one token address');
      return;
    }

    try {
      setIsRunning(true);
      setLogs([]);
      
      const newInstanceId = `warmup_${Date.now()}`;
      setInstanceId(newInstanceId);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/warmup/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          instanceId: newInstanceId,
          projectId: currentProject._id,
          projectName: currentProject.name,
          wallets: walletList,
          tokens: validTokens,
          gasFee: config.gasFee,
          priorityFee: config.priorityFee,
          timeBetweenTx: config.timeBetweenTx,
          shuffleWallets: config.shuffleWallets,
          randomizeAmounts: config.randomizeAmounts
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Warmup started successfully');
        await addLog(`Warmup process started for project: ${currentProject.name}`, 'success');
        await addLog(`Instance ID: ${newInstanceId}`, 'info');
        await addLog(`Wallets: ${walletList.length}, Tokens: ${validTokens.length}`, 'info');
        startLogPolling();
      } else {
        throw new Error(data.message || 'Failed to start warmup');
      }
    } catch (error) {
      console.error('Error starting warmup:', error);
      toast.error('Failed to start warmup: ' + error.message);
      await addLog(`Error starting warmup: ${error.message}`, 'error');
      setIsRunning(false);
    }
  };

  const stopWarmup = async () => {
    if (simulationMode || !instanceId) {
      setIsRunning(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/warmup/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ instanceId })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Warmup stopped');
        await addLog('Warmup process stopped by user', 'warning');
        setIsRunning(false);
        clearInterval(logPollingInterval.current);
      } else {
        throw new Error(data.message || 'Failed to stop warmup');
      }
    } catch (error) {
      console.error('Error stopping warmup:', error);
      toast.error('Failed to stop warmup: ' + error.message);
      await addLog(`Error stopping warmup: ${error.message}`, 'error');
    }
  };

  const addLog = async (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    
    // Log to project if available
    if (currentProject && addProjectLog) {
      try {
        await addProjectLog('wallet_warmup', message, type, {
          instanceId,
          simulationMode
        });
      } catch (error) {
        console.error('Error logging to project:', error);
      }
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogClass = (type) => {
    switch (type) {
      case 'success': return 'text-success';
      case 'error': return 'text-danger';
      case 'warning': return 'text-warning';
      default: return 'text-info';
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h1>Solana Wallet WarmUp</h1>
          <p className="text-muted">
            Keep your Solana wallets active by simulating trading activity with various tokens
          </p>
          {currentProject ? (
            <div className="alert alert-info mt-2">
              <i className="bi bi-folder-fill me-2"></i>
              Project: <strong>{currentProject.name}</strong>
            </div>
          ) : (
            <div className="alert alert-warning mt-2">
              <i className="bi bi-exclamation-triangle me-2"></i>
              No project selected. Please <a href="/dashboard" className="alert-link">select a project</a> before using wallet warmup.
            </div>
          )}
        </div>
        <div className="col-auto">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="simulationMode"
              checked={simulationMode}
              onChange={(e) => setSimulationMode(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="simulationMode">
              Simulation Mode
            </label>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Configuration Panel */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Configuration</h5>
            </div>
            <div className="card-body">
              {/* Gas Settings */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Gas Fee (Lamports)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.gasFee}
                    onChange={(e) => setConfig(prev => ({ ...prev, gasFee: parseInt(e.target.value) || 0 }))}
                    disabled={isRunning}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Priority Fee (Lamports)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.priorityFee}
                    onChange={(e) => setConfig(prev => ({ ...prev, priorityFee: parseInt(e.target.value) || 0 }))}
                    disabled={isRunning}
                  />
                </div>
              </div>

              {/* Wallet Input */}
              <div className="mb-3">
                <label className="form-label">
                  Wallet Private Keys
                  <button
                    className="btn btn-sm btn-link"
                    onClick={() => document.getElementById('csvUpload').click()}
                    disabled={isRunning}
                  >
                    Upload CSV
                  </button>
                </label>
                <textarea
                  className="form-control font-monospace"
                  rows="4"
                  placeholder="Enter private keys (one per line) or upload CSV"
                  value={config.wallets}
                  onChange={(e) => setConfig(prev => ({ ...prev, wallets: e.target.value }))}
                  disabled={isRunning}
                />
                <input
                  type="file"
                  id="csvUpload"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={isRunning}
                />
              </div>

              {/* Token Configuration */}
              <div className="mb-3">
                <label className="form-label">Number of Tokens</label>
                <select
                  className="form-select"
                  value={config.tokenCount}
                  onChange={(e) => updateTokenInputs(parseInt(e.target.value))}
                  disabled={isRunning}
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Token Inputs */}
              {[...Array(config.tokenCount)].map((_, index) => (
                <div key={index} className="mb-3">
                  <label className="form-label">Token {index + 1} Address</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="Enter token address"
                    value={config.tokens[index] || ''}
                    onChange={(e) => handleTokenChange(index, e.target.value)}
                    disabled={isRunning}
                  />
                  {index === 0 && (
                    <div className="form-text">Default: USDT (Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB)</div>
                  )}
                  {index === 1 && (
                    <div className="form-text">Default: USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)</div>
                  )}
                </div>
              ))}

              {/* Additional Settings */}
              <div className="mb-3">
                <label className="form-label">Time Between Transactions (seconds)</label>
                <input
                  type="number"
                  className="form-control"
                  value={config.timeBetweenTx}
                  onChange={(e) => setConfig(prev => ({ ...prev, timeBetweenTx: parseInt(e.target.value) || 60 }))}
                  disabled={isRunning}
                />
              </div>

              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="shuffleWallets"
                    checked={config.shuffleWallets}
                    onChange={(e) => setConfig(prev => ({ ...prev, shuffleWallets: e.target.checked }))}
                    disabled={isRunning}
                  />
                  <label className="form-check-label" htmlFor="shuffleWallets">
                    Shuffle Wallets
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="randomizeAmounts"
                    checked={config.randomizeAmounts}
                    onChange={(e) => setConfig(prev => ({ ...prev, randomizeAmounts: e.target.checked }))}
                    disabled={isRunning}
                  />
                  <label className="form-check-label" htmlFor="randomizeAmounts">
                    Randomize Transaction Amounts
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex gap-2">
                {!isRunning ? (
                  <button
                    className="btn btn-success"
                    onClick={startWarmup}
                    disabled={!currentProject}
                  >
                    <i className="bi bi-play-fill me-2"></i>
                    Start Warmup
                  </button>
                ) : (
                  <button
                    className="btn btn-danger"
                    onClick={stopWarmup}
                  >
                    <i className="bi bi-stop-fill me-2"></i>
                    Stop Warmup
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Log Panel */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Transaction Log</h5>
              <button
                className="btn btn-sm btn-outline-light"
                onClick={clearLogs}
              >
                Clear
              </button>
            </div>
            <div 
              className="card-body bg-dark text-light"
              style={{ height: '600px', overflowY: 'auto' }}
              ref={logContainerRef}
            >
              {logs.length === 0 ? (
                <p className="text-muted text-center">No logs yet...</p>
              ) : (
                <div className="font-monospace small">
                  {logs.map((log, index) => (
                    <div key={index} className={getLogClass(log.type)}>
                      [{log.timestamp}] {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <div className="modal fade" id="helpModal" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Wallet WarmUp Help</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <h6>What is Wallet WarmUp?</h6>
              <p>
                Wallet WarmUp keeps your Solana wallets active by performing small token swaps at regular intervals.
                This helps maintain wallet activity and can be useful for various purposes.
              </p>
              
              <h6>Configuration Options:</h6>
              <ul>
                <li><strong>Gas Fee:</strong> Base fee for transactions in lamports</li>
                <li><strong>Priority Fee:</strong> Additional fee for faster processing</li>
                <li><strong>Wallets:</strong> Private keys of wallets to warm up</li>
                <li><strong>Tokens:</strong> Token addresses to trade between</li>
                <li><strong>Time Between TX:</strong> Delay between transactions</li>
                <li><strong>Shuffle:</strong> Randomize wallet order</li>
                <li><strong>Randomize Amounts:</strong> Vary transaction amounts</li>
              </ul>
              
              <h6>Simulation Mode:</h6>
              <p>
                Enable simulation mode to test the warmup process without making real transactions.
                This is useful for verifying your configuration before running actual trades.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletWarmup;