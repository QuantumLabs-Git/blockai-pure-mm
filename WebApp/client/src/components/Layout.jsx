import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useProject } from '../contexts/ProjectContext';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedChain, switchChain, isUnlocked, lockWallets } = useWallet();
  const { currentProject, projects, switchProject } = useProject();
  const [showProjectModal, setShowProjectModal] = useState(false);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/token-management', label: 'Token Management' },
    { path: '/wallet-management', label: 'Wallet Management' },
    { path: '/trading', label: 'Trading' },
    { path: '/multisender', label: 'Multisender' },
    { path: '/liquidity-management', label: 'Liquidity Management' },
    { path: '/launch', label: 'Launch' },
    { path: '/chart', label: 'Chart' },
  ];

  const chains = ['ethereum', 'solana', 'bsc', 'base', 'sui'];

  const handleChainChange = (e) => {
    const newChain = e.target.value;
    if (isUnlocked) {
      if (window.confirm('Changing chains will lock your wallets. Continue?')) {
        lockWallets();
        switchChain(newChain);
      }
    } else {
      switchChain(newChain);
    }
  };

  const handleLogout = () => {
    if (isUnlocked) {
      lockWallets();
    }
    logout();
  };

  return (
    <div className="min-vh-100 d-flex flex-column" data-chain={selectedChain}>
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            <img 
              src="/static/img/blockai-logo.png" 
              alt="BlockAI Logo" 
              height="30" 
              className="d-inline-block align-text-top me-2"
            />
            <span className="fw-bold text-muted">
              Pure MM
            </span>
          </Link>
          
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              {navItems.map((item) => (
                <li key={item.path} className="nav-item">
                  <Link 
                    className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                    to={item.path}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            
            <div className="d-flex align-items-center">
              {/* Project Selector */}
              <div className="me-3">
                <button 
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                  onClick={() => navigate('/projects')}
                >
                  <i className="bi bi-folder2-open me-2"></i>
                  {currentProject ? (
                    <span>{currentProject.name}</span>
                  ) : (
                    <span>Choose Project</span>
                  )}
                  <i className="bi bi-chevron-down ms-2"></i>
                </button>
              </div>

              {/* Chain Selector */}
              <select 
                className="form-select me-3" 
                value={selectedChain}
                onChange={handleChainChange}
                disabled={!currentProject}
              >
                {chains.map(chain => (
                  <option key={chain} value={chain}>
                    {chain.charAt(0).toUpperCase() + chain.slice(1)}
                  </option>
                ))}
              </select>
              
              <div className="dropdown">
                <button 
                  className="btn btn-dark dropdown-toggle" 
                  type="button" 
                  data-bs-toggle="dropdown"
                >
                  <i className="bi bi-person-circle me-2"></i>
                  {user?.name || 'User'}
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <Link className="dropdown-item" to="/settings">
                      <i className="bi bi-gear me-2"></i>Settings
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i>Logout
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto py-3 text-center text-white">
        <div className="container">
          <div className="row">
            <div className="col-md-4 text-md-start">
              <img 
                src="/static/img/blockai-logo.png" 
                alt="BlockAI Logo" 
                height="24" 
                className="d-inline-block me-2 mb-2"
              />
              <span className="fw-bold text-muted">
                Pure MM
              </span>
            </div>
            <div className="col-md-4">
              <p className="mb-0">&copy; 2025 BlockAI Pure MM. All rights reserved.</p>
            </div>
            <div className="col-md-4 text-md-end">
              <small className="text-muted">Powered by BlockAI Technology</small>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;