import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';

const Multisender = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Multisender</h1>
        {currentProject && (
          <div className="text-muted">
            <i className="bi bi-folder2-open me-2"></i>
            Project: <strong>{currentProject.name}</strong>
          </div>
        )}
      </div>
      
      {!currentProject ? (
        <div className="alert alert-warning mb-4">
          <h5 className="alert-heading">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No Project Selected
          </h5>
          <p className="mb-0">
            Please select or create a project before using the multisender. 
            <a href="/dashboard" className="alert-link">Go to Dashboard</a>
          </p>
        </div>
      ) : (
        <div className="alert alert-info mb-4">
          <h5 className="alert-heading">
            <i className="bi bi-info-circle me-2"></i>
            Efficient Token Distribution
          </h5>
          <p className="mb-0">
            Send tokens to multiple addresses in a single transaction with optimized gas usage. 
            Choose between standard multisend for transparency or privacy transfers for enhanced anonymity.
          </p>
        </div>
      )}

      <div className="row">
        {/* Standard Multisend Card */}
        <div className="col-md-3 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="bi bi-send me-2"></i>
                One to Many
              </h4>
            </div>
            <div className="card-body">
              <h5>Batch Token Transfers</h5>
              <p>Send tokens to multiple addresses in one efficient transaction.</p>
              
              <div className="mb-3">
                <h6>Features:</h6>
                <ul>
                  <li>Gas-optimized batch transfers</li>
                  <li>CSV upload support</li>
                  <li>Real-time gas estimation</li>
                  <li>Transaction status tracking</li>
                  <li>Multi-token support</li>
                </ul>
              </div>

              <div className="mb-3">
                <h6>Supported Networks:</h6>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-primary">Ethereum</span>
                  <span className="badge bg-warning text-dark">BSC</span>
                  <span className="badge bg-info">Base</span>
                  <span className="badge bg-success">Solana</span>
                </div>
              </div>

              <button 
                className="btn btn-primary"
                onClick={() => navigate('/standard-multisend')}
                disabled={!currentProject}
              >
                <i className="bi bi-arrow-right-circle me-2"></i>
                Use One to Many
              </button>
            </div>
          </div>
        </div>

        {/* Many to Many Card - Solana Only */}
        <div className="col-md-3 mb-4">
          <div className="card h-100">
            <div className="card-header bg-info text-white">
              <h4 className="mb-0">
                <i className="bi bi-arrow-left-right me-2"></i>
                Many to Many
              </h4>
            </div>
            <div className="card-body">
              <h5>Multi-to-Multi Transfers</h5>
              <p>Transfer from many wallets to many recipients independently.</p>
              
              <div className="mb-3">
                <h6>Features:</h6>
                <ul>
                  <li>Independent transfers</li>
                  <li>CSV batch upload</li>
                  <li>Unconnected addresses</li>
                  <li>Anti-bubble detection</li>
                  <li>Balance checking</li>
                </ul>
              </div>

              <div className="mb-3">
                <h6>Supported Networks:</h6>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-primary">Ethereum</span>
                  <span className="badge bg-warning text-dark">BSC</span>
                  <span className="badge bg-info">Base</span>
                  <span className="badge bg-success">Solana</span>
                </div>
              </div>

              <button 
                className="btn btn-info"
                onClick={() => navigate('/multisender/manytomany')}
                disabled={!currentProject}
              >
                <i className="bi bi-arrow-right-circle me-2"></i>
                Use Many to Many
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Transfers Card */}
        <div className="col-md-3 mb-4">
          <div className="card h-100">
            <div className="card-header bg-dark text-white">
              <h4 className="mb-0">
                <i className="bi bi-shield-lock me-2"></i>
                Privacy Transfers
              </h4>
            </div>
            <div className="card-body">
              <h5>Anonymous Token Distribution</h5>
              <p>Send tokens with enhanced privacy through HoudiniSwap integration.</p>
              
              <div className="mb-3">
                <h6>Features:</h6>
                <ul>
                  <li>Cross-chain privacy transfers</li>
                  <li>Anonymous mode option</li>
                  <li>HoudiniSwap integration</li>
                  <li>Transaction obfuscation</li>
                  <li>Status tracking</li>
                </ul>
              </div>

              <div className="mb-3">
                <h6>Privacy Features:</h6>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-success">
                    <i className="bi bi-check2 me-1"></i>
                    No Direct Links
                  </span>
                  <span className="badge bg-success">
                    <i className="bi bi-check2 me-1"></i>
                    Mixed Transfers
                  </span>
                  <span className="badge bg-success">
                    <i className="bi bi-check2 me-1"></i>
                    Cross-Chain
                  </span>
                </div>
              </div>

              <button 
                className="btn btn-dark"
                onClick={() => navigate('/privacy-transfers')}
                disabled={!currentProject}
              >
                <i className="bi bi-arrow-right-circle me-2"></i>
                Use Privacy Transfers
              </button>
            </div>
          </div>
        </div>

        {/* MEXC Distribution Card */}
        <div className="col-md-3 mb-4">
          <div className="card h-100">
            <div className="card-header bg-success text-white">
              <h4 className="mb-0">
                <i className="bi bi-bank me-2"></i>
                MEXC Distribution
              </h4>
            </div>
            <div className="card-body">
              <h5>CEX to Wallet Distribution</h5>
              <p>Withdraw and distribute tokens directly from MEXC exchange to multiple wallets.</p>
              
              <div className="mb-3">
                <h6>Features:</h6>
                <ul>
                  <li>Direct MEXC withdrawals</li>
                  <li>Batch distribution support</li>
                  <li>CSV upload capability</li>
                  <li>Multiple network support</li>
                  <li>Real-time balance check</li>
                </ul>
              </div>

              <div className="mb-3">
                <h6>Supported Tokens:</h6>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-primary">SOL</span>
                  <span className="badge bg-info">ETH</span>
                  <span className="badge bg-warning text-dark">BNB</span>
                  <span className="badge bg-purple text-white">MATIC</span>
                  <span className="badge bg-danger">AVAX</span>
                </div>
              </div>

              <button 
                className="btn btn-success"
                onClick={() => navigate('/mexc-distribution')}
                disabled={!currentProject}
              >
                <i className="bi bi-arrow-right-circle me-2"></i>
                Use MEXC Distribution
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Multisender;