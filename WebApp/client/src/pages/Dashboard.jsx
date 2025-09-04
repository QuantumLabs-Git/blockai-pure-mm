import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useProject } from '../contexts/ProjectContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isUnlocked, wallets, selectedChain } = useWallet();
  const { currentProject, projects } = useProject();

  const features = [
    {
      title: 'Token Management',
      description: 'Create, manage, and analyze your tokens.',
      link: '/token-management',
      icon: 'bi-coin',
      color: 'primary'
    },
    {
      title: 'Wallet Management',
      description: 'Secure and manage your crypto wallets.',
      link: '/wallet-management',
      icon: 'bi-wallet2',
      color: 'success'
    },
    {
      title: 'Trading',
      description: 'Execute trades and manage your positions.',
      link: '/trading',
      icon: 'bi-graph-up',
      color: 'warning'
    },
    {
      title: 'Multisender',
      description: 'Send tokens to multiple addresses in one transaction.',
      link: '/multisender',
      icon: 'bi-send',
      color: 'info'
    },
    {
      title: 'Liquidity Management',
      description: 'Add, remove, and manage liquidity pools.',
      link: '/liquidity-management',
      icon: 'bi-droplet',
      color: 'danger'
    },
    {
      title: 'Launch',
      description: 'Launch new tokens and manage token launches.',
      link: '/launch',
      icon: 'bi-rocket-takeoff',
      color: 'secondary'
    }
  ];

  return (
    <div className="container-fluid py-4">
      {/* Welcome Header */}
      <div className="jumbotron mb-4 p-4 text-white rounded shadow-lg glass">
        <div className="row align-items-center">
          <div className="col-md-3 text-center">
            <img 
              src="/static/img/blockai-logo-large.png" 
              alt="BlockAI Logo" 
              className="img-fluid mb-3" 
              style={{ maxWidth: '200px' }}
            />
          </div>
          <div className="col-md-9">
            <h1 className="display-4 fw-bold">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="lead">Advanced blockchain market making and management platform</p>
            <div className="d-flex mt-3">
              <div className="badge bg-secondary bg-opacity-25 text-white border border-secondary p-2 me-2">AI-Powered</div>
              <div className="badge bg-secondary bg-opacity-25 text-white border border-secondary p-2 me-2">Multi-Chain</div>
              <div className="badge bg-secondary bg-opacity-25 text-white border border-secondary p-2 me-2">Secure</div>
              <div className="badge bg-secondary bg-opacity-25 text-white border border-secondary p-2">Optimized</div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Status */}
      {!currentProject && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-info d-flex align-items-center">
              <i className="bi bi-info-circle fs-4 me-3"></i>
              <div className="flex-grow-1">
                <strong>No Project Selected</strong> - Choose or create a project to get started
              </div>
              <button 
                className="btn btn-sm btn-info"
                onClick={() => navigate('/projects')}
              >
                <i className="bi bi-folder2-open me-2"></i>
                {projects.length > 0 ? 'Choose Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Project Info */}
      {currentProject && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card bg-secondary bg-opacity-10">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h5 className="mb-1">
                      <i className="bi bi-folder2-open me-2"></i>
                      {currentProject.name}
                    </h5>
                    <p className="text-muted mb-0">
                      {currentProject.description || 'No description'}
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <button 
                      className="btn btn-sm btn-secondary me-2"
                      onClick={() => navigate('/projects')}
                    >
                      <i className="bi bi-arrow-left-right me-1"></i>
                      Switch Project
                    </button>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/projects/${currentProject._id}/settings`)}
                    >
                      <i className="bi bi-gear me-1"></i>
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Status */}
      <div className="row mb-4">
        <div className="col-12">
          <div className={`alert ${isUnlocked ? 'alert-success' : 'alert-warning'} d-flex align-items-center`}>
            <i className={`bi ${isUnlocked ? 'bi-unlock' : 'bi-lock'} fs-4 me-3`}></i>
            <div className="flex-grow-1">
              {isUnlocked ? (
                <>
                  <strong>Wallets Unlocked</strong> - {wallets.length} wallet(s) loaded for {selectedChain}
                </>
              ) : (
                <>
                  <strong>Wallets Locked</strong> - Upload your encrypted wallet file to get started
                </>
              )}
            </div>
            {!isUnlocked && (
              <Link to="/wallet-management" className="btn btn-sm btn-warning">
                Unlock Wallets
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="row">
        {features.map((feature, index) => (
          <div key={index} className="col-md-6 col-lg-4 mb-4">
            <div className="card h-100 shadow-sm hover-shadow feature-card">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle bg-secondary bg-opacity-10 p-3 me-3">
                    <i className={`bi ${feature.icon} fs-3 text-secondary`}></i>
                  </div>
                  <h5 className="card-title mb-0">{feature.title}</h5>
                </div>
                <p className="card-text text-muted">{feature.description}</p>
                <Link to={feature.link} className="btn btn-primary">
                  Go to {feature.title}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="row mt-4">
        <div className="col-12">
          <h4 className="mb-3">Quick Stats</h4>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card text-white">
            <div className="card-body">
              <h6 className="card-title">Active Chain</h6>
              <h3 className="mb-0">{selectedChain.toUpperCase()}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card text-white">
            <div className="card-body">
              <h6 className="card-title">Loaded Wallets</h6>
              <h3 className="mb-0">{wallets.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-warning text-dark">
            <div className="card-body">
              <h6 className="card-title">Active Sessions</h6>
              <h3 className="mb-0">0</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <h6 className="card-title">Total Volume</h6>
              <h3 className="mb-0">$0</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;