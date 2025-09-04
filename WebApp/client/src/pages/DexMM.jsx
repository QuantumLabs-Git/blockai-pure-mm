import React from 'react';
import { useNavigate } from 'react-router-dom';

const DexMM = () => {
  const navigate = useNavigate();

  const dexes = [
    {
      id: 'uniswap',
      name: 'Uniswap',
      chain: 'Ethereum',
      status: 'coming-soon',
      description: 'The leading decentralized exchange on Ethereum',
      features: ['V2 & V3 Support', 'Concentrated Liquidity', 'Auto-compounding', 'IL Protection'],
      color: 'primary'
    },
    {
      id: 'pancakeswap',
      name: 'PancakeSwap',
      chain: 'BSC',
      status: 'coming-soon',
      description: 'Top DEX on Binance Smart Chain',
      features: ['Low Fees', 'Yield Farming', 'Syrup Pools', 'NFT Integration'],
      color: 'warning'
    },
    {
      id: 'traderjoe',
      name: 'Trader Joe',
      chain: 'Avalanche',
      status: 'coming-soon',
      description: 'One-stop DeFi platform on Avalanche',
      features: ['Liquidity Books', 'Lending', 'Staking', 'Launchpad'],
      color: 'danger'
    },
    {
      id: 'curve',
      name: 'Curve',
      chain: 'Multi-chain',
      status: 'coming-soon',
      description: 'Optimized for stablecoin trading',
      features: ['Low Slippage', 'Stable Pools', 'Meta Pools', 'Gauge Voting'],
      color: 'info'
    },
    {
      id: 'balancer',
      name: 'Balancer',
      chain: 'Multi-chain',
      status: 'coming-soon',
      description: 'Programmable liquidity protocol',
      features: ['Weighted Pools', 'Stable Pools', 'Boosted Pools', 'Custom Curves'],
      color: 'secondary'
    },
    {
      id: 'raydium',
      name: 'Raydium',
      chain: 'Solana',
      status: 'coming-soon',
      description: 'On-chain order book AMM on Solana',
      features: ['Serum Integration', 'Concentrated Liquidity', 'Yield Farming', 'AcceleRaytor'],
      color: 'success'
    }
  ];

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>DEX Market Making</h1>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/trading')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to Trading
        </button>
      </div>

      <div className="alert alert-warning mb-4">
        <h5 className="alert-heading">
          <i className="bi bi-exclamation-triangle me-2"></i>
          DEX Trading Coming Soon
        </h5>
        <p className="mb-0">
          We're working on integrating decentralized exchange trading capabilities. 
          This will include automated liquidity provision, yield optimization, and cross-chain arbitrage.
        </p>
      </div>

      <div className="row">
        {dexes.map((dex) => (
          <div key={dex.id} className="col-md-6 col-lg-4 mb-4">
            <div className="card h-100 opacity-75">
              <div className={`card-header bg-${dex.color} text-white`}>
                <h5 className="mb-0 d-flex justify-content-between align-items-center">
                  {dex.name}
                  <span className="badge bg-secondary">Coming Soon</span>
                </h5>
                <small>{dex.chain}</small>
              </div>
              <div className="card-body">
                <p className="card-text">{dex.description}</p>
                
                <h6 className="mt-3">Planned Features:</h6>
                <ul className="list-unstyled">
                  {dex.features.map((feature, index) => (
                    <li key={index}>
                      <i className={`bi bi-check2 text-${dex.color} me-2`}></i>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <h3>DEX Trading Features (In Development)</h3>
        <div className="row">
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">
                  <i className="bi bi-shield-check text-success me-2"></i>
                  Smart Contract Security
                </h5>
                <p className="card-text">
                  All interactions will be through audited smart contracts with multi-sig security 
                  and emergency pause functionality.
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">
                  <i className="bi bi-lightning-charge text-warning me-2"></i>
                  Gas Optimization
                </h5>
                <p className="card-text">
                  Advanced gas optimization strategies including batching, timing optimization, 
                  and MEV protection.
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">
                  <i className="bi bi-graph-up text-primary me-2"></i>
                  Impermanent Loss Management
                </h5>
                <p className="card-text">
                  Real-time IL tracking and mitigation strategies including hedging and 
                  dynamic rebalancing.
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">
                  <i className="bi bi-arrow-left-right text-info me-2"></i>
                  Cross-Chain Arbitrage
                </h5>
                <p className="card-text">
                  Identify and execute profitable arbitrage opportunities across different 
                  chains and DEXs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DexMM;