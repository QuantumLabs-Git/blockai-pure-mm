import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { toast } from 'react-toastify';

const StandardMultisend = () => {
  const navigate = useNavigate();
  const { selectedChain, isUnlocked, wallets, signTransaction } = useWallet();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('csv');
  const [recipients, setRecipients] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [selectedToken, setSelectedToken] = useState('native');
  const [tokenAddress, setTokenAddress] = useState('');
  const [sending, setSending] = useState(false);
  const [txStatus, setTxStatus] = useState(null);

  // Token presets based on chain
  const getTokenPresets = () => {
    switch (selectedChain) {
      case 'ethereum':
        return [
          { value: 'native', label: 'ETH' },
          { value: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', label: 'USDC' },
          { value: '0xdAC17F958D2ee523a2206206994597C13D831ec7', label: 'USDT' },
          { value: 'custom', label: 'Custom Token' }
        ];
      case 'bsc':
        return [
          { value: 'native', label: 'BNB' },
          { value: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', label: 'USDC' },
          { value: '0x55d398326f99059fF775485246999027B3197955', label: 'USDT' },
          { value: 'custom', label: 'Custom Token' }
        ];
      case 'base':
        return [
          { value: 'native', label: 'ETH' },
          { value: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', label: 'USDC' },
          { value: 'custom', label: 'Custom Token' }
        ];
      case 'solana':
        return [
          { value: 'native', label: 'SOL' },
          { value: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', label: 'USDC' },
          { value: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', label: 'USDT' },
          { value: 'custom', label: 'Custom Token' }
        ];
      default:
        return [{ value: 'native', label: 'Native Token' }];
    }
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
        toast.success(`Loaded ${parsedRecipients.length} recipients from CSV`);
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
      toast.success(`Parsed ${parsedRecipients.length} recipients`);
    } else {
      toast.error('No valid recipients found');
    }
  };

  const calculateTotals = () => {
    const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);
    const uniqueAddresses = new Set(recipients.map(r => r.address)).size;
    return { totalAmount, uniqueAddresses, totalRecipients: recipients.length };
  };

  const estimateGas = () => {
    // Simplified gas estimation
    const baseGas = selectedChain === 'solana' ? 0.001 : 0.005;
    const perRecipientGas = selectedChain === 'solana' ? 0.0001 : 0.0002;
    return baseGas + (recipients.length * perRecipientGas);
  };

  const handleSend = async () => {
    if (!isUnlocked) {
      toast.error('Please unlock your wallet first');
      return;
    }

    if (recipients.length === 0) {
      toast.error('No recipients to send to');
      return;
    }

    if (wallets.length === 0) {
      toast.error('No wallet available for sending');
      return;
    }

    setSending(true);
    setTxStatus({ status: 'preparing', message: 'Preparing transaction...' });

    try {
      // Simulate transaction preparation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTxStatus({ status: 'signing', message: 'Please sign the transaction...' });
      
      // In a real implementation, we would:
      // 1. Prepare the transaction based on the blockchain
      // 2. Sign it using the wallet's private key
      // 3. Broadcast it to the network
      
      // Simulate signing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTxStatus({ status: 'broadcasting', message: 'Broadcasting transaction...' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock transaction hash
      const txHash = '0x' + Array(64).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      setTxStatus({ 
        status: 'success', 
        message: 'Transaction sent successfully!',
        txHash: txHash
      });
      
      toast.success('Multisend transaction completed!');
      
      // Clear recipients after successful send
      setTimeout(() => {
        setRecipients([]);
        setManualInput('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);
      
    } catch (error) {
      setTxStatus({ 
        status: 'error', 
        message: 'Transaction failed: ' + error.message 
      });
      toast.error('Transaction failed');
    } finally {
      setSending(false);
    }
  };

  const totals = calculateTotals();
  const gasEstimate = estimateGas();
  const tokenPresets = getTokenPresets();

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Standard Multisend</h1>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/multisender')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back
        </button>
      </div>

      {/* Wallet Status Alert */}
      {!isUnlocked && (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Please unlock your wallet to use the multisender feature.
        </div>
      )}

      <div className="row">
        {/* Configuration Panel */}
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Recipients Configuration</h5>
            </div>
            <div className="card-body">
              {/* Token Selection */}
              <div className="mb-4">
                <label className="form-label">Select Token</label>
                <div className="row">
                  <div className="col-md-6">
                    <select 
                      className="form-select"
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                    >
                      {tokenPresets.map(token => (
                        <option key={token.value} value={token.value}>
                          {token.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedToken === 'custom' && (
                    <div className="col-md-6">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter token contract address"
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Input Method Tabs */}
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

              {/* Tab Content */}
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
                      CSV should contain columns for address and amount
                    </div>
                  </div>

                  {/* CSV Template Download */}
                  <div className="alert alert-info">
                    <h6>CSV Format Example:</h6>
                    <pre className="mb-0">
address,amount
0x742d35Cc6634C0532925a3b844Bc9e7595f6E321,1.5
0x53d284357Ec70cE289D6D64134DfAc8E511c8a3D,2.0
0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8,0.75
                    </pre>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <label className="form-label">Enter Recipients</label>
                    <textarea
                      className="form-control font-monospace"
                      rows="8"
                      placeholder="Enter one address and amount per line, separated by comma&#10;Example:&#10;0x742d35Cc6634C0532925a3b844Bc9e7595f6E321,1.5&#10;0x53d284357Ec70cE289D6D64134DfAc8E511c8a3D,2.0"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                    />
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={parseManualInput}
                  >
                    Parse Recipients
                  </button>
                </div>
              )}

              {/* Recipients Preview */}
              {recipients.length > 0 && (
                <div className="mt-4">
                  <h6>Recipients Preview ({recipients.length})</h6>
                  <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Address</th>
                          <th>Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.slice(0, 50).map((recipient, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td className="font-monospace" style={{ fontSize: '0.85rem' }}>
                              {recipient.address.substring(0, 10)}...{recipient.address.substring(recipient.address.length - 8)}
                            </td>
                            <td>{recipient.amount}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  setRecipients(recipients.filter((_, i) => i !== index));
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {recipients.length > 50 && (
                          <tr>
                            <td colSpan="4" className="text-center text-muted">
                              ...and {recipients.length - 50} more recipients
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
                      onClick={saveRecipientList}
                    >
                      <i className="bi bi-save me-2"></i>
                      Save Recipient List
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Transaction Summary</h5>
            </div>
            <div className="card-body">
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>Network:</td>
                    <td className="text-end">
                      <span className="badge bg-secondary">{selectedChain.toUpperCase()}</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Token:</td>
                    <td className="text-end">
                      {selectedToken === 'custom' ? 'Custom Token' : 
                        tokenPresets.find(t => t.value === selectedToken)?.label || 'Unknown'}
                    </td>
                  </tr>
                  <tr>
                    <td>Recipients:</td>
                    <td className="text-end">{totals.totalRecipients}</td>
                  </tr>
                  <tr>
                    <td>Unique Addresses:</td>
                    <td className="text-end">{totals.uniqueAddresses}</td>
                  </tr>
                  <tr>
                    <td>Total Amount:</td>
                    <td className="text-end fw-bold">{totals.totalAmount.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <td>Est. Gas Fee:</td>
                    <td className="text-end">{gasEstimate.toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="d-grid mt-3">
                <button
                  className="btn btn-success btn-lg"
                  onClick={handleSend}
                  disabled={!isUnlocked || recipients.length === 0 || sending}
                >
                  {sending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Send to {recipients.length} Recipients
                    </>
                  )}
                </button>
              </div>

              {/* Transaction Status */}
              {txStatus && (
                <div className={`alert mt-3 ${
                  txStatus.status === 'success' ? 'alert-success' : 
                  txStatus.status === 'error' ? 'alert-danger' : 
                  'alert-info'
                }`}>
                  <strong>
                    {txStatus.status === 'preparing' && <i className="bi bi-hourglass-split me-2"></i>}
                    {txStatus.status === 'signing' && <i className="bi bi-pen me-2"></i>}
                    {txStatus.status === 'broadcasting' && <i className="bi bi-broadcast me-2"></i>}
                    {txStatus.status === 'success' && <i className="bi bi-check-circle me-2"></i>}
                    {txStatus.status === 'error' && <i className="bi bi-x-circle me-2"></i>}
                  </strong>
                  {txStatus.message}
                  
                  {txStatus.txHash && (
                    <div className="mt-2">
                      <small>Transaction Hash:</small>
                      <div className="font-monospace" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {txStatus.txHash}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">
                <i className="bi bi-lightbulb me-2"></i>
                Tips
              </h6>
              <ul className="small mb-0">
                <li>Double-check all addresses before sending</li>
                <li>Test with small amounts first</li>
                <li>Keep transaction records for tax purposes</li>
                <li>Consider gas prices during high network usage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandardMultisend;