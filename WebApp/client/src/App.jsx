import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import PrivateRoute from './components/PrivateRoute';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WalletManagement = lazy(() => import('./pages/WalletManagement'));
const WalletWarmup = lazy(() => import('./pages/WalletWarmup'));
const TokenManagement = lazy(() => import('./pages/TokenManagement'));
const Trading = lazy(() => import('./pages/Trading'));
const CexMM = lazy(() => import('./pages/CexMM'));
const DexMM = lazy(() => import('./pages/DexMM'));
const Mexc = lazy(() => import('./pages/Mexc'));
const Multisender = lazy(() => import('./pages/Multisender'));
const StandardMultisend = lazy(() => import('./pages/StandardMultisend'));
const PrivacyTransfers = lazy(() => import('./pages/PrivacyTransfers'));
const MexcDistribution = lazy(() => import('./pages/MexcDistribution'));
const ManyToMany = lazy(() => import('./pages/ManyToMany'));
const LiquidityManagement = lazy(() => import('./pages/LiquidityManagement'));
const Launch = lazy(() => import('./pages/Launch'));
const Bundles = lazy(() => import('./pages/launch/Bundles'));
const PumpfunBundleA = lazy(() => import('./pages/launch/bundles/PumpfunBundleA'));
const Settings = lazy(() => import('./pages/Settings'));
const Chart = lazy(() => import('./pages/Chart'));
const Projects = lazy(() => import('./pages/Projects'));

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
        
        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/wallet-management" element={<WalletManagement />} />
            <Route path="/wallet-warmup" element={<WalletWarmup />} />
            <Route path="/token-management" element={<TokenManagement />} />
            <Route path="/trading" element={<Trading />} />
            <Route path="/cex-mm" element={<CexMM />} />
            <Route path="/dex-mm" element={<DexMM />} />
            <Route path="/mexc" element={<Mexc />} />
            <Route path="/multisender" element={<Multisender />} />
            <Route path="/standard-multisend" element={<StandardMultisend />} />
            <Route path="/privacy-transfers" element={<PrivacyTransfers />} />
            <Route path="/mexc-distribution" element={<MexcDistribution />} />
            <Route path="/multisender/manytomany" element={<ManyToMany />} />
            <Route path="/liquidity-management" element={<LiquidityManagement />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/launch/bundles" element={<Bundles />} />
            <Route path="/launch/bundles/pumpfun/bundle-a" element={<PumpfunBundleA />} />
            <Route path="/chart" element={<Chart />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}

export default App;