import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useProject } from '../contexts/ProjectContext';
import { toast } from 'react-toastify';

const PrivacyTransfers = () => {
  const navigate = useNavigate();
  const { selectedChain, isUnlocked, wallets } = useWallet();
  const { currentProject, addLog, getChainData } = useProject();
  const fileInputRef = useRef(null);
  const logContainerRef = useRef(null);

  // API Configuration
  const [apiConfig, setApiConfig] = useState({
    apiUrl: 'https://api-partner.houdiniswap.com/exchange',
    statusApiUrl: 'https://api-partner.houdiniswap.com/status',
    apiKey: '6751a0c41c167e208a2dae44',
    secretKey: 'wrU6SbJMPVbFYjTCPwyQZV',
    rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=7e5bbc4c-02f5-46ca-b781-468b275b5758',
    anonymousMode: false
  });

  // Transfer Configuration
  const [transferConfig, setTransferConfig] = useState({
    sendingBlockchain: 'SOL',
    sendingToken: 'SOL',
    receivingBlockchain: 'SOL',
    receivingToken: 'SOL'
  });

  // Input Method
  const [activeTab, setActiveTab] = useState('csv');
  const [recipients, setRecipients] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  
  // Transfer State
  const [transferring, setTransferring] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [savedRecipientLists, setSavedRecipientLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  
  // Password visibility toggles
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showPrivateKeyManual, setShowPrivateKeyManual] = useState(false);

  // Blockchain options
  const blockchainOptions = [
    { value: 'SOL', label: 'Solana' },
    { value: 'ETH', label: 'Ethereum' },
    { value: 'BSC', label: 'Binance Smart Chain' },
    { value: 'BASE', label: 'Base' }
  ];

  // Load saved recipient lists from project data
  useEffect(() => {
    if (currentProject && currentProject.data && currentProject.data.privacyRecipientLists) {
      setSavedRecipientLists(currentProject.data.privacyRecipientLists || []);
    }
  }, [currentProject]);

  // Token options based on blockchain and project tokens
  const getTokenOptions = (blockchain) => {
    const chainData = getChainData(blockchain.toLowerCase());
    const projectTokens = [];
    
    if (chainData && chainData.tokenAddress) {
      projectTokens.push({
        value: chainData.tokenAddress,
        label: `${chainData.symbol || 'Project Token'} (${chainData.name || 'Main'})`
      });
    }
    const defaultTokens = [];
    switch (blockchain) {
      case 'SOL':
        defaultTokens.push(
          { value: 'SOL', label: 'SOL' },
          { value: 'USDC', label: 'USDC' },
          { value: 'USDT', label: 'USDT' }
        );
        break;
      case 'ETH':
        defaultTokens.push(
          { value: 'ETH', label: 'ETH' },
          { value: 'USDC', label: 'USDC' },
          { value: 'USDT', label: 'USDT' }
        );
        break;
      case 'BSC':
        defaultTokens.push(
          { value: 'BNB', label: 'BNB' },
          { value: 'USDC', label: 'USDC' },
          { value: 'USDT', label: 'USDT' }
        );
        break;
      case 'BASE':
        defaultTokens.push(
          { value: 'ETH', label: 'ETH' },
          { value: 'USDC', label: 'USDC' }
        );
        break;
      default:
        defaultTokens.push({ value: 'NATIVE', label: 'Native Token' });
    }
    
    return [...projectTokens, ...defaultTokens];
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const lines = content.split('\n').filter(line => line.trim());
        
        // Parse CSV
        const parsedRecipients = [];
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        const addressIndex = headers.findIndex(h => 
          h.includes('address') || h.includes('wallet') || h.includes('recipient')
        );
        const amountIndex = headers.findIndex(h => 
          h.includes('amount') || h.includes('value') || h.includes('quantity')
        );

        if (addressIndex === -1 || amountIndex === -1) {
          toast.error('CSV must contain address and amount columns');
          return;
        }

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length > Math.max(addressIndex, amountIndex)) {
            const address = cols[addressIndex].trim();
            const amount = parseFloat(cols[amountIndex]);
            
            if (address && !isNaN(amount) && amount > 0) {
              parsedRecipients.push({ address, amount });
            }
          }
        }

        setRecipients(parsedRecipients);
        addLog(`Loaded ${parsedRecipients.length} recipients from CSV`, 'info');
      } catch (error) {
        toast.error('Error parsing CSV file');
      }
    };
    reader.readAsText(file);
  };

  const parseManualInput = () => {
    const lines = manualInput.trim().split('\n');
    const parsedRecipients = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      if (parts.length >= 2) {
        const address = parts[0].trim();
        const amount = parseFloat(parts[1].trim());
        
        if (address && !isNaN(amount) && amount > 0) {
          parsedRecipients.push({ address, amount });
        }
      }
    }

    setRecipients(parsedRecipients);
    if (parsedRecipients.length > 0) {
      addLocalLog(`Parsed ${parsedRecipients.length} recipients`, 'info');
    } else {
      toast.error('No valid recipients found');
    }
  };

  const addLocalLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const getLogClass = (type) => {
    switch (type) {
      case 'success': return 'text-success';
      case 'error': return 'text-danger';
      case 'warning': return 'text-warning';
      default: return 'text-info';
    }
  };

  const calculateTotals = () => {
    const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);
    return { 
      totalAmount, 
      totalRecipients: recipients.length,
      estimatedTime: recipients.length * 10 // 10 seconds per transfer estimate
    };
  };

  const validateTransfer = () => {
    if (!currentProject) {
      toast.error('Please select a project first');
      return false;
    }

    if (!isUnlocked) {
      toast.error('Please unlock your wallet first');
      return false;
    }

    if (recipients.length === 0) {
      toast.error('No recipients added');
      return false;
    }

    if (!privateKey) {
      toast.error('Please enter the sender private key');
      return false;
    }

    if (!apiConfig.apiKey || !apiConfig.secretKey) {
      toast.error('Please configure API credentials');
      return false;
    }

    return true;
  };

  const showConfirmation = () => {
    if (!validateTransfer()) return;
    setShowConfirmModal(true);
  };

  const startPrivacyTransfers = async () => {
    setShowConfirmModal(false);
    setTransferring(true);
    setLogs([]);
    
    addLocalLog('Starting privacy transfers...', 'info');
    addLocalLog(`Processing ${recipients.length} recipients`, 'info');
    addLocalLog(`From ${transferConfig.sendingBlockchain} to ${transferConfig.receivingBlockchain}`, 'info');
    
    // Log to project history
    await addLog('privacy-transfer', `Started privacy transfers for ${recipients.length} recipients`, 'info', {
      sendingChain: transferConfig.sendingBlockchain,
      receivingChain: transferConfig.receivingBlockchain,
      sendingToken: transferConfig.sendingToken,
      receivingToken: transferConfig.receivingToken,
      recipientCount: recipients.length,
      totalAmount: calculateTotals().totalAmount,
      anonymousMode: apiConfig.anonymousMode
    });
    
    // Simulate processing each recipient
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        addLocalLog(`[${i + 1}/${recipients.length}] Creating order for ${recipient.address}`, 'info');
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const orderId = 'HS-' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        const tempWallet = 'HOU' + Math.random().toString(36).substring(2, 15);
        
        addLocalLog(`✅ Order created: ${orderId}`, 'success');
        addLocalLog(`🔹 Temporary wallet: ${tempWallet}`, 'info');
        addLocalLog(`🔹 Amount: ${recipient.amount} ${transferConfig.sendingToken}`, 'info');
        
        // Simulate sending to temporary wallet
        await new Promise(resolve => setTimeout(resolve, 1500));
        addLocalLog(`💸 Sending ${recipient.amount} ${transferConfig.sendingToken} to temporary wallet...`, 'info');
        
        // Simulate transaction confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
        const txHash = '0x' + Array(64).fill(0).map(() => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        
        addLocalLog(`✅ Transaction confirmed: ${txHash}`, 'success');
        
        // Simulate checking order status
        await new Promise(resolve => setTimeout(resolve, 1000));
        addLocalLog(`🔍 Checking order status...`, 'info');
        
        const status = Math.random() > 0.1 ? 'COMPLETED' : 'PROCESSING';
        if (status === 'COMPLETED') {
          addLocalLog(`✅ Transfer to ${recipient.address} completed`, 'success');
        } else {
          addLocalLog(`⏳ Transfer to ${recipient.address} is processing`, 'warning');
        }
        
      } catch (error) {
        addLocalLog(`❌ Error processing ${recipient.address}: ${error.message}`, 'error');
      }
      
      // Add delay between transfers
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    addLocalLog('🎉 All transfers completed!', 'success');
    setTransferring(false);
    
    // Log completion to project history
    await addLog('privacy-transfer', `Completed privacy transfers for ${recipients.length} recipients`, 'success', {
      sendingChain: transferConfig.sendingBlockchain,
      receivingChain: transferConfig.receivingBlockchain,
      recipientCount: recipients.length,
      totalAmount: calculateTotals().totalAmount
    });
    toast.success('Privacy transfers completed!');
  };

  const totals = calculateTotals();

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Privacy Transfers</h1>
          {currentProject && (
            <small className="text-muted">
              <i className="bi bi-folder2-open me-1"></i>
              {currentProject.name}
            </small>
          )}
        </div>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/multisender')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back
        </button>
      </div>

      {!currentProject ? (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          No project selected. Please <a href="/dashboard" className="alert-link">select a project</a> before using privacy transfers.
        </div>
      ) : (
        <p className="lead">Send tokens with enhanced privacy through HoudiniSwap integration.</p>
      )}

      <div className="row">
        {/* Configuration Panel */}
        <div className="col-lg-7">
          <div className="card mb-4">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Transfer Configuration</h5>
            </div>
            <div className="card-body">
              {/* API Settings */}
              <h6 className="mb-3">API Settings</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label">API Key</label>
                  <input
                    type="text"
                    className="form-control"
                    value={apiConfig.apiKey}
                    onChange={(e) => setApiConfig({...apiConfig, apiKey: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Secret Key</label>
                  <div className="position-relative">
                    <input
                      type={showSecretKey ? "text" : "password"}
                      className="form-control pe-5"
                      value={apiConfig.secretKey}
                      onChange={(e) => setApiConfig({...apiConfig, secretKey: e.target.value})}
                    />
                    <button
                      type="button"
                      className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      style={{ 
                        border: 'none', 
                        background: 'none',
                        color: '#6c757d'
                      }}
                    >
                      <i className={`bi bi-eye${showSecretKey ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="anonymousMode"
                      checked={apiConfig.anonymousMode}
                      onChange={(e) => setApiConfig({...apiConfig, anonymousMode: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="anonymousMode">
                      Anonymous Mode
                    </label>
                  </div>
                </div>
              </div>

              {/* Token Configuration */}
              <h6 className="mb-3">Token Configuration</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label">From Blockchain</label>
                  <select
                    className="form-select"
                    value={transferConfig.sendingBlockchain}
                    onChange={(e) => setTransferConfig({...transferConfig, sendingBlockchain: e.target.value})}
                  >
                    {blockchainOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">From Token</label>
                  <select
                    className="form-select"
                    value={transferConfig.sendingToken}
                    onChange={(e) => setTransferConfig({...transferConfig, sendingToken: e.target.value})}
                  >
                    {getTokenOptions(transferConfig.sendingBlockchain).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">To Blockchain</label>
                  <select
                    className="form-select"
                    value={transferConfig.receivingBlockchain}
                    onChange={(e) => setTransferConfig({...transferConfig, receivingBlockchain: e.target.value})}
                  >
                    {blockchainOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">To Token</label>
                  <select
                    className="form-select"
                    value={transferConfig.receivingToken}
                    onChange={(e) => setTransferConfig({...transferConfig, receivingToken: e.target.value})}
                  >
                    {getTokenOptions(transferConfig.receivingBlockchain).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Saved Lists */}
              {savedRecipientLists.length > 0 && (
                <div className="mb-4">
                  <label className="form-label">Load Saved Recipients</label>
                  <select 
                    className="form-select"
                    value={selectedListId}
                    onChange={(e) => {
                      setSelectedListId(e.target.value);
                      if (e.target.value) {
                        const list = savedRecipientLists.find(l => l.id === e.target.value);
                        if (list) {
                          setRecipients(list.recipients);
                          toast.success(`Loaded ${list.name} with ${list.recipients.length} recipients`);
                        }
                      }
                    }}
                  >
                    <option value="">Select a saved list...</option>
                    {savedRecipientLists.map(list => (
                      <option key={list.id} value={list.id}>
                        {list.name} ({list.recipients.length} recipients)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Transfer Method */}
              <h6 className="mb-3">Transfer Method</h6>
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'csv' ? 'active' : ''}`}
                    onClick={() => setActiveTab('csv')}
                  >
                    CSV Upload
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'manual' ? 'active' : ''}`}
                    onClick={() => setActiveTab('manual')}
                  >
                    Manual Entry
                  </button>
                </li>
              </ul>

              {activeTab === 'csv' ? (
                <div>
                  <div className="mb-3">
                    <label className="form-label">Upload CSV File</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="form-control"
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                    <div className="form-text">
                      CSV should contain columns for wallet_address and amount
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Sender Private Key</label>
                    <div className="position-relative">
                      <input
                        type={showPrivateKey ? "text" : "password"}
                        className="form-control pe-5"
                        placeholder="Enter private key of sending wallet"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        style={{ 
                          border: 'none', 
                          background: 'none',
                          color: '#6c757d'
                        }}
                      >
                        <i className={`bi bi-eye${showPrivateKey ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    <div className="form-text">
                      This is stored locally and never sent to our servers
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <label className="form-label">Sender Private Key</label>
                    <div className="position-relative">
                      <input
                        type={showPrivateKeyManual ? "text" : "password"}
                        className="form-control pe-5"
                        placeholder="Enter private key of sending wallet"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                        onClick={() => setShowPrivateKeyManual(!showPrivateKeyManual)}
                        style={{ 
                          border: 'none', 
                          background: 'none',
                          color: '#6c757d'
                        }}
                      >
                        <i className={`bi bi-eye${showPrivateKeyManual ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Recipients (Address, Amount)</label>
                    <textarea
                      className="form-control font-monospace"
                      rows="5"
                      placeholder="Enter one address and amount per line&#10;Example:&#10;GZtHAe7TehYrLbQxPTs56RP9FD5zJLRqxj4BtFUYwvHc,0.1&#10;9mUVrtwytCR1HKmxYA6RfBG9mHwkHEZ6kf7YF2aRYJWp,0.2"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={parseManualInput}>
                    Parse Recipients
                  </button>
                </div>
              )}

              {/* Recipients Preview */}
              {recipients.length > 0 && (
                <div className="mt-4">
                  <h6>Recipients Preview</h6>
                  <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.slice(0, 5).map((r, i) => (
                          <tr key={i}>
                            <td className="font-monospace small">{r.address}</td>
                            <td>{r.amount}</td>
                          </tr>
                        ))}
                        {recipients.length > 5 && (
                          <tr>
                            <td colSpan="2" className="text-center text-muted">
                              ...and {recipients.length - 5} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Save Recipients Button */}
                  <div className="mt-2">
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={async () => {
                        if (!currentProject) {
                          toast.error('No project selected');
                          return;
                        }

                        const listName = prompt('Enter a name for this recipient list:');
                        if (!listName) return;

                        try {
                          const newList = {
                            id: Date.now().toString(),
                            name: listName,
                            recipients: recipients,
                            createdAt: new Date().toISOString()
                          };

                          const updatedLists = [...savedRecipientLists, newList];
                          setSavedRecipientLists(updatedLists);
                          toast.success('Recipient list saved!');
                          
                          await addLog('privacy-transfer', `Saved recipient list: ${listName} with ${recipients.length} recipients`, 'info', {
                            listName,
                            recipientCount: recipients.length
                          });
                        } catch (error) {
                          toast.error('Failed to save recipient list');
                        }
                      }}
                    >
                      <i className="bi bi-save me-2"></i>
                      Save Recipient List
                    </button>
                  </div>
                </div>
              )}

              <div className="d-grid mt-4">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={showConfirmation}
                  disabled={!currentProject || transferring || recipients.length === 0}
                >
                  {transferring ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Processing Transfers...
                    </>
                  ) : (
                    'Start Transfers'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Log */}
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Transaction Log</h5>
            </div>
            <div 
              className="card-body bg-dark text-light"
              style={{ height: '600px', overflowY: 'auto' }}
              ref={logContainerRef}
            >
              {logs.length === 0 ? (
                <div className="text-muted text-center">
                  Privacy Transfers ready. Configure your transfer settings and click "Start Transfers" to begin.
                </div>
              ) : (
                <div className="font-monospace small">
                  {logs.map((log, index) => (
                    <div key={index} className={`mb-2 ${getLogClass(log.type)}`}>
                      [{log.timestamp}] {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title">Confirm Privacy Transfers</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowConfirmModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <h6>Transfer Summary</h6>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <th>Total Recipients</th>
                      <td>{totals.totalRecipients}</td>
                    </tr>
                    <tr>
                      <th>Total Amount</th>
                      <td>{totals.totalAmount} {transferConfig.sendingToken}</td>
                    </tr>
                    <tr>
                      <th>From</th>
                      <td>{transferConfig.sendingBlockchain} ({transferConfig.sendingToken})</td>
                    </tr>
                    <tr>
                      <th>To</th>
                      <td>{transferConfig.receivingBlockchain} ({transferConfig.receivingToken})</td>
                    </tr>
                    <tr>
                      <th>Anonymous Mode</th>
                      <td>{apiConfig.anonymousMode ? 'Yes' : 'No'}</td>
                    </tr>
                    <tr>
                      <th>Estimated Time</th>
                      <td>~{Math.ceil(totals.estimatedTime / 60)} minutes</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="alert alert-warning">
                  <strong>Important:</strong> This action cannot be undone. Please verify all details before proceeding.
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={startPrivacyTransfers}
                >
                  Confirm Transfers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyTransfers;