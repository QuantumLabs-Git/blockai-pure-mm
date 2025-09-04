import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useProject } from '../contexts/ProjectContext';

const Launch = () => {
  const navigate = useNavigate();
  const { selectedChain } = useWallet();
  const { currentProject, loading: projectLoading } = useProject();

  const launchOptions = [
    {
      id: 'bundles',
      title: 'Token Bundles',
      description: 'Launch tokens with automated multi-wallet buying strategies',
      icon: 'bi-box-seam',
      chains: ['solana'],
      status: 'active',
      path: '/launch/bundles'
    }
  ];

  const filteredOptions = launchOptions.filter(
    option => option.chains.includes(selectedChain)
  );

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Token Launch</h1>
          {currentProject && (
            <p className="text-muted mb-0">
              Project: <strong>{currentProject.name}</strong>
            </p>
          )}
        </div>
        <span className="badge chain-badge">
          {selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1)}
        </span>
      </div>
      
      {!currentProject ? (
        <div className="alert alert-warning mb-4">
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
      ) : (
        <div className="alert alert-info mb-4">
          <h5 className="alert-heading">
            <i className="bi bi-rocket-takeoff me-2"></i>
            Launch Tokens with Advanced Features
          </h5>
          <p className="mb-0">
            Create and launch tokens with professional-grade tools including bundled launches, 
            fair distribution mechanisms, and liquidity management.
          </p>
        </div>
      )}

      <div className="row">
        {filteredOptions.map((option) => (
          <div key={option.id} className="col-md-6 mb-4">
            <div 
              className={`card h-100 ${option.status === 'active' && currentProject ? 'chain-border' : ''}`}
              style={{ cursor: option.status === 'active' && currentProject ? 'pointer' : 'default' }}
              onClick={() => option.status === 'active' && currentProject && navigate(option.path)}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex align-items-center">
                    <i className={`${option.icon} fs-3 chain-text me-3`}></i>
                    <h4 className="mb-0">{option.title}</h4>
                  </div>
                  {option.status === 'coming-soon' && (
                    <span className="badge bg-secondary">Coming Soon</span>
                  )}
                  {option.status === 'active' && (
                    <span className="badge bg-success">Available</span>
                  )}
                </div>
                
                <p className="card-text">{option.description}</p>
                
                <div className="mt-3">
                  <small className="text-muted">
                    <i className="bi bi-globe me-1"></i>
                    Supported on: {option.chains.map(chain => 
                      chain.charAt(0).toUpperCase() + chain.slice(1)
                    ).join(', ')}
                  </small>
                </div>

                {option.status === 'active' && (
                  <div className="d-grid mt-3">
                    <button 
                      className="btn chain-button"
                      disabled={!currentProject}
                    >
                      <i className="bi bi-arrow-right-circle me-2"></i>
                      {currentProject ? 'Get Started' : 'Select a Project First'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOptions.length === 0 && (
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          No launch options available for {selectedChain.toUpperCase()} yet. Please check back later.
        </div>
      )}
    </div>
  );
};

export default Launch;