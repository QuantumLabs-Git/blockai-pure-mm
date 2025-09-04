import React from 'react';
import { useNavigate } from 'react-router-dom';

const CexMM = () => {
  const navigate = useNavigate();

  const exchanges = [
    {
      id: 'mexc',
      name: 'MEXC',
      status: 'active',
      description: 'Advanced market making on MEXC Global with full API integration',
      features: ['Spot Trading', 'Market Making', 'Order Book Management', 'Real-time Updates'],
      color: 'primary'
    },
    {
      id: 'binance',
      name: 'Binance',
      status: 'coming-soon',
      description: 'World\'s largest exchange by volume',
      features: ['Spot & Futures', 'Advanced APIs', 'High Liquidity', 'Global Markets'],
      color: 'warning'
    },
    {
      id: 'okx',
      name: 'OKX',
      status: 'coming-soon',
      description: 'Leading digital asset exchange',
      features: ['Unified Account', 'Copy Trading', 'Options Trading', 'DeFi Integration'],
      color: 'info'
    },
    {
      id: 'bybit',
      name: 'Bybit',
      status: 'coming-soon',
      description: 'Derivatives and spot trading platform',
      features: ['Perpetual Contracts', 'Inverse Futures', 'USDT Settled', 'Spot Trading'],
      color: 'danger'
    },
    {
      id: 'kucoin',
      name: 'KuCoin',
      status: 'coming-soon',
      description: 'The People\'s Exchange',
      features: ['Wide Token Selection', 'Margin Trading', 'Futures Trading', 'Staking'],
      color: 'success'
    },
    {
      id: 'gateio',
      name: 'Gate.io',
      status: 'coming-soon',
      description: 'Gateway to Crypto',
      features: ['1000+ Coins', 'Copy Trading', 'Perpetual Contracts', 'Options'],
      color: 'secondary'
    }
  ];

  const handleExchangeClick = (exchangeId, status) => {
    if (status === 'active') {
      navigate(`/${exchangeId}`);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>CEX Market Making</h1>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/trading')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to Trading
        </button>
      </div>

      <div className="alert alert-info mb-4">
        <h5 className="alert-heading">
          <i className="bi bi-info-circle me-2"></i>
          Centralized Exchange Trading
        </h5>
        <p className="mb-0">
          Configure and manage automated market making strategies across multiple centralized exchanges. 
          Each exchange integration provides specific features optimized for that platform.
        </p>
      </div>

      <div className="row">
        {exchanges.map((exchange) => (
          <div key={exchange.id} className="col-md-6 col-lg-4 mb-4">
            <div 
              className={`card h-100 ${exchange.status === 'active' ? 'shadow-sm exchange-card-active' : 'opacity-75'}`}
              style={{ cursor: exchange.status === 'active' ? 'pointer' : 'default' }}
              onClick={() => handleExchangeClick(exchange.id, exchange.status)}
            >
              <div className={`card-header bg-${exchange.color} text-white`}>
                <h5 className="mb-0 d-flex justify-content-between align-items-center">
                  {exchange.name}
                  {exchange.status === 'active' ? (
                    <span className="badge bg-success">Active</span>
                  ) : (
                    <span className="badge bg-secondary">Coming Soon</span>
                  )}
                </h5>
              </div>
              <div className="card-body">
                <p className="card-text">{exchange.description}</p>
                
                <h6 className="mt-3">Features:</h6>
                <ul className="list-unstyled">
                  {exchange.features.map((feature, index) => (
                    <li key={index}>
                      <i className={`bi bi-check2 text-${exchange.color} me-2`}></i>
                      {feature}
                    </li>
                  ))}
                </ul>

                {exchange.status === 'active' && (
                  <div className="mt-3">
                    <button className={`btn btn-${exchange.color} w-100`}>
                      <i className="bi bi-gear me-2"></i>
                      Configure {exchange.name}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <h3>Getting Started</h3>
        <div className="card">
          <div className="card-body">
            <div className="row">
              <div className="col-md-4 mb-3">
                <h5>
                  <i className="bi bi-1-circle text-primary me-2"></i>
                  Generate API Keys
                </h5>
                <p>Create API keys on your exchange with trading permissions</p>
              </div>
              <div className="col-md-4 mb-3">
                <h5>
                  <i className="bi bi-2-circle text-primary me-2"></i>
                  Configure Strategy
                </h5>
                <p>Set up your market making parameters and risk limits</p>
              </div>
              <div className="col-md-4 mb-3">
                <h5>
                  <i className="bi bi-3-circle text-primary me-2"></i>
                  Start Trading
                </h5>
                <p>Launch your bot and monitor performance in real-time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .exchange-card-active:hover {
          transform: translateY(-5px);
          transition: transform 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default CexMM;