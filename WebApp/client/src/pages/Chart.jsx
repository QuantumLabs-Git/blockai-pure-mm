import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { useWallet } from '../contexts/WalletContext';
import { useProject } from '../contexts/ProjectContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const Chart = () => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candleSeriesRef = useRef();
  const [contractAddress, setContractAddress] = useState('');
  const [isChartLoaded, setIsChartLoaded] = useState(false);
  const [timeframe, setTimeframe] = useState('1D');
  const [chartType, setChartType] = useState('candlestick');
  const { selectedChain } = useWallet();
  const { currentProject, getChainData, addTrade, updateProject } = useProject();
  const [projectTrades, setProjectTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [walletBalances, setWalletBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [totalBalances, setTotalBalances] = useState({
    native: 0,
    wrapped: 0,
    token: 0
  });

  // Load project trades when contract address changes
  useEffect(() => {
    if (currentProject && selectedChain && contractAddress) {
      // Filter trades for current chain and token
      const chainTrades = currentProject.tradingHistory?.filter(trade => 
        trade.chain === selectedChain && 
        trade.tokenAddress?.toLowerCase() === contractAddress.toLowerCase()
      ) || [];
      
      setProjectTrades(chainTrades);
    }
  }, [currentProject, selectedChain, contractAddress]);

  // Load saved contract address from project and auto-load chart
  useEffect(() => {
    if (currentProject && selectedChain) {
      const chainData = getChainData(selectedChain);
      if (chainData?.address && chainData.address !== contractAddress) {
        setContractAddress(chainData.address);
        // Auto-load the chart if we have a saved address
        if (!isChartLoaded) {
          setIsChartLoaded(true);
          toast.info(`Loading saved chart for ${chainData.address.slice(0, 8)}...`);
        }
      }
    }
  }, [currentProject, selectedChain, getChainData]);

  // Fetch wallet balances
  const fetchWalletBalances = async () => {
    if (!currentProject || !currentProject.wallets || !selectedChain) {
      return;
    }

    const projectWallets = currentProject.wallets[selectedChain] || [];
    if (projectWallets.length === 0) {
      setWalletBalances([]);
      setTotalBalances({ native: 0, wrapped: 0, token: 0 });
      return;
    }

    setBalancesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/wallet/balances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chain: selectedChain,
          wallets: projectWallets,
          tokenAddress: contractAddress || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balances');
      }

      const data = await response.json();
      if (data.success) {
        setWalletBalances(data.balances);
        
        // Calculate totals
        const totals = data.balances.reduce((acc, wallet) => {
          acc.native += wallet.balances.native || 0;
          acc.wrapped += wallet.balances.wrapped || 0;
          acc.token += wallet.balances.token || 0;
          return acc;
        }, { native: 0, wrapped: 0, token: 0 });
        
        setTotalBalances(totals);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Failed to fetch wallet balances');
    } finally {
      setBalancesLoading(false);
    }
  };

  // Fetch balances when chart loads or contract address changes
  useEffect(() => {
    if (isChartLoaded && currentProject) {
      fetchWalletBalances();
    }
  }, [isChartLoaded, contractAddress, currentProject, selectedChain]);

  // Mock data for demonstration - replace with real API data
  const generateMockData = () => {
    const data = [];
    const basePrice = 100;
    const now = Date.now();
    const interval = 3600000; // 1 hour in milliseconds

    for (let i = 100; i >= 0; i--) {
      const time = Math.floor((now - i * interval) / 1000);
      const volatility = 0.02;
      const trend = Math.sin(i / 10) * 10;
      
      const open = basePrice + trend + (Math.random() - 0.5) * volatility * basePrice;
      const close = open + (Math.random() - 0.5) * volatility * basePrice;
      const high = Math.max(open, close) + Math.random() * volatility * basePrice;
      const low = Math.min(open, close) - Math.random() * volatility * basePrice;
      
      data.push({
        time,
        open,
        high,
        low,
        close,
        value: close, // for line chart
        volume: Math.random() * 1000000
      });
    }
    
    return data;
  };

  const loadChart = async () => {
    if (!contractAddress.trim()) {
      toast.error('Please enter a contract address');
      return;
    }

    setLoading(true);
    
    try {
      // Save the contract address to the project
      if (currentProject) {
        const updatedTokens = {
          ...currentProject.tokens,
          [selectedChain]: {
            address: contractAddress,
            symbol: '', // Could be fetched from blockchain
            decimals: 0, // Could be fetched from blockchain
            poolAddresses: []
          }
        };
        
        await updateProject(currentProject._id, { tokens: updatedTokens });
        toast.success('Contract address saved to project');
      }
      
      // Simulate loading chart data - replace with actual API call
      setTimeout(() => {
        setIsChartLoaded(true);
        setLoading(false);
        toast.success(`Chart loaded for ${contractAddress}`);
      }, 1000);
    } catch (error) {
      console.error('Error saving contract address:', error);
      toast.error('Failed to save contract address');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current || !isChartLoaded) return;

    // Chart configuration with dark theme
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a0a0a0',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
    });

    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00A055',
      downColor: '#B83333',
      borderVisible: false,
      wickUpColor: '#00A055',
      wickDownColor: '#B83333',
    });

    candleSeriesRef.current = candleSeries;

    // Set data
    const data = generateMockData();
    candleSeries.setData(data);

    // Add markers for buy/sell transactions from project
    const markers = projectTrades.map(trade => ({
      time: Math.floor(new Date(trade.timestamp).getTime() / 1000),
      position: trade.type === 'buy' ? 'belowBar' : 'aboveBar',
      color: trade.type === 'buy' ? '#00A055' : '#B83333',
      shape: trade.type === 'buy' ? 'arrowUp' : 'arrowDown',
      text: `${trade.type.toUpperCase()}: ${trade.amount} @ $${trade.price}`,
    }));

    if (markers.length > 0) {
      candleSeries.setMarkers(markers);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [isChartLoaded, timeframe, chartType, projectTrades]);

  const handleExportChart = () => {
    if (chartRef.current) {
      toast.info('Chart export feature coming soon!');
    }
  };

  const handleAddDrawing = () => {
    toast.info('Drawing tools coming soon! You can use TradingView widgets for advanced drawing.');
  };

  const getChainExplorerName = () => {
    switch (selectedChain) {
      case 'ethereum': return 'Etherscan';
      case 'bsc': return 'BscScan';
      case 'solana': return 'Solscan';
      case 'base': return 'BaseScan';
      case 'sui': return 'SuiScan';
      default: return 'Explorer';
    }
  };

  const getContractAddressPlaceholder = () => {
    switch (selectedChain) {
      case 'ethereum':
      case 'bsc':
      case 'base':
        return '0x... (ERC-20 token address)';
      case 'solana':
        return 'Token mint address (base58)';
      case 'sui':
        return '0x... (Sui object address)';
      default:
        return 'Enter contract address';
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h2 className="mb-0">
            <i className="bi bi-graph-up me-2"></i>
            Chart Analysis
          </h2>
          <p className="text-muted">Analyze token performance on {selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1)}</p>
        </div>
      </div>

      {/* Contract Address Input */}
      {!isChartLoaded && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title mb-4">Load Token Chart</h5>
                
                <div className="row align-items-end">
                  <div className="col-md-8">
                    <div className="form-group">
                      <label htmlFor="contractAddress" className="form-label">
                        Contract Address on {selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1)}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="contractAddress"
                        value={contractAddress}
                        onChange={(e) => setContractAddress(e.target.value)}
                        placeholder={getContractAddressPlaceholder()}
                        disabled={loading}
                      />
                      <small className="form-text text-muted">
                        Enter the token contract address to load price data from {getChainExplorerName()}
                      </small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <button 
                      className="btn btn-primary w-100"
                      onClick={loadChart}
                      disabled={loading || !contractAddress.trim()}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Loading...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-graph-up me-2"></i>
                          Load Chart
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {currentProject && (
                  <div className="mt-3">
                    <div className="alert alert-info mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Project:</strong> {currentProject.name}
                      {projectTrades.length > 0 && (
                        <span className="ms-2">
                          • <strong>{projectTrades.length}</strong> trades will be displayed on the chart
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Display */}
      {isChartLoaded && (
        <>
          {/* Controls */}
          <div className="row mb-3">
            <div className="col-md-4">
              <div className="form-group">
                <label className="form-label">Contract Address</label>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control" 
                    value={contractAddress} 
                    readOnly 
                  />
                  <button 
                    className="btn btn-secondary"
                    onClick={async () => {
                      setIsChartLoaded(false);
                      // Clear the saved address from project
                      if (currentProject) {
                        const updatedTokens = {
                          ...currentProject.tokens,
                          [selectedChain]: {
                            address: '',
                            symbol: '',
                            decimals: 0,
                            poolAddresses: []
                          }
                        };
                        await updateProject(currentProject._id, { tokens: updatedTokens });
                      }
                      setContractAddress('');
                    }}
                  >
                    <i className="bi bi-arrow-left"></i> Change
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="form-group">
                <label className="form-label">Timeframe</label>
                <div className="btn-group w-100" role="group">
                  {['1H', '4H', '1D', '1W'].map(tf => (
                    <button
                      key={tf}
                      type="button"
                      className={`btn btn-sm ${timeframe === tf ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setTimeframe(tf)}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="form-group">
                <label className="form-label">Chart Type</label>
                <select 
                  className="form-select" 
                  value={chartType} 
                  onChange={(e) => setChartType(e.target.value)}
                >
                  <option value="candlestick">Candlestick</option>
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                  <option value="bars">Bars</option>
                </select>
              </div>
            </div>

            <div className="col-md-4 d-flex align-items-end justify-content-end">
              <button className="btn btn-secondary me-2" onClick={handleAddDrawing}>
                <i className="bi bi-pencil me-2"></i>
                Drawing Tools
              </button>
              <button className="btn btn-secondary me-2" onClick={handleExportChart}>
                <i className="bi bi-download me-2"></i>
                Export
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Refresh
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body p-0">
                  <div ref={chartContainerRef} style={{ position: 'relative' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Trading Statistics */}
          <div className="row mt-4">
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Total Buys</h6>
                  <h3 className="mb-0 text-success">
                    {projectTrades
                      .filter(t => t.type === 'buy')
                      .reduce((sum, t) => sum + parseFloat(t.totalValue || 0), 0)
                      .toFixed(2)} {selectedChain === 'solana' ? 'SOL' : 'ETH'}
                  </h3>
                  <small className="text-muted">
                    {projectTrades.filter(t => t.type === 'buy').length} transactions
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Total Sells</h6>
                  <h3 className="mb-0 text-danger">
                    {projectTrades
                      .filter(t => t.type === 'sell')
                      .reduce((sum, t) => sum + parseFloat(t.totalValue || 0), 0)
                      .toFixed(2)} {selectedChain === 'solana' ? 'SOL' : 'ETH'}
                  </h3>
                  <small className="text-muted">
                    {projectTrades.filter(t => t.type === 'sell').length} transactions
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Net P&L</h6>
                  <h3 className="mb-0 text-muted">
                    {currentProject?.stats?.profitLoss?.[selectedChain] || 'N/A'}
                  </h3>
                  <small className="text-muted">All time</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="text-muted mb-2">Total Volume</h6>
                  <h3 className="mb-0">
                    {currentProject?.stats?.totalVolume?.[selectedChain] || '0'}
                  </h3>
                  <small className="text-muted">
                    {currentProject?.stats?.totalTrades || 0} trades
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="row mt-4">
            <div className="col-12">
              <h4>Recent Transactions for {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</h4>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Price</th>
                      <th>Amount</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectTrades.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          No trades recorded for this token in your project yet
                        </td>
                      </tr>
                    ) : (
                      projectTrades.slice(-10).reverse().map((trade, index) => (
                        <tr key={index}>
                          <td>{new Date(trade.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${trade.type === 'buy' ? 'bg-success' : 'bg-danger'}`}>
                              {trade.type.toUpperCase()}
                            </span>
                          </td>
                          <td>${trade.price}</td>
                          <td>{trade.amount}</td>
                          <td>${trade.totalValue}</td>
                          <td>
                            <span className={`badge ${trade.status === 'success' ? 'bg-success' : trade.status === 'pending' ? 'bg-warning' : 'bg-danger'}`}>
                              {trade.status || 'completed'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Balances Section */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>Balances</h4>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={fetchWalletBalances}
                  disabled={balancesLoading}
                >
                  <i className={`bi bi-arrow-clockwise ${balancesLoading ? 'spin' : ''} me-2`}></i>
                  Refresh
                </button>
              </div>

              {/* Balance Summary Cards */}
              <div className="row mb-3">
                <div className="col-md-4">
                  <div className="card chain-card">
                    <div className="card-body">
                      <h6 className="card-title">
                        <i className="bi bi-currency-exchange me-2"></i>
                        {selectedChain === 'solana' ? 'SOL' : selectedChain === 'bsc' ? 'BNB' : selectedChain === 'sui' ? 'SUI' : 'ETH'} Balance
                      </h6>
                      <h3 className="mb-0 chain-text">
                        {balancesLoading ? (
                          <span className="placeholder-glow">
                            <span className="placeholder col-6"></span>
                          </span>
                        ) : (
                          totalBalances.native.toFixed(4)
                        )}
                      </h3>
                      <small>Native Token</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">
                        <i className="bi bi-box me-2"></i>
                        Wrapped {selectedChain === 'solana' ? 'SOL' : selectedChain === 'bsc' ? 'BNB' : selectedChain === 'sui' ? 'SUI' : 'ETH'}
                      </h6>
                      <h3 className="mb-0">
                        {balancesLoading ? (
                          <span className="placeholder-glow">
                            <span className="placeholder col-6"></span>
                          </span>
                        ) : (
                          totalBalances.wrapped.toFixed(4)
                        )}
                      </h3>
                      <small>Wrapped Native Token</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">
                        <i className="bi bi-coin me-2"></i>
                        Token Balance
                      </h6>
                      <h3 className="mb-0">
                        {balancesLoading ? (
                          <span className="placeholder-glow">
                            <span className="placeholder col-6"></span>
                          </span>
                        ) : contractAddress ? (
                          totalBalances.token.toFixed(4)
                        ) : (
                          'N/A'
                        )}
                      </h3>
                      <small>{contractAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : 'No token selected'}</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Wallet Balances */}
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Individual Wallet Balances</h5>
                </div>
                <div className="card-body">
                  {balancesLoading ? (
                    <div className="text-center py-4">
                      <LoadingSpinner />
                      <p className="mt-2 text-muted">Fetching balances...</p>
                    </div>
                  ) : walletBalances.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="bi bi-wallet2 fs-1 mb-2 d-block"></i>
                      <p>No wallets found in this project for {selectedChain}</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Wallet Address</th>
                            <th className="text-end">
                              {selectedChain === 'solana' ? 'SOL' : selectedChain === 'bsc' ? 'BNB' : selectedChain === 'sui' ? 'SUI' : 'ETH'}
                            </th>
                            <th className="text-end">
                              Wrapped {selectedChain === 'solana' ? 'SOL' : selectedChain === 'bsc' ? 'BNB' : selectedChain === 'sui' ? 'SUI' : 'ETH'}
                            </th>
                            {contractAddress && <th className="text-end">Token Balance</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {walletBalances.map((wallet, index) => (
                            <tr key={index}>
                              <td>
                                <code className="text-break">
                                  {wallet.address}
                                </code>
                              </td>
                              <td className="text-end">
                                {wallet.error ? (
                                  <span className="text-danger">Error</span>
                                ) : (
                                  <span className={wallet.balances.native > 0 ? 'chain-text' : ''}>
                                    {wallet.balances.native?.toFixed(6) || '0.000000'}
                                  </span>
                                )}
                              </td>
                              <td className="text-end">
                                {wallet.error ? (
                                  <span className="text-danger">Error</span>
                                ) : (
                                  <span className={wallet.balances.wrapped > 0 ? 'text-info' : ''}>
                                    {wallet.balances.wrapped?.toFixed(6) || '0.000000'}
                                  </span>
                                )}
                              </td>
                              {contractAddress && (
                                <td className="text-end">
                                  {wallet.error ? (
                                    <span className="text-danger">Error</span>
                                  ) : (
                                    <span className={wallet.balances.token > 0 ? 'text-primary' : ''}>
                                      {wallet.balances.token?.toFixed(6) || '0.000000'}
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Chart;