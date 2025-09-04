import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useProject } from '../contexts/ProjectContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import * as bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';
import { ethers } from 'ethers';
import Papa from 'papaparse';

const ManyToMany = () => {
  const navigate = useNavigate();
  const { selectedChain } = useWallet();
  const { currentProject } = useProject();
  const fileInputRef = useRef(null);
  
  const [transfers, setTransfers] = useState([]);
  const [selectedToken, setSelectedToken] = useState('native'); // 'native' or 'custom'
  const [tokenAddress, setTokenAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMethod, setInputMethod] = useState('manual'); // 'manual' or 'upload'
  const [manualInput, setManualInput] = useState({
    senderPrivateKey: '',
    recipientAddress: '',
    amount: ''
  });
  const [balances, setBalances] = useState({});
  const [processedTransfers, setProcessedTransfers] = useState([]);
  
  // Re-fetch balances when token selection changes
  useEffect(() => {
    if (transfers.length > 0) {
      fetchBalances(transfers);
    }
  }, [selectedToken, tokenAddress]);
  
  // Get chain display name and native token
  const getChainInfo = () => {
    switch (selectedChain) {
      case 'ethereum':
        return { name: 'Ethereum', token: 'ETH', color: 'primary' };
      case 'bsc':
        return { name: 'BSC', token: 'BNB', color: 'warning' };
      case 'base':
        return { name: 'Base', token: 'ETH', color: 'info' };
      case 'solana':
        return { name: 'Solana', token: 'SOL', color: 'success' };
      default:
        return { name: selectedChain, token: 'ETH', color: 'secondary' };
    }
  };
  
  const chainInfo = getChainInfo();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const validTransfers = [];
        results.data.forEach((row, index) => {
          if (index === 0 && row[0]?.toLowerCase().includes('private')) {
            // Skip header row
            return;
          }
          
          if (row.length >= 3 && row[0] && row[1] && row[2]) {
            const privateKey = row[0].trim();
            const recipientAddress = row[1].trim();
            const amount = parseFloat(row[2]);
            
            if (privateKey && recipientAddress && !isNaN(amount) && amount > 0) {
              validTransfers.push({
                id: Date.now() + Math.random(),
                senderPrivateKey: privateKey,
                recipientAddress,
                amount,
                status: 'pending'
              });
            }
          }
        });
        
        if (validTransfers.length > 0) {
          setTransfers(validTransfers);
          toast.success(`Loaded ${validTransfers.length} transfers from CSV`);
          fetchBalances(validTransfers);
        } else {
          toast.error('No valid transfers found in CSV');
        }
      },
      error: (error) => {
        toast.error('Error parsing CSV file');
        console.error(error);
      }
    });
  };

  const fetchBalances = async (transferList) => {
    try {
      // Extract unique public keys from transfers
      const addresses = [];
      for (const transfer of transferList) {
        try {
          const keypair = Keypair.fromSecretKey(bs58.decode(transfer.senderPrivateKey));
          addresses.push(keypair.publicKey.toString());
        } catch (error) {
          console.error('Error parsing private key:', error);
        }
      }
      
      if (addresses.length === 0) return;
      
      // Use backend endpoint to check balances
      const response = await axios.post('/api/multisender/check-balances', {
        addresses: [...new Set(addresses)], // Remove duplicates
        tokenAddress: selectedToken === 'native' ? null : tokenAddress,
        chain: selectedChain
      });
      
      if (response.data.success) {
        setBalances(response.data.balances);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Failed to fetch wallet balances');
    }
  };

  const handleManualAdd = () => {
    if (!manualInput.senderPrivateKey || !manualInput.recipientAddress || !manualInput.amount) {
      toast.error('Please fill all fields');
      return;
    }

    const newTransfer = {
      id: Date.now(),
      senderPrivateKey: manualInput.senderPrivateKey,
      recipientAddress: manualInput.recipientAddress,
      amount: parseFloat(manualInput.amount),
      status: 'pending'
    };

    const updatedTransfers = [...transfers, newTransfer];
    setTransfers(updatedTransfers);
    setManualInput({ senderPrivateKey: '', recipientAddress: '', amount: '' });
    fetchBalances(updatedTransfers);
    toast.success('Transfer added');
  };

  const removeTransfer = (id) => {
    setTransfers(transfers.filter(t => t.id !== id));
  };

  const processTransfers = async () => {
    if (transfers.length === 0) {
      toast.error('No transfers to process');
      return;
    }

    setIsProcessing(true);
    setProcessedTransfers([]);

    try {
      const response = await axios.post('/api/multisender/many-to-many', {
        projectId: currentProject._id,
        transfers: transfers.map(t => ({
          senderPrivateKey: t.senderPrivateKey,
          recipientAddress: t.recipientAddress,
          amount: t.amount,
          tokenAddress: selectedToken === 'native' ? null : tokenAddress
        })),
        chain: selectedChain
      });

      if (response.data.success) {
        setProcessedTransfers(response.data.results);
        toast.success(`Successfully processed ${response.data.successCount} transfers`);
        
        // Update transfer statuses
        const updatedTransfers = transfers.map(t => {
          const result = response.data.results.find(r => r.id === t.id);
          return {
            ...t,
            status: result?.success ? 'completed' : 'failed',
            signature: result?.signature,
            error: result?.error
          };
        });
        setTransfers(updatedTransfers);
      }
    } catch (error) {
      console.error('Error processing transfers:', error);
      toast.error(error.response?.data?.error || 'Failed to process transfers');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSenderDisplay = (privateKey) => {
    try {
      if (selectedChain === 'solana') {
        const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
        const publicKey = keypair.publicKey.toString();
        return publicKey;
      } else {
        // For EVM chains, derive address from private key
        let formattedKey = privateKey;
        if (!formattedKey.startsWith('0x')) {
          formattedKey = '0x' + formattedKey;
        }
        
        // Validate the key format
        if (!/^0x[0-9a-fA-F]{64}$/.test(formattedKey)) {
          return 'Invalid Key';
        }
        
        const wallet = new ethers.Wallet(formattedKey);
        return wallet.address;
      }
    } catch {
      return 'Invalid Key';
    }
  };
  
  const getShortAddress = (address) => {
    if (!address || address === 'Invalid Key') return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getExplorerUrl = (txHash) => {
    switch (selectedChain) {
      case 'ethereum':
        return `https://etherscan.io/tx/${txHash}`;
      case 'bsc':
        return `https://bscscan.com/tx/${txHash}`;
      case 'base':
        return `https://basescan.org/tx/${txHash}`;
      case 'solana':
        return `https://solscan.io/tx/${txHash}`;
      default:
        return '#';
    }
  };

  const downloadCSVTemplate = () => {
    let examplePrivateKey, exampleAddress;
    
    if (selectedChain === 'solana') {
      examplePrivateKey = '2cWjwTX7xF1n4PqGWbvEvNS51KiJ5qZW4X4WVLuunNeoYe2cK5ZmUd2eVHfwPLqcjmMm2JiS396Urtjfvu2fPjfP';
      exampleAddress = 'Example5R16jjMXeQRsCSSo39F2r6QB7Da83wjEKt9AAbva76QQ';
    } else {
      examplePrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      exampleAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f8A142';
    }
    
    const csvContent = 'sender_private_key,recipient_address,amount\n' +
      `${examplePrivateKey},${exampleAddress},1.5`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'many_to_many_template.csv';
    a.click();
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-0">Many-to-Many Transfer</h1>
          <p className="text-muted mt-2">
            Batch execute multi-to-multi transfers. Freely combine transactions, each transfer is independent, 
            addresses are unconnected, enhancing multi-address fund management efficiency.
          </p>
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
        <div className="alert alert-warning mb-4">
          <h5 className="alert-heading">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No Project Selected
          </h5>
          <p className="mb-0">
            Please select or create a project before using many-to-many transfers.
          </p>
        </div>
      ) : (
        <>
          {/* Token Selection */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Select Token</h5>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-check mb-2">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="tokenType" 
                      id="nativeToken"
                      checked={selectedToken === 'native'}
                      onChange={() => {
                        setSelectedToken('native');
                        setTokenAddress('');
                      }}
                    />
                    <label className="form-check-label" htmlFor="nativeToken">
                      {chainInfo.token} (Native Token)
                    </label>
                  </div>
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="tokenType" 
                      id="customToken"
                      checked={selectedToken === 'custom'}
                      onChange={() => setSelectedToken('custom')}
                    />
                    <label className="form-check-label" htmlFor="customToken">
                      Custom Token
                    </label>
                  </div>
                </div>
                <div className="col-md-6">
                  {selectedToken === 'custom' && (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter token contract address"
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Input Method Selection */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Transfer Input Method</h5>
              <div className="btn-group mb-3" role="group">
                <button 
                  className={`btn ${inputMethod === 'manual' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setInputMethod('manual')}
                >
                  <i className="bi bi-pencil me-2"></i>
                  Manual Input
                </button>
                <button 
                  className={`btn ${inputMethod === 'upload' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setInputMethod('upload')}
                >
                  <i className="bi bi-upload me-2"></i>
                  Upload CSV
                </button>
              </div>

              {inputMethod === 'manual' && (
                <div className="row">
                  <div className="col-md-4">
                    <label className="form-label">Sender Private Key</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter sender private key"
                      value={manualInput.senderPrivateKey}
                      onChange={(e) => setManualInput({...manualInput, senderPrivateKey: e.target.value})}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Recipient Address</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter recipient address"
                      value={manualInput.recipientAddress}
                      onChange={(e) => setManualInput({...manualInput, recipientAddress: e.target.value})}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Amount</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      value={manualInput.amount}
                      onChange={(e) => setManualInput({...manualInput, amount: e.target.value})}
                      step="0.000000001"
                    />
                  </div>
                  <div className="col-md-1 d-flex align-items-end">
                    <button 
                      className="btn btn-success w-100"
                      onClick={handleManualAdd}
                    >
                      <i className="bi bi-plus-lg"></i>
                    </button>
                  </div>
                </div>
              )}

              {inputMethod === 'upload' && (
                <div>
                  <div className="alert alert-info mb-3">
                    <i className="bi bi-info-circle me-2"></i>
                    Upload a CSV file with columns: sender_private_key, recipient_address, amount
                  </div>
                  <div className="d-flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="form-control"
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={downloadCSVTemplate}
                    >
                      <i className="bi bi-download me-2"></i>
                      Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transfers List */}
          {transfers.length > 0 && (
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Transfers Queue ({transfers.length})</h5>
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => setTransfers([])}
                >
                  Clear All
                </button>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Sender</th>
                        <th>Balance</th>
                        <th>Recipient</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map((transfer, index) => {
                        const senderPublic = getSenderDisplay(transfer.senderPrivateKey);
                        const balance = balances[senderPublic] || 0;
                        
                        return (
                          <tr key={transfer.id}>
                            <td>{index + 1}</td>
                            <td>
                              <code>{getShortAddress(senderPublic)}</code>
                            </td>
                            <td>
                              {balance.toFixed(4)} {selectedToken === 'native' ? chainInfo.token : ''}
                            </td>
                            <td>
                              <code>{getShortAddress(transfer.recipientAddress)}</code>
                            </td>
                            <td>{transfer.amount}</td>
                            <td>
                              {transfer.status === 'pending' && (
                                <span className="badge bg-secondary">Pending</span>
                              )}
                              {transfer.status === 'completed' && (
                                <span className="badge bg-success">Success</span>
                              )}
                              {transfer.status === 'failed' && (
                                <span className="badge bg-danger">Failed</span>
                              )}
                            </td>
                            <td>
                              {transfer.status === 'pending' && (
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeTransfer(transfer.id)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              )}
                              {transfer.signature && (
                                <a 
                                  href={getExplorerUrl(transfer.signature)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-primary ms-1"
                                >
                                  <i className="bi bi-box-arrow-up-right"></i>
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Process Button */}
          <div className="d-grid">
            <button 
              className="btn btn-primary btn-lg"
              onClick={processTransfers}
              disabled={isProcessing || transfers.length === 0}
            >
              {isProcessing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Processing Transfers...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  Process {transfers.length} Transfer{transfers.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ManyToMany;