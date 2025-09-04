import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Mexc = () => {
  const navigate = useNavigate();
  const [instances, setInstances] = useState([]);
  const [activeInstance, setActiveInstance] = useState(null);
  const [logs, setLogs] = useState({});
  const logContainerRef = useRef(null);
  const updateIntervalRef = useRef(null);
  
  // Password visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  // Configuration state for active instance
  const [config, setConfig] = useState({
    // API Settings
    apiKey: '',
    apiSecret: '',
    testMode: true,
    
    // Trading Settings
    tradingPair: 'BTC/USDT',
    orderAmount: 0.001,
    maxPosition: 10,
    
    // Market Making Settings
    bidSpread: 0.1,
    askSpread: 0.1,
    orderRefreshTime: 30,
    numLevels: 3,
    levelSpacing: 0.05,
    
    // Risk Management
    inventorySkewFactor: 0.1,
    stopLossPercentage: 5,
    minPrice: 0,
    maxPrice: 0,
    
    // Advanced Settings
    useHangingOrders: false,
    hangingOrderLifetime: 300,
    adjustForVolatility: false,
    tradingHoursEnabled: false,
    tradingStartHour: 9,
    tradingEndHour: 17,
    maxOrderRetries: 3,
    webhookUrl: ''
  });

  // Load saved instances on mount
  useEffect(() => {
    const savedInstances = localStorage.getItem('mexcInstances');
    if (savedInstances) {
      try {
        const parsed = JSON.parse(savedInstances);
        setInstances(parsed);
        if (parsed.length > 0 && !activeInstance) {
          setActiveInstance(parsed[0].id);
          loadInstanceConfig(parsed[0].id);
        }
      } catch (error) {
        console.error('Error loading saved instances:', error);
      }
    }
  }, []);

  // Save instances when they change
  useEffect(() => {
    localStorage.setItem('mexcInstances', JSON.stringify(instances));
  }, [instances]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Poll for log updates when instance is running
  useEffect(() => {
    if (activeInstance) {
      const instance = instances.find(i => i.id === activeInstance);
      if (instance && instance.status === 'running') {
        startLogPolling();
      } else {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [activeInstance, instances]);

  const createNewInstance = () => {
    if (instances.length >= 10) {
      toast.error('Maximum 10 instances allowed');
      return;
    }

    const newInstance = {
      id: `mexc_${Date.now()}`,
      name: `Instance ${instances.length + 1}`,
      status: 'stopped',
      createdAt: new Date().toISOString(),
      config: { ...config }
    };

    setInstances([...instances, newInstance]);
    setActiveInstance(newInstance.id);
    setLogs({ ...logs, [newInstance.id]: [] });
    toast.success('New instance created');
  };

  const deleteInstance = (instanceId) => {
    if (instances.length <= 1) {
      toast.error('Cannot delete the last instance');
      return;
    }

    const updatedInstances = instances.filter(i => i.id !== instanceId);
    setInstances(updatedInstances);
    
    if (activeInstance === instanceId && updatedInstances.length > 0) {
      setActiveInstance(updatedInstances[0].id);
      loadInstanceConfig(updatedInstances[0].id);
    }

    // Clean up logs
    const newLogs = { ...logs };
    delete newLogs[instanceId];
    setLogs(newLogs);

    toast.success('Instance deleted');
  };

  const loadInstanceConfig = (instanceId) => {
    const instance = instances.find(i => i.id === instanceId);
    if (instance && instance.config) {
      setConfig(instance.config);
    }
  };

  const saveInstanceConfig = () => {
    const updatedInstances = instances.map(instance => 
      instance.id === activeInstance 
        ? { ...instance, config: { ...config } }
        : instance
    );
    setInstances(updatedInstances);
    toast.success('Configuration saved');
  };

  const startInstance = async () => {
    if (!config.apiKey || !config.apiSecret) {
      toast.error('Please configure API credentials');
      return;
    }

    try {
      const response = await fetch('/api/mexc/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          instanceId: activeInstance,
          config: config
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedInstances = instances.map(instance => 
          instance.id === activeInstance 
            ? { ...instance, status: 'running' }
            : instance
        );
        setInstances(updatedInstances);

        // Start polling for logs
        startLogPolling();
        
        toast.success('Market maker started');
      } else {
        throw new Error(data.message || 'Failed to start market maker');
      }
    } catch (error) {
      console.error('Error starting market maker:', error);
      toast.error('Failed to start market maker: ' + error.message);
    }
  };

  const stopInstance = async () => {
    try {
      const response = await fetch('/api/mexc/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          instanceId: activeInstance
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedInstances = instances.map(instance => 
          instance.id === activeInstance 
            ? { ...instance, status: 'stopped' }
            : instance
        );
        setInstances(updatedInstances);

        // Stop polling
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
        
        toast.info('Market maker stopped');
      } else {
        throw new Error(data.message || 'Failed to stop market maker');
      }
    } catch (error) {
      console.error('Error stopping market maker:', error);
      toast.error('Failed to stop market maker: ' + error.message);
    }
  };

  const addLog = (instanceId, message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { timestamp, message, type };
    
    setLogs(prevLogs => ({
      ...prevLogs,
      [instanceId]: [...(prevLogs[instanceId] || []), newLog].slice(-100) // Keep last 100 logs
    }));
  };

  const startLogPolling = () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    updateIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/mexc/logs/${activeInstance}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();
        
        if (data.success && data.logs) {
          setLogs(prevLogs => ({
            ...prevLogs,
            [activeInstance]: data.logs.map(log => {
              // Parse log string to extract timestamp and message
              const match = log.match(/\[(.*?)\] (.*)/);
              if (match) {
                return {
                  timestamp: match[1],
                  message: match[2],
                  type: log.includes('success') ? 'success' : 
                        log.includes('error') ? 'error' : 
                        log.includes('warning') ? 'warning' : 'info'
                };
              }
              return { timestamp: new Date().toLocaleTimeString(), message: log, type: 'info' };
            })
          }));
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const simulateLogUpdate = (instanceId) => {
    const actions = ['Placed bid order', 'Placed ask order', 'Order filled', 'Cancelled stale order', 'Updated spreads'];
    const types = ['info', 'success', 'info', 'warning', 'info'];
    const randomIndex = Math.floor(Math.random() * actions.length);
    
    addLog(instanceId, actions[randomIndex], types[randomIndex]);
  };

  const clearLogs = () => {
    setLogs(prevLogs => ({
      ...prevLogs,
      [activeInstance]: []
    }));
  };

  const getLogClass = (type) => {
    switch (type) {
      case 'success': return 'text-success';
      case 'error': return 'text-danger';
      case 'warning': return 'text-warning';
      default: return 'text-info';
    }
  };

  const currentInstance = instances.find(i => i.id === activeInstance);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>MEXC Market Making</h1>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/cex-mm')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to CEX Trading
        </button>
      </div>

      {/* Instance Tabs */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Market Making Instances</h5>
            <button 
              className="btn btn-sm btn-light"
              onClick={createNewInstance}
              disabled={instances.length >= 10}
            >
              <i className="bi bi-plus-circle me-1"></i>
              New Instance
            </button>
          </div>
        </div>
        <div className="card-body">
          <ul className="nav nav-tabs">
            {instances.map((instance) => (
              <li key={instance.id} className="nav-item">
                <button
                  className={`nav-link ${activeInstance === instance.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveInstance(instance.id);
                    loadInstanceConfig(instance.id);
                  }}
                >
                  <span className={`badge ${instance.status === 'running' ? 'bg-success' : 'bg-secondary'} me-2`}>
                    {instance.status === 'running' ? '●' : '○'}
                  </span>
                  {instance.name}
                  {instances.length > 1 && (
                    <button
                      className="btn btn-sm btn-link text-danger p-0 ms-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteInstance(instance.id);
                      }}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="row">
        {/* Configuration Panel */}
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Configuration</h5>
            </div>
            <div className="card-body">
              {/* API Settings */}
              <h6 className="text-primary mb-3">API Settings</h6>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">API Key</label>
                  <div className="position-relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      className="form-control pe-5"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="Enter your MEXC API key"
                    />
                    <button
                      type="button"
                      className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{ 
                        border: 'none', 
                        background: 'none',
                        color: '#6c757d'
                      }}
                    >
                      <i className={`bi bi-eye${showApiKey ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">API Secret</label>
                  <div className="position-relative">
                    <input
                      type={showApiSecret ? "text" : "password"}
                      className="form-control pe-5"
                      value={config.apiSecret}
                      onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                      placeholder="Enter your MEXC API secret"
                    />
                    <button
                      type="button"
                      className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                      onClick={() => setShowApiSecret(!showApiSecret)}
                      style={{ 
                        border: 'none', 
                        background: 'none',
                        color: '#6c757d'
                      }}
                    >
                      <i className={`bi bi-eye${showApiSecret ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-check mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={config.testMode}
                  onChange={(e) => setConfig({ ...config, testMode: e.target.checked })}
                />
                <label className="form-check-label">
                  Test Mode (Simulated trading)
                </label>
              </div>

              {/* Trading Settings */}
              <h6 className="text-primary mb-3">Trading Settings</h6>
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="form-label">Trading Pair</label>
                  <select
                    className="form-select"
                    value={config.tradingPair}
                    onChange={(e) => setConfig({ ...config, tradingPair: e.target.value })}
                  >
                    <option value="BTC/USDT">BTC/USDT</option>
                    <option value="ETH/USDT">ETH/USDT</option>
                    <option value="SOL/USDT">SOL/USDT</option>
                    <option value="BNB/USDT">BNB/USDT</option>
                    <option value="XRP/USDT">XRP/USDT</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Order Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.orderAmount}
                    onChange={(e) => setConfig({ ...config, orderAmount: parseFloat(e.target.value) })}
                    step="0.001"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Max Position</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.maxPosition}
                    onChange={(e) => setConfig({ ...config, maxPosition: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              {/* Market Making Settings */}
              <h6 className="text-primary mb-3">Market Making Settings</h6>
              <div className="row mb-3">
                <div className="col-md-3">
                  <label className="form-label">Bid Spread (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.bidSpread}
                    onChange={(e) => setConfig({ ...config, bidSpread: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Ask Spread (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.askSpread}
                    onChange={(e) => setConfig({ ...config, askSpread: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Refresh (sec)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.orderRefreshTime}
                    onChange={(e) => setConfig({ ...config, orderRefreshTime: parseInt(e.target.value) })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Levels</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.numLevels}
                    onChange={(e) => setConfig({ ...config, numLevels: parseInt(e.target.value) })}
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              {/* Risk Management */}
              <h6 className="text-primary mb-3">Risk Management</h6>
              <div className="row mb-3">
                <div className="col-md-3">
                  <label className="form-label">Inventory Skew</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.inventorySkewFactor}
                    onChange={(e) => setConfig({ ...config, inventorySkewFactor: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Stop Loss (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.stopLossPercentage}
                    onChange={(e) => setConfig({ ...config, stopLossPercentage: parseFloat(e.target.value) })}
                    step="0.1"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Min Price</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.minPrice}
                    onChange={(e) => setConfig({ ...config, minPrice: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Max Price</label>
                  <input
                    type="number"
                    className="form-control"
                    value={config.maxPrice}
                    onChange={(e) => setConfig({ ...config, maxPrice: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <h6 className="text-primary mb-3">Advanced Settings</h6>
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={config.useHangingOrders}
                      onChange={(e) => setConfig({ ...config, useHangingOrders: e.target.checked })}
                    />
                    <label className="form-check-label">
                      Use Hanging Orders
                    </label>
                  </div>
                  {config.useHangingOrders && (
                    <input
                      type="number"
                      className="form-control mt-2"
                      value={config.hangingOrderLifetime}
                      onChange={(e) => setConfig({ ...config, hangingOrderLifetime: parseInt(e.target.value) })}
                      placeholder="Lifetime (seconds)"
                    />
                  )}
                </div>
                <div className="col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={config.adjustForVolatility}
                      onChange={(e) => setConfig({ ...config, adjustForVolatility: e.target.checked })}
                    />
                    <label className="form-check-label">
                      Adjust for Volatility
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex gap-2 mt-4">
                <button 
                  className="btn btn-primary"
                  onClick={saveInstanceConfig}
                >
                  <i className="bi bi-save me-2"></i>
                  Save Configuration
                </button>
                {currentInstance?.status === 'running' ? (
                  <button 
                    className="btn btn-danger"
                    onClick={stopInstance}
                  >
                    <i className="bi bi-stop-fill me-2"></i>
                    Stop Market Maker
                  </button>
                ) : (
                  <button 
                    className="btn btn-success"
                    onClick={startInstance}
                  >
                    <i className="bi bi-play-fill me-2"></i>
                    Start Market Maker
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Log Panel */}
        <div className="col-lg-5">
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
              {logs[activeInstance]?.length === 0 ? (
                <p className="text-muted text-center">No logs yet...</p>
              ) : (
                <div className="font-monospace small">
                  {logs[activeInstance]?.map((log, index) => (
                    <div key={index} className={getLogClass(log.type)}>
                      [{log.timestamp}] {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Panel */}
          <div className="card mt-3">
            <div className="card-body">
              <h6>Instance Status</h6>
              <div className="row">
                <div className="col-6">
                  <small className="text-muted">Status:</small>
                  <p className="mb-0">
                    <span className={`badge ${currentInstance?.status === 'running' ? 'bg-success' : 'bg-secondary'}`}>
                      {currentInstance?.status || 'Stopped'}
                    </span>
                  </p>
                </div>
                <div className="col-6">
                  <small className="text-muted">Created:</small>
                  <p className="mb-0">{currentInstance?.createdAt ? new Date(currentInstance.createdAt).toLocaleDateString() : '-'}</p>
                </div>
              </div>
              {currentInstance?.status === 'running' && (
                <div className="alert alert-success mt-3 mb-0">
                  <small>Market maker is actively managing orders on {config.tradingPair}</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mexc;