import React, { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const MexcDistribution = () => {
  const fileInputRef = useRef(null);
  
  // Form state
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [cryptocurrency, setCryptocurrency] = useState('SOL');
  const [testMode, setTestMode] = useState(true);
  const [transactionLog, setTransactionLog] = useState([]);
  
  // Withdrawal state
  const [withdrawalType, setWithdrawalType] = useState('single');
  const [singleAddress, setSingleAddress] = useState('');
  const [singleAmount, setSingleAmount] = useState('');
  const [batchData, setBatchData] = useState('');
  const [parsedBatch, setParsedBatch] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [accountBalance, setAccountBalance] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Map common cryptocurrencies to chain names for styling
  const getChainFromCrypto = (crypto) => {
    const upperCrypto = crypto.toUpperCase();
    if (upperCrypto.includes('SOL')) return 'solana';
    if (upperCrypto.includes('ETH')) return 'ethereum';
    if (upperCrypto.includes('BNB') || upperCrypto.includes('BSC')) return 'bsc';
    if (upperCrypto.includes('BASE')) return 'base';
    return 'ethereum'; // default
  };

  const selectedChain = getChainFromCrypto(cryptocurrency);

  // Add log entry
  const addLogEntry = (type, message, details = {}) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details,
      cryptocurrency
    };
    setTransactionLog(prev => [entry, ...prev]);
  };

  // Validate API credentials
  const validateCredentials = async () => {
    setValidating(true);
    setAccountBalance(null);
    addLogEntry('info', `Validating API credentials for ${cryptocurrency}`);
    
    try {
      const response = await axios.post('/api/mexc/validate', {
        apiKey,
        apiSecret,
        currency: cryptocurrency
      });
      
      if (response.data.balance !== undefined) {
        setAccountBalance(response.data.balance);
        toast.success('API credentials validated successfully');
        addLogEntry('success', `API validated. Balance: ${response.data.balance} ${cryptocurrency}`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to validate credentials';
      toast.error(errorMsg);
      addLogEntry('error', `API validation failed: ${errorMsg}`);
    } finally {
      setValidating(false);
    }
  };

  // Handle CSV file upload - Fixed to properly parse wallet,amount format
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      parseBatchData(content, file.name);
    };
    reader.readAsText(file);
  };

  // Parse batch data - Fixed to handle CSV properly
  const parseBatchData = (data, filename = null) => {
    try {
      const lines = data.trim().split(/\r?\n/);
      const parsed = [];
      let hasHeaders = false;
      
      // Check if first line looks like headers
      const firstLine = lines[0];
      if (firstLine && (
        firstLine.toLowerCase().includes('wallet') || 
        firstLine.toLowerCase().includes('address') ||
        firstLine.toLowerCase().includes('recipient')
      )) {
        hasHeaders = true;
      }
      
      // Parse lines starting from index 0 or 1 depending on headers
      const startIndex = hasHeaders ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Handle both comma and tab delimiters
        const parts = line.split(/[,\t]/);
        if (parts.length >= 2) {
          const address = parts[0].trim();
          const amount = parts[1].trim();
          
          // Validate address format (basic check)
          if (address && amount && !isNaN(parseFloat(amount))) {
            parsed.push({ 
              id: parsed.length + 1, 
              address, 
              amount: parseFloat(amount),
              status: 'pending' 
            });
          }
        }
      }
      
      if (parsed.length > 0) {
        setParsedBatch(parsed);
        // Create formatted batch data for display
        const formattedData = parsed.map(item => `${item.address},${item.amount}`).join('\n');
        setBatchData(formattedData);
        toast.success(`Loaded ${parsed.length} withdrawal entries`);
        addLogEntry('success', `CSV uploaded: ${parsed.length} entries loaded`, filename ? { filename } : {});
      } else {
        toast.error('No valid entries found in CSV file. Expected format: wallet,amount');
        addLogEntry('error', 'CSV upload failed: No valid entries found');
      }
    } catch (err) {
      toast.error('Failed to parse CSV file. Please check the format.');
    }
  };

  // Handle manual batch data change
  const handleBatchDataChange = (value) => {
    setBatchData(value);
    const lines = value.trim().split(/\r?\n/);
    const parsed = [];
    
    lines.forEach((line) => {
      const parts = line.split(/[,\t]/);
      if (parts.length >= 2) {
        const address = parts[0].trim();
        const amount = parts[1].trim();
        if (address && amount && !isNaN(parseFloat(amount))) {
          parsed.push({ 
            id: parsed.length + 1, 
            address, 
            amount: parseFloat(amount),
            status: 'pending' 
          });
        }
      }
    });
    
    setParsedBatch(parsed);
  };

  // Get withdrawal summary
  const getWithdrawalSummary = () => {
    if (withdrawalType === 'single') {
      return [{
        address: singleAddress,
        amount: parseFloat(singleAmount),
        status: 'pending'
      }];
    }
    return parsedBatch;
  };

  // Calculate total amount
  const getTotalAmount = () => {
    const summary = getWithdrawalSummary();
    return summary.reduce((sum, item) => sum + item.amount, 0);
  };

  // Process withdrawals
  const processWithdrawals = async () => {
    setShowConfirmation(false);
    setProcessing(true);
    setResults([]);
    
    const withdrawals = getWithdrawalSummary();
    const newResults = [];
    addLogEntry('info', `Starting batch withdrawal: ${withdrawals.length} transactions`);
    
    for (let i = 0; i < withdrawals.length; i++) {
      setProgress({ current: i + 1, total: withdrawals.length });
      
      try {
        const response = await axios.post('/api/mexc/withdraw', {
          apiKey,
          apiSecret,
          currency: cryptocurrency,
          address: withdrawals[i].address,
          amount: withdrawals[i].amount,
          testMode
        });
        
        newResults.push({
          ...withdrawals[i],
          status: 'success',
          txId: response.data.withdrawId,
          message: response.data.message
        });
        
        addLogEntry('success', `Withdrawal ${i + 1}/${withdrawals.length} completed`, {
          address: withdrawals[i].address,
          amount: withdrawals[i].amount,
          txId: response.data.withdrawId
        });
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Withdrawal failed';
        newResults.push({
          ...withdrawals[i],
          status: 'failed',
          message: errorMsg
        });
        
        addLogEntry('error', `Withdrawal ${i + 1}/${withdrawals.length} failed: ${errorMsg}`, {
          address: withdrawals[i].address,
          amount: withdrawals[i].amount
        });
      }
      
      setResults([...newResults]);
    }
    
    setProcessing(false);
    setProgress({ current: 0, total: 0 });
    
    const successCount = newResults.filter(r => r.status === 'success').length;
    const failedCount = withdrawals.length - successCount;
    
    if (successCount > 0) {
      toast.success(`Completed ${successCount} of ${withdrawals.length} withdrawals`);
    }
    
    addLogEntry(
      successCount === withdrawals.length ? 'success' : 'warning',
      `Batch completed: ${successCount} successful, ${failedCount} failed`
    );
  };

  // Export results to CSV
  const exportResults = () => {
    const csv = [
      ['Address', 'Amount', 'Status', 'Transaction ID', 'Message'].join(','),
      ...results.map(r => [
        r.address,
        r.amount,
        r.status,
        r.txId || '',
        r.message || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mexc_withdrawals_${cryptocurrency}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-4" data-chain={selectedChain}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>MEXC Distribution</h1>
        <span className={`badge chain-badge ${selectedChain}-badge`}>
          {cryptocurrency}
        </span>
      </div>
      
      {/* API Configuration */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-key-fill me-2"></i>
            API Configuration
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">API Key</label>
              <div className="input-group">
                <input
                  type={showApiKey ? "text" : "password"}
                  className="form-control"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your MEXC API key"
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  <i className={`bi bi-eye${showApiKey ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>
            
            <div className="col-md-6">
              <label className="form-label">API Secret</label>
              <div className="input-group">
                <input
                  type={showApiSecret ? "text" : "password"}
                  className="form-control"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your MEXC API secret"
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                >
                  <i className={`bi bi-eye${showApiSecret ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Cryptocurrency Symbol</label>
              <input
                type="text"
                className="form-control"
                value={cryptocurrency}
                onChange={(e) => {
                  setCryptocurrency(e.target.value.toUpperCase());
                  setAccountBalance(null);
                }}
                placeholder="Enter token symbol (e.g., SOL, ETH, USDT)"
              />
              <small className="text-muted">Enter the exact symbol as it appears on MEXC</small>
            </div>
            
            <div className="col-md-6">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="testMode"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="testMode">
                  Test Mode <small className="text-muted">(No actual withdrawals)</small>
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-primary"
              onClick={validateCredentials}
              disabled={!apiKey || !apiSecret || validating}
            >
              {validating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Validating...
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check me-2"></i>
                  Validate Credentials
                </>
              )}
            </button>
            
            {accountBalance !== null && (
              <div className="d-flex align-items-center">
                <span className="text-muted me-2">Balance:</span>
                <span className="fs-5 fw-bold chain-text">
                  {accountBalance} {cryptocurrency}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Withdrawal Options */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-send-fill me-2"></i>
            Withdrawal Options
          </h5>
        </div>
        <div className="card-body">
          <ul className="nav nav-tabs mb-4" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${withdrawalType === 'single' ? 'active' : ''}`}
                onClick={() => setWithdrawalType('single')}
                type="button"
                role="tab"
              >
                <i className="bi bi-person me-2"></i>
                Single Withdrawal
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${withdrawalType === 'batch' ? 'active' : ''}`}
                onClick={() => setWithdrawalType('batch')}
                type="button"
                role="tab"
              >
                <i className="bi bi-people me-2"></i>
                Batch Withdrawal
              </button>
            </li>
          </ul>

          {withdrawalType === 'single' ? (
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label">Withdrawal Address</label>
                <input
                  type="text"
                  className="form-control"
                  value={singleAddress}
                  onChange={(e) => setSingleAddress(e.target.value)}
                  placeholder="Enter recipient wallet address"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Amount</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-control"
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                  />
                  <span className="input-group-text">{cryptocurrency}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="form-label mb-0">
                  Batch Data <small className="text-muted">(Format: wallet,amount per line)</small>
                </label>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="bi bi-upload me-2"></i>
                  Upload CSV
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="d-none"
                />
              </div>
              
              <textarea
                className="form-control font-monospace"
                value={batchData}
                onChange={(e) => handleBatchDataChange(e.target.value)}
                rows="6"
                placeholder="wallet1address,0.5&#10;wallet2address,1.2&#10;wallet3address,0.75"
              />
              
              {parsedBatch.length > 0 && (
                <div className="mt-3 p-3 bg-light rounded">
                  <div className="row">
                    <div className="col-md-4">
                      <small className="text-muted">Total Recipients</small>
                      <div className="fs-5 fw-bold">{parsedBatch.length}</div>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted">Total Amount</small>
                      <div className="fs-5 fw-bold chain-text">
                        {getTotalAmount().toFixed(6)} {cryptocurrency}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted">Average Amount</small>
                      <div className="fs-5 fw-bold">
                        {(getTotalAmount() / parsedBatch.length).toFixed(6)} {cryptocurrency}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex justify-content-end gap-2 mb-4">
        <button
          className="btn btn-success"
          onClick={() => setShowConfirmation(true)}
          disabled={
            !accountBalance || 
            (withdrawalType === 'single' ? !singleAddress || !singleAmount : parsedBatch.length === 0)
          }
        >
          <i className="bi bi-check-circle me-2"></i>
          Review & Execute
        </button>
      </div>

      {/* Progress */}
      {processing && (
        <div className="card mb-4">
          <div className="card-body">
            <h6 className="mb-3">Processing Withdrawals</h6>
            <div className="mb-2">
              <div className="d-flex justify-content-between mb-1">
                <span>Progress</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="progress">
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-list-check me-2"></i>
              Results
            </h5>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={exportResults}
            >
              <i className="bi bi-download me-2"></i>
              Export CSV
            </button>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index}>
                      <td className="font-monospace small">
                        {result.address.slice(0, 8)}...{result.address.slice(-6)}
                      </td>
                      <td>{result.amount} {cryptocurrency}</td>
                      <td>
                        <span className={`badge bg-${result.status === 'success' ? 'success' : 'danger'}`}>
                          {result.status}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {result.txId || result.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Withdrawals</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmation(false)}
                />
              </div>
              <div className="modal-body">
                <div className="alert alert-info mb-3">
                  <div className="row g-2">
                    <div className="col-6">
                      <small className="text-muted d-block">Currency</small>
                      <strong>{cryptocurrency}</strong>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Recipients</small>
                      <strong>{getWithdrawalSummary().length}</strong>
                    </div>
                    <div className="col-12">
                      <small className="text-muted d-block">Total Amount</small>
                      <strong className="fs-5">{getTotalAmount().toFixed(6)} {cryptocurrency}</strong>
                    </div>
                  </div>
                </div>
                
                {testMode && (
                  <div className="alert alert-warning mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Test mode is enabled. No actual withdrawals will be made.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={processWithdrawals}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Confirm & Execute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Log */}
      <div className="card mt-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-journal-text me-2"></i>
            Transaction Log
          </h5>
          {transactionLog.length > 0 && (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setTransactionLog([])}
            >
              <i className="bi bi-trash me-2"></i>
              Clear Log
            </button>
          )}
        </div>
        <div className="card-body">
          {transactionLog.length === 0 ? (
            <p className="text-muted mb-0">No transactions yet. Start by validating your API credentials.</p>
          ) : (
            <div className="transaction-log" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {transactionLog.map((entry) => (
                <div 
                  key={entry.id} 
                  className={`log-entry p-2 mb-2 rounded border-start border-3 ${
                    entry.type === 'error' ? 'border-danger bg-danger bg-opacity-10' :
                    entry.type === 'success' ? 'border-success bg-success bg-opacity-10' :
                    entry.type === 'warning' ? 'border-warning bg-warning bg-opacity-10' :
                    'border-info bg-info bg-opacity-10'
                  }`}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className={`bi bi-${
                          entry.type === 'error' ? 'x-circle-fill text-danger' :
                          entry.type === 'success' ? 'check-circle-fill text-success' :
                          entry.type === 'warning' ? 'exclamation-triangle-fill text-warning' :
                          'info-circle-fill text-info'
                        }`}></i>
                        <strong className="small">{entry.message}</strong>
                      </div>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <div className="ms-4 small text-muted">
                          {Object.entries(entry.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-capitalize">{key}:</span>{' '}
                              <span className="font-monospace">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-muted small">
                      <div>{entry.timestamp}</div>
                      <div className="text-end">{entry.cryptocurrency}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MexcDistribution;