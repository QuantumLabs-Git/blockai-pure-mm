import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useProject } from '../contexts/ProjectContext';
import { toast } from 'react-toastify';
import { saveEncryptedKeysToXLS, validatePrivateKey } from '../crypto/keyManager';
import * as XLSX from 'xlsx';

const WalletManagement = () => {
  const { 
    isUnlocked, 
    wallets, 
    selectedChain, 
    loadKeysFromFile, 
    unlockWallets,
    lockWallets,
    saveKeysToFile,
    hasEncryptedData
  } = useWallet();
  
  const { 
    currentProject, 
    updateProject,
    hasPermission 
  } = useProject();

  const [activeTab, setActiveTab] = useState('manage');
  const [password, setPassword] = useState('');
  const [privateKeys, setPrivateKeys] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);
  const [showGeneratorCard, setShowGeneratorCard] = useState(true);
  const [showWarmupCard, setShowWarmupCard] = useState(false);
  const [projectWallets, setProjectWallets] = useState([]);
  const [associatingWallet, setAssociatingWallet] = useState(false);
  
  // Generation form state
  const [walletCount, setWalletCount] = useState(10);
  const [fileName, setFileName] = useState('');
  const [encryptPassword, setEncryptPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  
  // Password visibility toggles
  const [showEncryptPassword, setShowEncryptPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showImportPassword, setShowImportPassword] = useState(false);

  // Update visibility based on chain selection
  useEffect(() => {
    const supportedChains = ['ethereum', 'bsc', 'base', 'solana'];
    setShowGeneratorCard(supportedChains.includes(selectedChain));
    setShowWarmupCard(selectedChain === 'solana');
    setFileName(`${selectedChain}_wallets.xlsx`);
  }, [selectedChain]);

  // Load project wallets when project changes
  useEffect(() => {
    if (currentProject && currentProject.wallets) {
      setProjectWallets(currentProject.wallets[selectedChain] || []);
    } else {
      setProjectWallets([]);
    }
  }, [currentProject, selectedChain]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePassword = prompt('Enter password to decrypt wallet file:');
    if (!filePassword) return;

    const result = await loadKeysFromFile(file, filePassword);
    if (result.success) {
      toast.success(`Loaded ${result.count} wallets`);
    }
  };

  const handleQuickImport = async (e) => {
    e.preventDefault();
    
    if (!privateKeys.trim()) {
      toast.error('Please enter at least one private key');
      return;
    }

    if (!password) {
      toast.error('Please enter a password to encrypt your keys');
      return;
    }

    // For quick testing - create a temporary encrypted "file" in memory
    const keys = privateKeys.split('\n').map(k => k.trim()).filter(k => k);
    
    // Validate keys
    const validKeys = keys.filter(key => validatePrivateKey(key, selectedChain));
    if (validKeys.length === 0) {
      toast.error('No valid private keys for ' + selectedChain);
      return;
    }

    // Create a mock file object
    const mockFile = {
      text: async () => JSON.stringify(
        validKeys.map(key => ({ private_key: key }))
      )
    };

    const result = await loadKeysFromFile(mockFile, password);
    if (result.success) {
      toast.success('Wallet imported successfully!');
      setShowImportForm(false);
      setPrivateKeys('');
      setPassword('');
    }
  };

  const handleGenerateWallets = async (e) => {
    e.preventDefault();

    if (!encryptPassword) {
      toast.error('Please enter an encryption password');
      return;
    }

    if (encryptPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (encryptPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setGenerating(true);
    setGenerationResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/wallet/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          walletCount: parseInt(walletCount),
          blockchain: selectedChain,
          fileName
        })
      });

      const data = await response.json();

      if (data.success) {
        // Create encrypted XLSX file with generated wallets
        const worksheet = XLSX.utils.json_to_sheet(data.wallets.map(wallet => ({
          [selectedChain === 'solana' ? 'Public Key' : 'Address']: wallet.address,
          'Private Key': wallet.privateKey,
          'Encrypted': 'No - Please save with encryption'
        })));
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Wallets');
        
        // Add metadata sheet
        const metaSheet = XLSX.utils.json_to_sheet([{
          'Generated': new Date().toISOString(),
          'Blockchain': selectedChain.toUpperCase(),
          'Count': data.wallets.length,
          'Warning': 'KEEP THIS FILE SECURE - Contains private keys!'
        }]);
        XLSX.utils.book_append_sheet(workbook, metaSheet, 'Info');

        // Download the file
        XLSX.writeFile(workbook, fileName);

        setGenerationResult({
          count: data.wallets.length,
          fileName: fileName
        });

        toast.success(`Generated ${data.wallets.length} ${selectedChain} wallets!`);

        // Auto-import the generated wallets if user wants
        if (window.confirm('Do you want to import these wallets now?')) {
          // Create mock file with the wallets
          const mockFile = {
            text: async () => JSON.stringify(
              data.wallets.map(w => ({ private_key: w.privateKey }))
            )
          };

          const result = await loadKeysFromFile(mockFile, encryptPassword);
          if (result.success) {
            toast.success('Wallets imported and encrypted!');
            setActiveTab('manage');
          }
        }
      } else {
        toast.error(data.message || 'Failed to generate wallets');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate wallets: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const getChainColor = () => {
    switch (selectedChain) {
      case 'ethereum': return 'primary';
      case 'bsc': return 'warning';
      case 'base': return 'info';
      case 'solana': return 'success';
      default: return 'secondary';
    }
  };

  // Function to add wallet to project
  const addWalletToProject = async (walletAddress) => {
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }

    if (!hasPermission('member')) {
      toast.error('You need member permissions to add wallets');
      return;
    }

    setAssociatingWallet(true);
    try {
      // Update project with new wallet
      const updatedWallets = {
        ...currentProject.wallets,
        [selectedChain]: [...(currentProject.wallets[selectedChain] || []), walletAddress]
      };

      await updateProject(currentProject._id, { wallets: updatedWallets });
      toast.success('Wallet added to project');
    } catch (error) {
      toast.error('Failed to add wallet to project');
      console.error(error);
    } finally {
      setAssociatingWallet(false);
    }
  };

  // Function to remove wallet from project
  const removeWalletFromProject = async (walletAddress) => {
    if (!currentProject) return;

    if (!hasPermission('member')) {
      toast.error('You need member permissions to remove wallets');
      return;
    }

    try {
      const updatedWallets = {
        ...currentProject.wallets,
        [selectedChain]: (currentProject.wallets[selectedChain] || []).filter(
          w => w !== walletAddress
        )
      };

      await updateProject(currentProject._id, { wallets: updatedWallets });
      toast.success('Wallet removed from project');
    } catch (error) {
      toast.error('Failed to remove wallet from project');
      console.error(error);
    }
  };

  // Check if wallet is associated with current project
  const isWalletInProject = (walletAddress) => {
    return projectWallets.includes(walletAddress);
  };

  return (
    <div className="container py-4">
      <h1 className="mb-4">Wallet Management</h1>
      
      {/* Project Status Card */}
      {!currentProject && (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          No project selected. Please select or create a project to associate wallets.
        </div>
      )}
      
      {currentProject && (
        <div className="card mb-4 border-primary">
          <div className="card-body">
            <h5 className="mb-0">
              <i className="bi bi-folder-fill text-primary me-2"></i>
              Current Project: {currentProject.name}
            </h5>
            <p className="mb-0 mt-2 text-muted">
              {projectWallets.length} wallet(s) associated with this project for {selectedChain.toUpperCase()}
            </p>
          </div>
        </div>
      )}

      {/* Wallet Status Card */}
      <div className={`card mb-4 ${isUnlocked ? 'border-success' : 'border-warning'}`}>
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col">
              <h5 className="mb-0">
                <i className={`bi ${isUnlocked ? 'bi-unlock-fill text-success' : 'bi-lock-fill text-warning'} me-2`}></i>
                Wallet Status: {isUnlocked ? 'Unlocked' : 'Locked'}
              </h5>
              {isUnlocked && (
                <p className="mb-0 mt-2 text-muted">
                  {wallets.length} wallet(s) loaded for {selectedChain.toUpperCase()}
                </p>
              )}
            </div>
            <div className="col-auto">
              {isUnlocked ? (
                <button className="btn btn-danger" onClick={lockWallets}>
                  <i className="bi bi-lock me-2"></i>Lock Wallets
                </button>
              ) : (
                <button 
                  className="btn btn-success" 
                  onClick={() => setShowImportForm(true)}
                >
                  <i className="bi bi-unlock me-2"></i>
                  Import & Unlock
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Generator Card */}
      {showGeneratorCard && (
        <div className={`card mb-4`} id="walletGenerator">
          <div className={`card-header bg-${getChainColor()} text-white`}>
            <h5 className="mb-0">Generate {selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1)} Wallets</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleGenerateWallets}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Number of Wallets</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max="1000"
                      value={walletCount}
                      onChange={(e) => setWalletCount(e.target.value)}
                      required
                    />
                    <div className="form-text">Generate between 1 and 1000 wallets</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">File Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder={`${selectedChain}_wallets.xlsx`}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Encryption Password</label>
                    <div className="position-relative">
                      <input
                        type={showEncryptPassword ? "text" : "password"}
                        className="form-control pe-5"
                        value={encryptPassword}
                        onChange={(e) => setEncryptPassword(e.target.value)}
                        placeholder="Choose a strong password"
                        required
                        minLength="8"
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                        onClick={() => setShowEncryptPassword(!showEncryptPassword)}
                        style={{ 
                          border: 'none', 
                          background: 'none',
                          color: '#6c757d'
                        }}
                      >
                        <i className={`bi bi-eye${showEncryptPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    <div className="form-text">Min 8 characters - You'll need this to access the wallets</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Confirm Password</label>
                    <div className="position-relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="form-control pe-5"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ 
                          border: 'none', 
                          background: 'none',
                          color: '#6c757d'
                        }}
                      >
                        <i className={`bi bi-eye${showConfirmPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {selectedChain === 'solana' && (
                <div className="alert alert-info mb-3">
                  <h6>Solana Wallet Information</h6>
                  <p className="mb-1">Solana wallets use Ed25519 elliptic curve cryptography.</p>
                  <p className="mb-0">Keys will be in Base58 format.</p>
                </div>
              )}

              <button 
                type="submit" 
                className={`btn btn-${getChainColor()}`}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-wallet2 me-2"></i>
                    Generate Wallets
                  </>
                )}
              </button>
            </form>

            {generationResult && (
              <div className="alert alert-success mt-3">
                <i className="bi bi-check-circle me-2"></i>
                Generated {generationResult.count} wallets successfully!
                <br/>
                <small>File saved as: {generationResult.fileName}</small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Solana Wallet WarmUp Card */}
      {showWarmupCard && (
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">Solana Wallet WarmUp</h5>
          </div>
          <div className="card-body">
            <p>Warm up multiple Solana wallets with token transactions to prepare them for active use.</p>
            <ul className="mb-3">
              <li>Upload a CSV file with wallet private keys or enter them manually</li>
              <li>Select up to 10 token addresses to use for warmup transactions</li>
              <li>Run parallel instances to warm up different sets of wallets simultaneously</li>
              <li>Monitor transaction status in real-time</li>
            </ul>
            <button 
              className="btn btn-success"
              onClick={() => window.location.href = '/wallet-warmup'}
            >
              <i className="bi bi-fire me-2"></i>Go to Wallet WarmUp
            </button>
          </div>
        </div>
      )}

      {/* Quick Import Form */}
      {showImportForm && !isUnlocked && (
        <div className="card mb-4 border-primary">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Import Wallets</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleQuickImport}>
              <div className="mb-3">
                <label className="form-label">Private Keys</label>
                <textarea
                  className="form-control font-monospace"
                  rows="4"
                  placeholder="Enter private keys (one per line)"
                  value={privateKeys}
                  onChange={(e) => setPrivateKeys(e.target.value)}
                  required
                />
                <div className="form-text">
                  For Solana: Base58 encoded private key<br/>
                  For EVM: 64 character hex key (with or without 0x prefix)
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Encryption Password</label>
                <div className="position-relative">
                  <input
                    type={showImportPassword ? "text" : "password"}
                    className="form-control pe-5"
                    placeholder="Password to encrypt your keys"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                    onClick={() => setShowImportPassword(!showImportPassword)}
                    style={{ 
                      border: 'none', 
                      background: 'none',
                      color: '#6c757d'
                    }}
                  >
                    <i className={`bi bi-eye${showImportPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>

              <div className="alert alert-warning">
                <i className="bi bi-shield-lock me-2"></i>
                Your private keys are encrypted and never sent to any server.
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-key me-2"></i>Import & Unlock
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowImportForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'manage' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage')}
              >
                Manage Wallets
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'import' ? 'active' : ''}`}
                onClick={() => setActiveTab('import')}
              >
                Import/Export
              </button>
            </li>
          </ul>
        </div>
        
        <div className="card-body">
          {/* Manage Tab */}
          {activeTab === 'manage' && (
            <div>
              {!isUnlocked ? (
                <div className="text-center py-4">
                  <i className="bi bi-lock display-4 text-muted"></i>
                  <p className="mt-3">Unlock your wallet to view and manage addresses</p>
                  {!showImportForm && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowImportForm(true)}
                    >
                      Import Wallet
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <h5>Your Wallets</h5>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Chain</th>
                          <th>Project</th>
                          <th>Balance</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wallets.map((wallet, index) => {
                          const inProject = isWalletInProject(wallet.address);
                          return (
                            <tr key={wallet.id}>
                              <td className="font-monospace">
                                <span className="text-truncate d-inline-block" style={{maxWidth: '300px'}}>
                                  {wallet.address}
                                </span>
                                <button 
                                  className="btn btn-sm btn-link"
                                  onClick={() => {
                                    navigator.clipboard.writeText(wallet.address);
                                    toast.success('Address copied!');
                                  }}
                                >
                                  <i className="bi bi-clipboard"></i>
                                </button>
                              </td>
                              <td>
                                <span className={`badge bg-${getChainColor()}`}>
                                  {wallet.chain.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                {currentProject ? (
                                  inProject ? (
                                    <span className="badge bg-success">
                                      <i className="bi bi-check-circle me-1"></i>
                                      In Project
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary">
                                      Not in Project
                                    </span>
                                  )
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>-</td>
                              <td>
                                {currentProject && (
                                  <>
                                    {!inProject ? (
                                      <button 
                                        className="btn btn-sm btn-outline-success me-1"
                                        onClick={() => addWalletToProject(wallet.address)}
                                        disabled={associatingWallet || !hasPermission('member')}
                                        title={hasPermission('member') ? 'Add to project' : 'No permission'}
                                      >
                                        <i className="bi bi-plus-circle"></i>
                                      </button>
                                    ) : (
                                      <button 
                                        className="btn btn-sm btn-outline-warning me-1"
                                        onClick={() => removeWalletFromProject(wallet.address)}
                                        disabled={!hasPermission('member')}
                                        title={hasPermission('member') ? 'Remove from project' : 'No permission'}
                                      >
                                        <i className="bi bi-dash-circle"></i>
                                      </button>
                                    )}
                                  </>
                                )}
                                <button className="btn btn-sm btn-outline-primary me-1">
                                  <i className="bi bi-eye"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger">
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {hasEncryptedData && (
                    <button 
                      className="btn btn-success mt-3"
                      onClick={saveKeysToFile}
                    >
                      <i className="bi bi-download me-2"></i>
                      Export Encrypted Wallet
                    </button>
                  )}
                  
                  {currentProject && projectWallets.length > 0 && (
                    <div className="mt-3">
                      <h6>Project Wallets ({selectedChain.toUpperCase()})</h6>
                      <div className="list-group">
                        {projectWallets.map((address, idx) => (
                          <div key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                            <span className="font-monospace small">{address}</span>
                            {hasPermission('member') && (
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeWalletFromProject(address)}
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import/Export Tab */}
          {activeTab === 'import' && (
            <div>
              <div className="row">
                <div className="col-md-6 mb-4">
                  <h6>Import from File</h6>
                  <input
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                  <div className="form-text">
                    Upload an encrypted XLS file containing wallet keys
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <h6>Import Private Keys</h6>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowImportForm(true)}
                  >
                    <i className="bi bi-key me-2"></i>
                    Import Keys Manually
                  </button>
                </div>
              </div>

              {hasEncryptedData && (
                <div className="border-top pt-3">
                  <h6>Export Encrypted Wallet</h6>
                  <p>Download your encrypted wallet file for backup</p>
                  <button className="btn btn-success" onClick={saveKeysToFile}>
                    <i className="bi bi-download me-2"></i>
                    Download Encrypted Wallet
                  </button>
                </div>
              )}

              <div className="alert alert-info mt-4">
                <h6 className="alert-heading">Security Tips</h6>
                <ul className="mb-0">
                  <li>Always use a strong encryption password</li>
                  <li>Store wallet files in a secure location</li>
                  <li>Never share your private keys or passwords</li>
                  <li>Keep backup copies of encrypted wallet files</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletManagement;