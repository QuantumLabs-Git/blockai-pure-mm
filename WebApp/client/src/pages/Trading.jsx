import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Trading = () => {
  const navigate = useNavigate();
  const { currentProject, addTrade, loading: projectLoading } = useProject();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tradeForm, setTradeForm] = useState({
    chain: 'ethereum',
    type: 'buy',
    tokenAddress: '',
    tokenSymbol: '',
    amount: '',
    price: '',
    wallet: '',
    gas: '0.01',
    slippage: '0.5'
  });

  // Handle form submission
  const handleTrade = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Calculate total value
      const totalValue = parseFloat(tradeForm.amount) * parseFloat(tradeForm.price);
      
      // Create trade data
      const tradeData = {
        chain: tradeForm.chain,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock tx hash for demo
        type: tradeForm.type,
        tokenAddress: tradeForm.tokenAddress,
        tokenSymbol: tradeForm.tokenSymbol,
        amount: parseFloat(tradeForm.amount),
        price: parseFloat(tradeForm.price),
        totalValue: totalValue,
        gas: parseFloat(tradeForm.gas),
        timestamp: new Date().toISOString(),
        status: 'completed',
        wallet: tradeForm.wallet
      };

      // Save trade to project
      await addTrade(tradeData);
      
      setSuccess(`Trade executed successfully! ${tradeForm.type === 'buy' ? 'Bought' : 'Sold'} ${tradeForm.amount} ${tradeForm.tokenSymbol} at $${tradeForm.price}`);
      
      // Reset form
      setTradeForm({
        ...tradeForm,
        amount: '',
        price: '',
        tokenAddress: '',
        tokenSymbol: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to execute trade');
    } finally {
      setLoading(false);
    }
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTradeForm(prev => ({ ...prev, [name]: value }));
  };

  if (projectLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Trading</h1>
        {currentProject && (
          <div className="text-muted">
            <i className="bi bi-folder-fill me-2"></i>
            Project: <strong>{currentProject.name}</strong>
          </div>
        )}
      </div>
      
      {!currentProject ? (
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Please select a project to start trading.
          <button 
            className="btn btn-sm btn-warning ms-3"
            onClick={() => navigate('/projects')}
          >
            Go to Projects
          </button>
        </div>
      ) : null}
      
      {/* Quick Trade Form */}
      {currentProject && (
        <div className="row mb-4">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="bi bi-lightning-fill me-2"></i>
                  Quick Trade
                </h5>
              </div>
              <div className="card-body">
                {error && (
                  <div className="alert alert-danger alert-dismissible" role="alert">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                  </div>
                )}
                {success && (
                  <div className="alert alert-success alert-dismissible" role="alert">
                    {success}
                    <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                  </div>
                )}
                
                <form onSubmit={handleTrade}>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Chain</label>
                      <select 
                        className="form-select" 
                        name="chain" 
                        value={tradeForm.chain}
                        onChange={handleChange}
                        required
                      >
                        <option value="ethereum">Ethereum</option>
                        <option value="bsc">BSC</option>
                        <option value="polygon">Polygon</option>
                        <option value="arbitrum">Arbitrum</option>
                        <option value="solana">Solana</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Type</label>
                      <select 
                        className="form-select" 
                        name="type" 
                        value={tradeForm.type}
                        onChange={handleChange}
                        required
                      >
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Wallet Address</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="wallet" 
                        value={tradeForm.wallet}
                        onChange={handleChange}
                        placeholder="0x..."
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Token Address</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="tokenAddress" 
                        value={tradeForm.tokenAddress}
                        onChange={handleChange}
                        placeholder="0x..."
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Token Symbol</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="tokenSymbol" 
                        value={tradeForm.tokenSymbol}
                        onChange={handleChange}
                        placeholder="ETH, USDT, etc."
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Amount</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="amount" 
                        value={tradeForm.amount}
                        onChange={handleChange}
                        placeholder="0.00"
                        step="0.000001"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Price (USD)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="price" 
                        value={tradeForm.price}
                        onChange={handleChange}
                        placeholder="0.00"
                        step="0.000001"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Total Value (USD)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={tradeForm.amount && tradeForm.price ? `$${(parseFloat(tradeForm.amount) * parseFloat(tradeForm.price)).toFixed(2)}` : '$0.00'}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Gas Fee (USD)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="gas" 
                        value={tradeForm.gas}
                        onChange={handleChange}
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Slippage Tolerance (%)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="slippage" 
                        value={tradeForm.slippage}
                        onChange={handleChange}
                        step="0.1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="d-flex gap-2">
                    <button 
                      type="submit" 
                      className={`btn btn-${tradeForm.type === 'buy' ? 'success' : 'danger'}`}
                      disabled={loading || !currentProject}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className={`bi bi-${tradeForm.type === 'buy' ? 'plus' : 'dash'}-circle me-2`}></i>
                          Execute {tradeForm.type === 'buy' ? 'Buy' : 'Sell'} Order
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={() => setTradeForm({
                        ...tradeForm,
                        amount: '',
                        price: '',
                        tokenAddress: '',
                        tokenSymbol: ''
                      })}
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
            <div className="card mb-3">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Trading Information
                </h6>
              </div>
              <div className="card-body">
                <p className="small mb-2">
                  <strong>Quick Trade</strong> allows you to execute simple buy/sell orders manually. 
                  All trades are recorded in your project's trading history.
                </p>
                <hr />
                <p className="small mb-2">
                  <strong>Advanced Features:</strong>
                </p>
                <ul className="small mb-0">
                  <li>Automated market making strategies</li>
                  <li>CEX/DEX arbitrage</li>
                  <li>Liquidity provision</li>
                  <li>Risk management tools</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mb-4">
        <div className="col-12">
          <h3 className="mb-3">Advanced Trading Modules</h3>
        </div>
      </div>

      <div className="row">
        {/* CEX Trading Card */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="bi bi-bank me-2"></i>
                CEX Trading
              </h4>
            </div>
            <div className="card-body">
              <h5>Centralized Exchange Trading</h5>
              <p>Advanced market making and trading strategies for centralized exchanges.</p>
              
              <div className="mb-3">
                <h6>Features:</h6>
                <ul>
                  <li>Market Making with custom spreads</li>
                  <li>Arbitrage between exchanges</li>
                  <li>Risk Management tools</li>
                  <li>AI-powered optimization</li>
                  <li>Multi-exchange support</li>
                </ul>
              </div>

              <div className="mb-3">
                <h6>Supported Exchanges:</h6>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-success">MEXC</span>
                  <span className="badge bg-secondary">Binance (Soon)</span>
                  <span className="badge bg-secondary">OKX (Soon)</span>
                  <span className="badge bg-secondary">Bybit (Soon)</span>
                </div>
              </div>

              <button 
                className="btn btn-primary"
                onClick={() => navigate('/cex-mm')}
                disabled={!currentProject}
              >
                <i className="bi bi-arrow-right-circle me-2"></i>
                Go to CEX Trading
              </button>
            </div>
          </div>
        </div>

        {/* DEX Trading Card */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-success text-white">
              <h4 className="mb-0">
                <i className="bi bi-diagram-3 me-2"></i>
                DEX Trading
              </h4>
            </div>
            <div className="card-body">
              <h5>Decentralized Exchange Trading</h5>
              <p>Automated trading strategies for decentralized exchanges and AMMs.</p>
              
              <div className="mb-3">
                <h6>Features:</h6>
                <ul>
                  <li>Liquidity Provision</li>
                  <li>Impermanent Loss Protection</li>
                  <li>MEV Protection</li>
                  <li>Cross-chain Arbitrage</li>
                  <li>Gas Optimization</li>
                </ul>
              </div>

              <div className="mb-3">
                <h6>Supported DEXs:</h6>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-secondary">Uniswap (Soon)</span>
                  <span className="badge bg-secondary">PancakeSwap (Soon)</span>
                  <span className="badge bg-secondary">Raydium (Soon)</span>
                  <span className="badge bg-secondary">Curve (Soon)</span>
                </div>
              </div>

              <button 
                className="btn btn-success"
                onClick={() => navigate('/dex-mm')}
                disabled={!currentProject}
              >
                <i className="bi bi-arrow-right-circle me-2"></i>
                Go to DEX Trading
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Trading;