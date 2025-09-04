import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';
import { useProject } from '../../contexts/ProjectContext';

const Bundles = () => {
  const navigate = useNavigate();
  const { selectedChain } = useWallet();
  const { currentProject } = useProject();

  const bundleOptions = [
    {
      id: 'pumpfun',
      platform: 'Pump.fun',
      description: 'Launch tokens on Pump.fun with automated multi-wallet buying',
      icon: 'bi-fire',
      chain: 'solana',
      bundles: [
        {
          id: 'bundle-a',
          name: 'Bundle A - Standard',
          description: 'Multi-wallet bundle with configurable parameters',
          features: [
            'Automated token creation on Pump.fun',
            'Multi-wallet distribution (up to 21 wallets)',
            'Jito bundle execution for MEV protection',
            'Vanity address generation support',
            'IPFS metadata upload',
            'Automated cleanup tools'
          ],
          path: '/launch/bundles/pumpfun/bundle-a'
        }
      ]
    },
    {
      id: 'raydium',
      platform: 'Raydium',
      description: 'Launch tokens on Raydium with liquidity pool creation',
      icon: 'bi-water',
      chain: 'solana',
      bundles: []
    }
  ];

  // Filter bundles for current chain
  const availableBundles = bundleOptions.filter(
    option => option.chain === selectedChain
  );

  if (selectedChain !== 'solana') {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Token Bundles</h1>
          <button 
            className="btn btn-outline-secondary"
            onClick={() => navigate('/launch')}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Launch
          </button>
        </div>
        
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Token bundles are currently only available on Solana. 
          Please switch to Solana network to access bundling features.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Token Bundles</h1>
          {currentProject && (
            <p className="text-muted mb-0">
              Project: <strong>{currentProject.name}</strong>
            </p>
          )}
        </div>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/launch')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to Launch
        </button>
      </div>

      {!currentProject ? (
        <div className="alert alert-warning mb-4">
          <h5 className="alert-heading">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No Project Selected
          </h5>
          <p className="mb-0">
            Please select or create a project before launching token bundles. 
            <button 
              className="btn btn-sm btn-warning ms-2"
              onClick={() => navigate('/projects')}
            >
              Go to Projects
            </button>
          </p>
        </div>
      ) : (
        <p className="lead">
          Launch tokens with automated multi-wallet buying strategies for optimal distribution and market making.
        </p>
      )}

      <div className="alert alert-info mb-4">
        <h6 className="alert-heading">
          <i className="bi bi-info-circle me-2"></i>
          What are Token Bundles?
        </h6>
        <p className="mb-0">
          Token bundles allow you to launch tokens with simultaneous buys from multiple wallets, 
          creating natural-looking trading activity and ensuring initial liquidity. 
          This helps prevent snipers and provides a fair distribution.
        </p>
      </div>

      {availableBundles.map((platform) => (
        <div key={platform.id} className="mb-5">
          <div className="d-flex align-items-center mb-3">
            <i className={`${platform.icon} fs-2 text-primary me-3`}></i>
            <div>
              <h3 className="mb-0">{platform.platform}</h3>
              <p className="text-muted mb-0">{platform.description}</p>
            </div>
          </div>

          {platform.bundles.length > 0 ? (
            <div className="row">
              {platform.bundles.map((bundle) => (
                <div key={bundle.id} className="col-md-6 mb-4">
                  <div className="card h-100 border-primary">
                    <div className="card-header bg-primary text-white">
                      <h5 className="mb-0">{bundle.name}</h5>
                    </div>
                    <div className="card-body">
                      <p className="card-text">{bundle.description}</p>
                      
                      <h6 className="mt-3">Features:</h6>
                      <ul className="small">
                        {bundle.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>

                      <div className="d-grid mt-auto">
                        <button 
                          className="btn btn-primary"
                          onClick={() => navigate(bundle.path)}
                          disabled={!currentProject}
                        >
                          <i className="bi bi-rocket-takeoff me-2"></i>
                          {currentProject ? 'Configure Bundle' : 'Select Project First'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-secondary">
              <i className="bi bi-clock-history me-2"></i>
              {platform.platform} bundles coming soon...
            </div>
          )}
        </div>
      ))}

    </div>
  );
};

export default Bundles;