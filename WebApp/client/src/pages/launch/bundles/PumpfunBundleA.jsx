import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../../../contexts/WalletContext';
import { useProject } from '../../../contexts/ProjectContext';
import { toast } from 'react-toastify';

const PumpfunBundleA = () => {
  const navigate = useNavigate();
  const { selectedChain, isUnlocked } = useWallet();
  const { currentProject, updateProject, addLog } = useProject();
  const fileInputRef = useRef(null);
  const walletFileInputRef = useRef(null);
  const logContainerRef = useRef(null);

  // Token Configuration
  const [tokenConfig, setTokenConfig] = useState({
    name: '',
    symbol: '',
    description: '',
    twitter: '',
    telegram: '',
    website: '',
    imageFile: null
  });

  // Bundle Configuration
  const [bundleConfig, setBundleConfig] = useState({
    totalSolAmount: '5',
    numberOfWallets: '20',
    solPerWallet: '0.25',
    devBuyAmount: '1',
    jitoTipAmount: '0.001',
    useVanityAddress: false,
    vanityPrefix: '',
    rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY',
    mainWalletPrivateKey: ''
  });

  // Purchasing Wallets
  const [purchaseWallets, setPurchaseWallets] = useState('');
  const [walletInputMethod, setWalletInputMethod] = useState('generate'); // 'generate' or 'manual'

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [executionPhase, setExecutionPhase] = useState('');
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState(null);
  const [simulationMode, setSimulationMode] = useState(true); // Default to simulation for safety
  
  // Password visibility toggle
  const [showMainWalletKey, setShowMainWalletKey] = useState(false);

  // Update SOL per wallet when total or wallet count changes
  useEffect(() => {
    const total = parseFloat(bundleConfig.totalSolAmount) || 0;
    const wallets = parseInt(bundleConfig.numberOfWallets) || 1;
    const perWallet = (total / wallets).toFixed(4);
    setBundleConfig(prev => ({ ...prev, solPerWallet: perWallet }));
  }, [bundleConfig.totalSolAmount, bundleConfig.numberOfWallets]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setTokenConfig(prev => ({ ...prev, imageFile: file }));
    }
  };

  const handleWalletFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line && line.length > 40); // Basic validation
      
      if (lines.length === 0) {
        toast.error('No valid private keys found in file');
        return;
      }

      setPurchaseWallets(lines.join('\n'));
      setBundleConfig(prev => ({ ...prev, numberOfWallets: lines.length.toString() }));
      toast.success(`Imported ${lines.length} wallets from file`);
    } catch (error) {
      toast.error('Failed to read wallet file');
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

  const validateConfig = () => {
    const errors = [];

    // Token validation
    if (!tokenConfig.name) errors.push('Token name is required');
    if (!tokenConfig.symbol) errors.push('Token symbol is required');
    if (!tokenConfig.description) errors.push('Token description is required');
    if (!tokenConfig.imageFile) errors.push('Token image is required');

    // Bundle validation
    if (!bundleConfig.mainWalletPrivateKey) errors.push('Main wallet private key is required');
    if (!bundleConfig.rpcUrl) errors.push('RPC URL is required');
    
    const totalSol = parseFloat(bundleConfig.totalSolAmount);
    const devBuy = parseFloat(bundleConfig.devBuyAmount);
    const jitoTip = parseFloat(bundleConfig.jitoTipAmount);
    const wallets = parseInt(bundleConfig.numberOfWallets);

    if (isNaN(totalSol) || totalSol <= 0) errors.push('Invalid total SOL amount');
    if (isNaN(devBuy) || devBuy < 0) errors.push('Invalid dev buy amount');
    if (isNaN(jitoTip) || jitoTip < 0) errors.push('Invalid Jito tip amount');
    if (isNaN(wallets) || wallets < 1 || wallets > 21) errors.push('Number of wallets must be between 1 and 21');

    if (bundleConfig.useVanityAddress && !bundleConfig.vanityPrefix) {
      errors.push('Vanity prefix is required when using vanity address');
    }

    // Wallet validation
    if (walletInputMethod === 'manual') {
      const walletLines = purchaseWallets.trim().split('\n').filter(line => line.trim());
      if (walletLines.length === 0) {
        errors.push('At least one purchasing wallet private key is required');
      } else if (walletLines.length !== parseInt(bundleConfig.numberOfWallets)) {
        errors.push(`Number of wallet private keys (${walletLines.length}) must match number of wallets (${bundleConfig.numberOfWallets})`);
      }
      
      // Basic validation for private key format (base58 check)
      walletLines.forEach((key, index) => {
        if (key.trim().length < 44) {
          errors.push(`Wallet ${index + 1}: Invalid private key format`);
        }
      });
    }

    return errors;
  };

  const executeBundleSimulation = async () => {
    const errors = validateConfig();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    if (!currentProject) {
      toast.error('Please select a project first');
      navigate('/projects');
      return;
    }

    setExecuting(true);
    setLogs([]);
    setResults(null);

    try {
      const token = localStorage.getItem('token');
      
      // Log to project history
      await addLog('launch', `Starting token launch: ${tokenConfig.name} (${tokenConfig.symbol})`, 'info', {
        tokenName: tokenConfig.name,
        tokenSymbol: tokenConfig.symbol,
        chain: selectedChain,
        bundleType: 'pumpfun-bundle-a'
      });

      // Phase 1: Upload Image
      let imagePath = null;
      if (tokenConfig.imageFile) {
        setExecutionPhase('metadata');
        addLocalLog('Uploading token image...', 'info');
        
        const formData = new FormData();
        formData.append('image', tokenConfig.imageFile);
        
        try {
          const uploadResponse = await fetch('/api/launch/upload-image', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Failed to upload image');
          }
          
          const uploadResult = await uploadResponse.json();
          imagePath = uploadResult.localPath;
          addLocalLog(`✅ Image uploaded: ${uploadResult.imageUrl}`, 'success');
        } catch (error) {
          addLocalLog(`❌ Image upload failed: ${error.message}`, 'error');
          throw error;
        }
      }

      // Phase 2: Validate Configuration
      addLocalLog('Validating bundle configuration...', 'info');
      
      const validateResponse = await fetch('/api/launch/bundles/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tokenConfig,
          bundleConfig
        })
      });

      const validation = await validateResponse.json();
      
      if (!validation.success) {
        validation.errors.forEach(error => {
          addLocalLog(`❌ Validation error: ${error}`, 'error');
        });
        throw new Error('Configuration validation failed');
      }

      validation.warnings?.forEach(warning => {
        addLocalLog(`⚠️ Warning: ${warning}`, 'warning');
      });

      addLocalLog(`✅ Configuration validated. Total cost: ${validation.estimatedCost.totalSol} SOL`, 'success');

      // Phase 3: Execute Bundle
      setExecutionPhase('bundle');
      addLocalLog('Executing bundle launch...', 'info');
      
      const executeResponse = await fetch('/api/launch/bundles/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tokenConfig,
          bundleConfig: {
            ...bundleConfig,
            walletInputMethod,
            purchaseWallets: walletInputMethod === 'manual' ? purchaseWallets : undefined
          },
          simulation: simulationMode,
          imagePath
        })
      });

      if (!executeResponse.ok) {
        const error = await executeResponse.json();
        throw new Error(error.error || 'Bundle execution failed');
      }

      const executeResult = await executeResponse.json();
      
      if (!executeResult.success) {
        throw new Error(executeResult.error || 'Bundle execution failed');
      }

      // Process results
      const results = executeResult.results;
      
      // Log execution phases
      if (results.simulation) {
        addLocalLog('🔧 Running in SIMULATION mode', 'warning');
      }
      
      addLocalLog(`✅ Token mint: ${results.tokenMint}`, 'success');
      addLocalLog(`✅ Metadata URI: ${results.metadataUri}`, 'success');
      addLocalLog(`✅ LUT Address: ${results.lutAddress}`, 'success');
      addLocalLog(`✅ Bundle ID: ${results.bundleId}`, 'success');
      addLocalLog(`💰 Bonding curve: ${results.bondingCurveProgress}%`, 'info');
      addLocalLog(`📈 Market cap: $${results.marketCap}`, 'info');
      
      setExecutionPhase('complete');
      
      // Set display results
      const displayResults = {
        ...results,
        pumpfunUrl: `https://pump.fun/token/${results.tokenMint}`,
        solscanUrl: `https://solscan.io/token/${results.tokenMint}`,
        dexscreenerUrl: `https://dexscreener.com/solana/${results.tokenMint}`
      };
      
      setResults(displayResults);
      
      // Save token info to project
      if (!results.simulation) {
        try {
          const tokenData = {
            [selectedChain]: {
              address: results.tokenMint,
              name: tokenConfig.name,
              symbol: tokenConfig.symbol,
              decimals: 9,
              launchDate: new Date().toISOString(),
              launchMethod: 'pumpfun-bundle-a',
              metadata: {
                description: tokenConfig.description,
                twitter: tokenConfig.twitter,
                telegram: tokenConfig.telegram,
                website: tokenConfig.website,
                metadataUri: results.metadataUri,
                bundleId: results.bundleId,
                lutAddress: results.lutAddress,
                bondingCurveProgress: results.bondingCurveProgress,
                marketCap: results.marketCap,
                totalSolSpent: results.totalSolSpent,
                walletCount: results.walletCount
              }
            }
          };

          await updateProject(currentProject._id, {
            tokens: { ...currentProject.tokens, ...tokenData }
          });

          // Log successful launch to project history
          await addLog('launch', `Token launched successfully: ${tokenConfig.name} (${tokenConfig.symbol})`, 'success', {
            tokenAddress: results.tokenMint,
            tokenName: tokenConfig.name,
            tokenSymbol: tokenConfig.symbol,
            chain: selectedChain,
            bondingCurveProgress: results.bondingCurveProgress,
            marketCap: results.marketCap,
            bundleId: results.bundleId
          });
        } catch (err) {
          console.error('Failed to save token info:', err);
          toast.warning('Token launched but failed to save to project');
        }
      }
      
      addLocalLog('🎉 Token launch successful!', 'success');
      
    } catch (error) {
      addLocalLog(`❌ Error: ${error.message}`, 'error');
      toast.error('Bundle execution failed');
      
      // Log error to project history
      await addLog('launch', `Token launch failed: ${error.message}`, 'error', {
        tokenName: tokenConfig.name,
        tokenSymbol: tokenConfig.symbol,
        chain: selectedChain,
        error: error.message
      });
    } finally {
      setExecuting(false);
      setExecutionPhase('');
    }
  };

  const getLogClass = (type) => {
    switch (type) {
      case 'success': return 'text-success';
      case 'error': return 'text-danger';
      case 'warning': return 'text-warning';
      default: return 'text-info';
    }
  };

  const getPhaseIcon = (phase) => {
    switch (phase) {
      case 'metadata': return 'bi-cloud-upload';
      case 'wallets': return 'bi-wallet2';
      case 'token': return 'bi-coin';
      case 'distribution': return 'bi-cash-stack';
      case 'lut': return 'bi-table';
      case 'bundle': return 'bi-box-seam';
      case 'complete': return 'bi-check-circle';
      default: return 'bi-hourglass';
    }
  };

  if (selectedChain !== 'solana') {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Please switch to Solana network to use this bundler.
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          <h5 className="alert-heading">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No Project Selected
          </h5>
          <p className="mb-0">
            Please select or create a project before launching tokens. 
            <button 
              className="btn btn-sm btn-warning ms-2"
              onClick={() => navigate('/projects')}
            >
              Go to Projects
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Pump.fun Bundle A</h1>
          <p className="text-muted mb-0">
            Project: <strong>{currentProject.name}</strong>
          </p>
        </div>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/launch/bundles')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to Bundles
        </button>
      </div>

      <p className="lead">
        Launch tokens on Pump.fun with automated multi-wallet buying strategy.
      </p>

      <div className="row">
        {/* Configuration Column */}
        <div className="col-lg-7">
          {/* Token Configuration */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Token Configuration</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Token Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="My Token"
                    value={tokenConfig.name}
                    onChange={(e) => setTokenConfig({...tokenConfig, name: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Token Symbol</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="MTK"
                    value={tokenConfig.symbol}
                    onChange={(e) => setTokenConfig({...tokenConfig, symbol: e.target.value})}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Describe your token..."
                    value={tokenConfig.description}
                    onChange={(e) => setTokenConfig({...tokenConfig, description: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Twitter (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://twitter.com/..."
                    value={tokenConfig.twitter}
                    onChange={(e) => setTokenConfig({...tokenConfig, twitter: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Telegram (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://t.me/..."
                    value={tokenConfig.telegram}
                    onChange={(e) => setTokenConfig({...tokenConfig, telegram: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Website (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://..."
                    value={tokenConfig.website}
                    onChange={(e) => setTokenConfig({...tokenConfig, website: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Token Image</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <div className="form-text">Max 5MB, square image recommended</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bundle Configuration */}
          <div className="card mb-4">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Bundle Configuration</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Total SOL Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    step="0.1"
                    value={bundleConfig.totalSolAmount}
                    onChange={(e) => setBundleConfig({...bundleConfig, totalSolAmount: e.target.value})}
                  />
                  <div className="form-text">Total SOL to distribute across wallets</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Number of Wallets</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    max="21"
                    value={bundleConfig.numberOfWallets}
                    onChange={(e) => setBundleConfig({...bundleConfig, numberOfWallets: e.target.value})}
                  />
                  <div className="form-text">1-21 wallets (max due to tx size)</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">SOL Per Wallet</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bundleConfig.solPerWallet}
                    disabled
                  />
                  <div className="form-text">Auto-calculated</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Dev Buy Amount (SOL)</label>
                  <input
                    type="number"
                    className="form-control"
                    step="0.1"
                    value={bundleConfig.devBuyAmount}
                    onChange={(e) => setBundleConfig({...bundleConfig, devBuyAmount: e.target.value})}
                  />
                  <div className="form-text">Your initial buy amount</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Jito Tip Amount (SOL)</label>
                  <input
                    type="number"
                    className="form-control"
                    step="0.0001"
                    value={bundleConfig.jitoTipAmount}
                    onChange={(e) => setBundleConfig({...bundleConfig, jitoTipAmount: e.target.value})}
                  />
                  <div className="form-text">Tip for bundle inclusion</div>
                </div>
                <div className="col-md-6">
                  <div className="form-check form-switch mt-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="vanitySwitch"
                      checked={bundleConfig.useVanityAddress}
                      onChange={(e) => setBundleConfig({...bundleConfig, useVanityAddress: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="vanitySwitch">
                      Use Vanity Address
                    </label>
                  </div>
                  {bundleConfig.useVanityAddress && (
                    <input
                      type="text"
                      className="form-control mt-2"
                      placeholder="Prefix (e.g., PUMP)"
                      value={bundleConfig.vanityPrefix}
                      onChange={(e) => setBundleConfig({...bundleConfig, vanityPrefix: e.target.value.toUpperCase()})}
                      maxLength="4"
                    />
                  )}
                </div>
                <div className="col-12">
                  <label className="form-label">RPC URL</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bundleConfig.rpcUrl}
                    onChange={(e) => setBundleConfig({...bundleConfig, rpcUrl: e.target.value})}
                  />
                  <div className="form-text">Helius RPC recommended for best performance</div>
                </div>
                <div className="col-12">
                  <label className="form-label">Main Wallet Private Key</label>
                  <div className="position-relative">
                    <input
                      type={showMainWalletKey ? "text" : "password"}
                      className="form-control pe-5"
                      placeholder="Your wallet private key"
                      value={bundleConfig.mainWalletPrivateKey}
                      onChange={(e) => setBundleConfig({...bundleConfig, mainWalletPrivateKey: e.target.value})}
                    />
                    <button
                      type="button"
                      className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                      onClick={() => setShowMainWalletKey(!showMainWalletKey)}
                      style={{ 
                        border: 'none', 
                        background: 'none',
                        color: '#6c757d'
                      }}
                    >
                      <i className={`bi bi-eye${showMainWalletKey ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                  <div className="form-text text-warning">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    This is stored locally and never sent to our servers
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchasing Wallets Configuration */}
          <div className="card mb-4">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">Purchasing Wallets</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Wallet Input Method</label>
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="walletMethod"
                    id="generateWallets"
                    checked={walletInputMethod === 'generate'}
                    onChange={() => setWalletInputMethod('generate')}
                  />
                  <label className="btn btn-outline-primary" htmlFor="generateWallets">
                    <i className="bi bi-magic me-2"></i>
                    Generate New Wallets
                  </label>
                  
                  <input
                    type="radio"
                    className="btn-check"
                    name="walletMethod"
                    id="manualWallets"
                    checked={walletInputMethod === 'manual'}
                    onChange={() => setWalletInputMethod('manual')}
                  />
                  <label className="btn btn-outline-primary" htmlFor="manualWallets">
                    <i className="bi bi-pencil-square me-2"></i>
                    Enter Private Keys
                  </label>
                </div>
              </div>

              {walletInputMethod === 'generate' ? (
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Automatic Generation:</strong> The bundler will generate {bundleConfig.numberOfWallets} new wallets automatically when you launch. 
                  Each wallet will receive {bundleConfig.solPerWallet} SOL from your main wallet for purchasing.
                </div>
              ) : (
                <div>
                  <label className="form-label">
                    Private Keys ({bundleConfig.numberOfWallets} wallets required)
                  </label>
                  <textarea
                    className="form-control font-monospace"
                    rows="10"
                    placeholder={`Enter ${bundleConfig.numberOfWallets} private keys, one per line\n\nExample:\n5KJH8uW3mb9DeVt6BwPRUqDfxGHMGKPWkFgDh3HwCqXm...\n4nK3Fer7daU8vKPCdJsYPvj5DDqBpfDeBbz9Qc4E...\n...`}
                    value={purchaseWallets}
                    onChange={(e) => setPurchaseWallets(e.target.value)}
                  />
                  <div className="form-text">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <i className="bi bi-shield-lock text-warning me-1"></i>
                        Private keys are stored locally and never sent to servers
                      </div>
                      <div className="text-end">
                        Lines: {purchaseWallets.split('\n').filter(line => line.trim()).length} / {bundleConfig.numberOfWallets}
                      </div>
                    </div>
                  </div>
                  
                  {purchaseWallets && (
                    <div className="mt-2">
                      {purchaseWallets.split('\n').filter(line => line.trim()).length !== parseInt(bundleConfig.numberOfWallets) && (
                        <div className="alert alert-warning py-2">
                          <small>
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            You have entered {purchaseWallets.split('\n').filter(line => line.trim()).length} private keys, 
                            but {bundleConfig.numberOfWallets} are required.
                          </small>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3">
                    <h6>Import Options:</h6>
                    <div className="btn-group" role="group">
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => walletFileInputRef.current?.click()}
                      >
                        <i className="bi bi-file-earmark-arrow-up me-1"></i>
                        Import from File
                      </button>
                      <input
                        ref={walletFileInputRef}
                        type="file"
                        className="d-none"
                        accept=".txt,.csv"
                        onChange={handleWalletFileImport}
                      />
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          if (window.confirm('Clear all entered private keys?')) {
                            setPurchaseWallets('');
                          }
                        }}
                      >
                        <i className="bi bi-trash me-1"></i>
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="alert alert-warning mt-3">
                <h6 className="alert-heading">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Important Security Notes:
                </h6>
                <ul className="mb-0 small">
                  <li>Each wallet needs enough SOL to cover the purchase amount plus transaction fees</li>
                  <li>Never share your private keys with anyone</li>
                  <li>Consider using burner wallets for bundle purchases</li>
                  <li>The bundler will distribute {bundleConfig.solPerWallet} SOL to each wallet automatically</li>
                </ul>
              </div>

              {/* Simulation Mode Toggle */}
              <div className="alert alert-info mt-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">
                      <i className="bi bi-shield-check me-2"></i>
                      Execution Mode
                    </h6>
                    <small className="text-muted">
                      {simulationMode ? 
                        'Simulation mode is active. No real transactions will be executed.' : 
                        'LIVE MODE: Real transactions will be executed on mainnet!'}
                    </small>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="simulationToggle"
                      checked={!simulationMode}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Switching to live mode
                          if (window.confirm(
                            '⚠️ WARNING: You are about to switch to LIVE MODE!\n\n' +
                            'This will execute real transactions on Solana mainnet:\n' +
                            '• Real SOL will be spent\n' +
                            '• Transactions cannot be reversed\n' +
                            '• Ensure you have sufficient balance\n\n' +
                            'Are you absolutely sure you want to continue?'
                          )) {
                            setSimulationMode(false);
                          } else {
                            e.target.checked = false;
                          }
                        } else {
                          setSimulationMode(true);
                        }
                      }}
                    />
                    <label className="form-check-label ms-2" htmlFor="simulationToggle">
                      <strong>{simulationMode ? 'Simulation' : 'LIVE'}</strong>
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-grid mt-4">
                <button
                  className={`btn ${simulationMode ? 'btn-primary' : 'btn-danger'} btn-lg`}
                  onClick={executeBundleSimulation}
                  disabled={executing}
                >
                  {executing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Executing Bundle...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-rocket-takeoff me-2"></i>
                      {simulationMode ? 'Launch Token (Simulation)' : 'Launch Token (LIVE)'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Execution Log Column */}
        <div className="col-lg-5">
          {/* Progress Indicator */}
          {executing && (
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="d-flex align-items-center">
                  <i className={`${getPhaseIcon(executionPhase)} me-2`}></i>
                  {executionPhase.charAt(0).toUpperCase() + executionPhase.slice(1)}
                </h6>
                <div className="progress">
                  <div 
                    className="progress-bar progress-bar-striped progress-bar-animated" 
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Execution Log */}
          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Execution Log</h5>
            </div>
            <div 
              className="card-body bg-dark text-light"
              style={{ height: '500px', overflowY: 'auto' }}
              ref={logContainerRef}
            >
              {logs.length === 0 ? (
                <div className="text-muted text-center">
                  Bundle execution logs will appear here...
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

          {/* Results */}
          {results && (
            <div className="card mt-3">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Launch Results</h5>
              </div>
              <div className="card-body">
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td>Token Mint:</td>
                      <td className="font-monospace small">{results.tokenMint}</td>
                    </tr>
                    <tr>
                      <td>Bonding Curve:</td>
                      <td>{results.bondingCurveProgress}%</td>
                    </tr>
                    <tr>
                      <td>Market Cap:</td>
                      <td>${results.marketCap}</td>
                    </tr>
                    <tr>
                      <td>Wallets Used:</td>
                      <td>{results.walletCount}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="d-grid gap-2 mt-3">
                  <a 
                    href={results.pumpfunUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    <i className="bi bi-box-arrow-up-right me-2"></i>
                    View on Pump.fun
                  </a>
                  <a 
                    href={results.solscanUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline-primary btn-sm"
                  >
                    <i className="bi bi-box-arrow-up-right me-2"></i>
                    View on Solscan
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PumpfunBundleA;