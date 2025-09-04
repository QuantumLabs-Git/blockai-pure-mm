import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useProject } from '../contexts/ProjectContext';
import { toast } from 'react-toastify';

const TokenManagement = () => {
  const { selectedChain, isUnlocked } = useWallet();
  const { currentProject, updateProject, getChainData } = useProject();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  
  // Token info state
  const [tokenInfo, setTokenInfo] = useState({
    address: '',
    symbol: '',
    decimals: '',
    poolAddresses: []
  });

  // New pool address input
  const [newPoolAddress, setNewPoolAddress] = useState('');

  // Load token info from project when chain or project changes
  useEffect(() => {
    if (currentProject && selectedChain) {
      const chainData = getChainData(selectedChain);
      if (chainData) {
        setTokenInfo({
          address: chainData.address || '',
          symbol: chainData.symbol || '',
          decimals: chainData.decimals || '',
          poolAddresses: chainData.poolAddresses || []
        });
      } else {
        // Reset if no data for this chain
        setTokenInfo({
          address: '',
          symbol: '',
          decimals: '',
          poolAddresses: []
        });
      }
    }
  }, [currentProject, selectedChain, getChainData]);

  // Save token info to project
  const saveTokenInfo = async () => {
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        tokens: {
          ...currentProject.tokens,
          [selectedChain]: {
            address: tokenInfo.address,
            symbol: tokenInfo.symbol,
            decimals: parseInt(tokenInfo.decimals) || 0,
            poolAddresses: tokenInfo.poolAddresses
          }
        }
      };

      await updateProject(currentProject._id, updates);
      toast.success(`Token info saved for ${selectedChain}`);
    } catch (error) {
      toast.error('Failed to save token info');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Add pool address
  const addPoolAddress = () => {
    if (!newPoolAddress.trim()) {
      toast.error('Please enter a pool address');
      return;
    }

    if (tokenInfo.poolAddresses.includes(newPoolAddress)) {
      toast.error('Pool address already exists');
      return;
    }

    setTokenInfo({
      ...tokenInfo,
      poolAddresses: [...tokenInfo.poolAddresses, newPoolAddress]
    });
    setNewPoolAddress('');
    toast.success('Pool address added');
  };

  // Remove pool address
  const removePoolAddress = (address) => {
    setTokenInfo({
      ...tokenInfo,
      poolAddresses: tokenInfo.poolAddresses.filter(p => p !== address)
    });
  };

  if (!currentProject) {
    return (
      <div className="container py-4">
        <div className="alert alert-info">
          <h5>No Project Selected</h5>
          <p>Please select or create a project to manage tokens.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h1 className="mb-4">Token Management</h1>
      
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <p className="mb-0">
              Managing tokens for <strong>{currentProject.name}</strong> on {selectedChain.toUpperCase()}
            </p>
            <button 
              className="btn btn-primary btn-sm"
              onClick={saveTokenInfo}
              disabled={loading || !isUnlocked}
            >
              <i className="bi bi-save me-2"></i>
              Save Changes
            </button>
          </div>
          
          {/* Wallet Status Alert */}
          {!isUnlocked && (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Please unlock your wallet to use token management features
            </div>
          )}

          {/* Simple Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Token Info
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'pools' ? 'active' : ''}`}
                onClick={() => setActiveTab('pools')}
              >
                Pool Addresses
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                Create Token
              </button>
            </li>
          </ul>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div>
              <h5>Token Information</h5>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="tokenAddress" className="form-label">Token Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="tokenAddress"
                      value={tokenInfo.address}
                      onChange={(e) => setTokenInfo({ ...tokenInfo, address: e.target.value })}
                      placeholder="0x... or token mint address"
                      disabled={!isUnlocked}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="mb-3">
                    <label htmlFor="tokenSymbol" className="form-label">Symbol</label>
                    <input
                      type="text"
                      className="form-control"
                      id="tokenSymbol"
                      value={tokenInfo.symbol}
                      onChange={(e) => setTokenInfo({ ...tokenInfo, symbol: e.target.value })}
                      placeholder="e.g. USDC"
                      disabled={!isUnlocked}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="mb-3">
                    <label htmlFor="tokenDecimals" className="form-label">Decimals</label>
                    <input
                      type="number"
                      className="form-control"
                      id="tokenDecimals"
                      value={tokenInfo.decimals}
                      onChange={(e) => setTokenInfo({ ...tokenInfo, decimals: e.target.value })}
                      placeholder="e.g. 18"
                      disabled={!isUnlocked}
                    />
                  </div>
                </div>
              </div>

              {tokenInfo.address && (
                <div className="mt-3">
                  <h6>Quick Actions</h6>
                  <div className="btn-group" role="group">
                    <button className="btn btn-sm btn-secondary" disabled>
                      <i className="bi bi-eye me-2"></i>
                      View on Explorer
                    </button>
                    <button className="btn btn-sm btn-secondary" disabled>
                      <i className="bi bi-arrow-down-circle me-2"></i>
                      Check Balance
                    </button>
                    <button className="btn btn-sm btn-secondary" disabled>
                      <i className="bi bi-people me-2"></i>
                      View Holders
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pools' && (
            <div>
              <h5>Pool Addresses</h5>
              <p className="text-muted">Manage liquidity pool addresses for this token</p>
              
              <div className="row mb-3">
                <div className="col-md-8">
                  <input
                    type="text"
                    className="form-control"
                    value={newPoolAddress}
                    onChange={(e) => setNewPoolAddress(e.target.value)}
                    placeholder="Enter pool address"
                    disabled={!isUnlocked}
                  />
                </div>
                <div className="col-md-4">
                  <button 
                    className="btn btn-primary w-100"
                    onClick={addPoolAddress}
                    disabled={!isUnlocked}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Pool
                  </button>
                </div>
              </div>

              {tokenInfo.poolAddresses.length === 0 ? (
                <div className="alert alert-info">
                  No pool addresses added yet
                </div>
              ) : (
                <div className="list-group">
                  {tokenInfo.poolAddresses.map((pool, index) => (
                    <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <code>{pool}</code>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removePoolAddress(pool)}
                        disabled={!isUnlocked}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div>
              <h5>Create Token</h5>
              <div className="alert alert-info">
                <p>Token creation feature coming soon!</p>
                <p>This will allow you to:</p>
                <ul>
                  <li>Deploy new SPL tokens on Solana</li>
                  <li>Create ERC-20 tokens on EVM chains</li>
                  <li>Set token metadata and supply</li>
                  <li>Automatically save token info to your project</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-light rounded">
            <p className="mb-0 text-muted">
              <i className="bi bi-info-circle me-2"></i>
              Token information is saved per blockchain within your project. Switch chains to manage different tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenManagement;