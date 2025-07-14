import React, { useState, useEffect } from 'react';
import { MeshService } from './services/meshService';
import { MeshConnection, MeshPortfolio, MeshTransfer, CryptoBalanceData, USDCBalanceData, BaseBalanceData } from './types';
import './App.css';

// App with separate buttons for Binance and Phantom Wallet

function App() {
  const [connection, setConnection] = useState<MeshConnection | null>(null);
  const [portfolio, setPortfolio] = useState<MeshPortfolio | null>(null);
  const [cryptoBalances, setCryptoBalances] = useState<CryptoBalanceData | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<USDCBalanceData | null>(null);
  const [baseBalances, setBaseBalances] = useState<BaseBalanceData | null>(null);
  const [transfers, setTransfers] = useState<MeshTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appWalletAddress, setAppWalletAddress] = useState<string>('');
  const [savedConnections, setSavedConnections] = useState<{ [key: string]: any }>({});
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<MeshTransfer | null>(null);
  const [transferAmount, setTransferAmount] = useState<number>(1); // Default to 1 USDC

  // Check for existing saved connections on app load
  useEffect(() => {
    const checkSavedConnections = () => {
      const saved = MeshService.getSavedConnections();
      setSavedConnections(saved);
      
      // If we have saved connections, check if any are still valid
      const binanceCheck = MeshService.hasValidTokensForProvider('binance');
      const phantomCheck = MeshService.hasValidTokensForProvider('phantom');
      
      console.log('🔍 Checking saved connections on app load:');
      console.log('  - Binance tokens valid:', binanceCheck.hasTokens);
      console.log('  - Phantom tokens valid:', phantomCheck.hasTokens);
      
      // Auto-restore the most recent valid connection if available
      if (binanceCheck.hasTokens && !connection) {
        console.log('🔄 Auto-restoring Binance connection...');
        const restoredConnection: MeshConnection = {
          id: binanceCheck.connectionId!,
          provider: 'binance',
          type: 'cex',
          connected: true,
          accounts: []
        };
        setConnection(restoredConnection);
        
        // First restore the connection in the server, then load data
        setTimeout(async () => {
          try {
            await MeshService.restoreConnection(binanceCheck.connectionId!, binanceCheck.connection);
            loadCryptoBalances(restoredConnection);
            loadUSDCBalanceByProvider(restoredConnection);
            loadBaseBalances();
          } catch (error) {
            console.error('❌ Failed to restore Binance connection:', error);
            // Clear invalid connection
            MeshService.clearSavedConnection(binanceCheck.connectionId!);
            setConnection(null);
          }
        }, 1000);
      } else if (phantomCheck.hasTokens && !connection) {
        console.log('🔄 Auto-restoring Phantom connection...');
        const restoredConnection: MeshConnection = {
          id: phantomCheck.connectionId!,
          provider: 'phantom',
          type: 'self_custody',
          connected: true,
          accounts: []
        };
        setConnection(restoredConnection);
        
        // First restore the connection in the server, then load data
        setTimeout(async () => {
          try {
            await MeshService.restoreConnection(phantomCheck.connectionId!, phantomCheck.connection);
            loadCryptoBalances(restoredConnection);
            loadUSDCBalanceByProvider(restoredConnection);
            loadBaseBalances();
          } catch (error) {
            console.error('❌ Failed to restore Phantom connection:', error);
            // Clear invalid connection
            MeshService.clearSavedConnection(phantomCheck.connectionId!);
            setConnection(null);
          }
        }, 1000);
      }
    };
    
    checkSavedConnections();
  }, []);

  // Load crypto balances for connected account (Binance or Phantom)
  const loadCryptoBalances = async (connectionToUse?: MeshConnection) => {
    const currentConnection = connectionToUse || connection;
    if (!currentConnection) return;
    
    try {
      console.log('🪙 Loading crypto balances for', currentConnection.provider, '...');
      
      // Use specific endpoints for each provider
      let balanceData;
      if (currentConnection.provider === 'binance') {
        balanceData = await MeshService.getBinanceCryptoBalances();
      } else if (currentConnection.provider === 'phantom') {
        // Use the new specific Phantom endpoint
        balanceData = await MeshService.getPhantomCryptoBalances();
      } else {
        console.log('⚠️ Unknown provider for crypto balances:', currentConnection.provider);
        // Fallback to generic method for other providers
        balanceData = await MeshService.getCryptoBalances(currentConnection.id);
      }
      
      setCryptoBalances(balanceData);
      console.log('✅ Crypto balances loaded successfully for', currentConnection.provider);
    } catch (err: any) {
      console.error('❌ Failed to load crypto balances:', err);
      // Don't set error, just log it since this might be normal for some connections
    }
  };



  // Load USDC balance specifically
  const loadUSDCBalance = async (connectionId: string) => {
    try {
      console.log('💰 Loading USDC balance...');
      const usdcData = await MeshService.getUSDCBalance(connectionId);
      setUsdcBalance(usdcData);
      console.log('✅ USDC balance loaded successfully');
    } catch (err: any) {
      console.error('❌ Failed to load USDC balance:', err);
      // Don't set error, just log it
    }
  };

  // Load USDC balance using provider-specific endpoints
  const loadUSDCBalanceByProvider = async (connectionToUse?: MeshConnection) => {
    const currentConnection = connectionToUse || connection;
    if (!currentConnection) return;
    
    try {
      console.log('💰 Loading USDC balance for', currentConnection.provider, '...');
      
      // Use specific endpoints for each provider
      let usdcData;
      if (currentConnection.provider === 'binance') {
        usdcData = await MeshService.getBinanceUSDCBalance();
      } else if (currentConnection.provider === 'phantom') {
        usdcData = await MeshService.getPhantomUSDCBalance();
      } else {
        console.log('⚠️ Unknown provider for USDC balance:', currentConnection.provider);
        // Fallback to generic method
        usdcData = await MeshService.getUSDCBalance(currentConnection.id);
      }
      
      setUsdcBalance(usdcData);
      console.log('✅ USDC balance loaded successfully for', currentConnection.provider);
    } catch (err: any) {
      console.error('❌ Failed to load USDC balance:', err);
      // Don't set error, just log it
    }
  };

  // Load Base network balances (USDT and ETH)
  const loadBaseBalances = async () => {
    try {
      console.log('🔵 Loading Base network balances...');
      const baseData = await MeshService.getBaseNetworkBalances();
      setBaseBalances(baseData);
      console.log('✅ Base network balances loaded successfully');
    } catch (err: any) {
      console.error('❌ Failed to load Base network balances:', err);
      // Don't set error, just log it
    }
  };

  // Load app wallet address on mount
  useEffect(() => {
    const loadWalletAddress = async () => {
      try {
        const address = await MeshService.getAppWalletAddress();
        setAppWalletAddress(address);
        console.log('✅ App wallet address loaded:', address);
      } catch (err: any) {
        console.error('❌ Failed to load app wallet address:', err);
        setError('Failed to load app wallet address');
      }
    };

    loadWalletAddress();
  }, []);

  // Reload all balances manually
  const reloadAllBalances = async () => {
    try {
      setLoading(true);
      console.log('🔄 Reloading all balances...');
      
      // Reload connection-specific balances
      if (connection) {
        await loadCryptoBalances(connection);
        await loadUSDCBalanceByProvider(connection);
      }
      
      // Reload Base network balances
      await loadBaseBalances();
      
      // Reload app wallet balances
      // const updatedAppBalances = await MeshService.getAppWalletBalances(); // This line is removed
      // setAppWalletBalances(updatedAppBalances); // This line is removed
      
      console.log('✅ All balances reloaded successfully');
    } catch (err: any) {
      console.error('❌ Failed to reload all balances:', err);
      setError('Failed to reload balances');
    } finally {
      setLoading(false);
    }
  };

  // Handle Binance connection
  const handleConnectBinance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Opening Binance connection...');
      const result = await MeshService.openBinanceConnection();
      
      if (result.success && result.connectionId) {
        // Real connection successful
        const newConnection: MeshConnection = {
          id: result.connectionId,
          provider: 'binance',
          type: 'cex',
          connected: true,
          accounts: []
        };
        
        setConnection(newConnection);
        
        // Load portfolio and crypto balances after connection
        setTimeout(() => {
          loadPortfolio(newConnection.id);
          loadCryptoBalances(newConnection);
          loadUSDCBalanceByProvider(newConnection);
          loadBaseBalances();
        }, 2000);
        
        console.log('Binance connected successfully with ID:', result.connectionId);
      } else {
        // Connection failed
        setError(result.error || 'Failed to connect to Binance');
      }
      
    } catch (err) {
      console.error('Error connecting to Binance:', err);
      setError('Failed to connect to Binance');
    } finally {
      setLoading(false);
    }
  };

  // Handle Phantom Wallet connection
  const handleConnectPhantom = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Opening Phantom Wallet connection...');
      const result = await MeshService.openPhantomConnection();
      
      if (result.success && result.connectionId) {
        // Real connection successful
        const newConnection: MeshConnection = {
          id: result.connectionId,
          provider: 'phantom',
          type: 'self_custody',
          connected: true,
          accounts: []
        };
        
        setConnection(newConnection);
        
        // Load portfolio and crypto balances after connection
        setTimeout(() => {
          loadPortfolio(newConnection.id);
          loadCryptoBalances(newConnection);
          loadUSDCBalanceByProvider(newConnection);
          loadBaseBalances();
        }, 2000);
        
        console.log('Phantom Wallet connected successfully with ID:', result.connectionId);
      } else {
        // Connection failed
        setError(result.error || 'Failed to connect to Phantom Wallet');
      }
      
    } catch (err) {
      console.error('Error connecting to Phantom Wallet:', err);
      setError('Failed to connect to Phantom Wallet');
    } finally {
      setLoading(false);
    }
  };

  // Load portfolio for a connection
  const loadPortfolio = async (connectionId: string) => {
    try {
      console.log(`🔄 Loading portfolio for connection:`, connectionId);
      const portfolioData = await MeshService.getPortfolio(connectionId);
      setPortfolio(portfolioData);
      console.log(`✅ Portfolio loaded successfully`);
      
      // Clear any existing errors if portfolio loads successfully
      setError(null);
      
    } catch (err: any) {
      console.error(`❌ Failed to load portfolio:`, err);
      
      // Check if this is a real connection error vs missing connection
      if (err.message?.includes('Failed to get portfolio information')) {
        // This means we have a connection but the API call failed
        // Show demo data with a clear message
        const provider = connection?.provider || 'wallet';
        setError(`Unable to load real ${provider} data. Showing demo portfolio below.`);
        
        const demoPortfolio = {
          accounts: [
            {
              id: `demo_${provider}_btc`,
              name: 'Bitcoin',
              type: 'crypto' as const,
              balance: 0.025,
              currency: 'BTC',
              network: 'bitcoin',
              provider: provider,
            },
            {
              id: `demo_${provider}_eth`,
              name: 'Ethereum',
              type: 'crypto' as const,
              balance: 0.8,
              currency: 'ETH',
              network: 'ethereum',
              provider: provider,
            },
            {
              id: `demo_${provider}_usdc`,
              name: 'USD Coin',
              type: 'crypto' as const,
              balance: 500,
              currency: 'USDC',
              network: 'ethereum',
              provider: provider,
            },
          ],
          totalValue: 2750.25,
          lastUpdated: new Date().toISOString(),
        };
        
        setPortfolio(demoPortfolio);
      } else {
        // Some other error occurred
        setError(`Failed to connect. Please try again.`);
      }
    }
  };

  // Handle transfer of custom USDC amount to app wallet using Mesh SDK (handles MFA automatically)
  const handleTransfer = async () => {
    if (!connection || !appWalletAddress) {
      setError('Connection or app wallet address not available');
      return;
    }

    if (transferAmount <= 0) {
      setError('Transfer amount must be greater than 0');
      return;
    }

    setTransferLoading(true);
    setError(null);
    setTransferSuccess(null);

    try {
      console.log(`🚀 Executing transfer with Mesh SDK: $${transferAmount} USDC to app wallet`);
      console.log('  - From:', connection.id);
      console.log('  - To:', appWalletAddress);
      console.log(`  - Amount: ${transferAmount} USDC`);
      console.log('  - Network: Base');

      const result = await MeshService.executeTransferWithSDK(
        connection.id,
        appWalletAddress,
        transferAmount,
        'USDC',
        'base'
      );

      console.log('✅ Transfer SDK result:', result);
      
      if (result.success) {
        console.log('🎉 Transfer completed successfully via SDK!');
        
        // Create a success object for display
        const successTransfer = {
          id: 'sdk_transfer_' + Date.now(),
          amount: transferAmount,
          currency: 'USDC',
          network: 'base',
          status: 'completed' as const,
          fromAccount: connection.provider,
          toAccount: 'App Wallet',
          timestamp: new Date().toISOString(),
          note: 'Transfer completed via Mesh SDK'
        };
        
        setTransferSuccess(successTransfer);
        
        // Reload balances after successful transfer
        loadCryptoBalances(connection);
        loadUSDCBalanceByProvider(connection);
        
        // Reload app wallet balances to show received transfers
        try {
          const updatedAppBalances = await MeshService.getAppWalletBalances();
          // setAppWalletBalances(updatedAppBalances); // This line is removed
          console.log('✅ App wallet balances reloaded after transfer');
        } catch (err) {
          console.error('❌ Failed to reload app wallet balances:', err);
        }
      } else {
        console.error('❌ Transfer failed:', result.error);
        setError(`Transfer failed: ${result.error}`);
      }

    } catch (err: any) {
      console.error('❌ Transfer SDK error:', err);
      setError(`Transfer failed: ${err.message}`);
    } finally {
      setTransferLoading(false);
    }
  };



  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🔗 Mesh Wallet Integration</h1>
                          <p>Connect your Binance account or Phantom Wallet to manage your portfolio</p>
        </header>

        {error && (
          <div className="error-message">
            <div>
              <strong>⚠️ {error}</strong>
            </div>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Full Width App Wallet */}
        <div className="app-wallet-full-width">
          <div className="app-wallet">
            <h3>App Wallet Address</h3>
            <div className="wallet-address">
              {appWalletAddress || 'Loading...'}
            </div>
          </div>
        </div>

        {/* Two Column Layout for Connections and Balances */}
        <div className="dashboard-layout">
          
          {/* Left Column - Connected Accounts */}
          <div className="left-column">
            <div className="connections-section">
              <h2>Connect Your Account</h2>
              <div className="connection-center">
                {!connection ? (
                  <div>
                    {/* Show saved connections if any exist */}
                    {Object.keys(savedConnections).length > 0 && (
                      <div className="saved-connections-section">
                        <h3>Previously Connected Accounts</h3>
                        <div className="saved-connections-list">
                          {Object.entries(savedConnections).map(([connectionId, conn]) => (
                            <div key={connectionId} className="saved-connection-item">
                              <div className="saved-connection-info">
                                <span className="provider-icon">
                                  {conn.provider === 'binance' ? '🟡' : '👻'}
                                </span>
                                <div>
                                  <strong>{conn.provider === 'binance' ? 'Binance' : 'Phantom Wallet'}</strong>
                                  <br />
                                  <small>Saved: {new Date(conn.savedAt).toLocaleDateString()}</small>
                                </div>
                              </div>
                              <div className="saved-connection-actions">
                                <button 
                                  className="use-saved-btn"
                                  onClick={() => {
                                    const restoredConnection: MeshConnection = {
                                      id: connectionId,
                                      provider: conn.provider,
                                      type: conn.provider === 'binance' ? 'cex' : 'self_custody',
                                      connected: true,
                                      accounts: []
                                    };
                                    setConnection(restoredConnection);
                                    
                                                        // Load data for restored connection
                    setTimeout(() => {
                      loadCryptoBalances(restoredConnection);
                      loadUSDCBalanceByProvider(restoredConnection);
                      loadBaseBalances();
                    }, 500);
                                  }}
                                >
                                  Use Saved
                                </button>
                                <button 
                                  className="remove-saved-btn"
                                  onClick={() => {
                                    MeshService.clearSavedConnection(connectionId);
                                    setSavedConnections(MeshService.getSavedConnections());
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="divider">or connect a new account</div>
                      </div>
                    )}
                    
                    <div className="connect-buttons">
                                              <button 
                          className="connect-btn binance-btn"
                          onClick={handleConnectBinance}
                          disabled={loading}
                        >
                          {loading ? 'Connecting...' : '🟡 Connect Binance'}
                      </button>
                      <button 
                        className="connect-btn phantom-btn"
                        onClick={handleConnectPhantom}
                        disabled={loading}
                      >
                        {loading ? 'Connecting...' : '👻 Connect Phantom'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="connected-state">
                    <div className="connection-success">
                      <div className="success-icon">✅</div>
                      <h3>Connected to {connection.provider === 'binance' ? 'Binance' : 'Phantom Wallet'}</h3>
                      <p>Connection ID: {connection.id}</p>
                      <p>Type: {connection.type === 'cex' ? 'Centralized Exchange' : 'Self-Custody Wallet'}</p>
                      
                      {/* Show if using saved tokens */}
                      {savedConnections[connection.id] && (
                        <div className="saved-token-indicator">
                          <span className="indicator-icon">🔐</span>
                          <span>Using saved authentication tokens</span>
                          <br />
                          <small>Saved: {new Date(savedConnections[connection.id].savedAt).toLocaleString()}</small>
                        </div>
                      )}
                      

                      <div className="connection-actions">
                        <div className="transfer-amount-input">
                          <label htmlFor="transferAmount">💰 Transfer Amount (USDC):</label>
                          <input
                            id="transferAmount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                            placeholder="Enter amount..."
                            disabled={transferLoading}
                          />
                        </div>
                        <button 
                          className="transfer-btn"
                          onClick={handleTransfer}
                          disabled={transferLoading || !appWalletAddress || transferAmount <= 0}
                        >
                          {transferLoading ? '�� Transferring...' : 
                           connection.type === 'cex' ? `💸 Transfer $${transferAmount} USDC to App` : 
                           `💸 Transfer $${transferAmount} USDC to App (via Phantom)`}
                        </button>
                        

                        
                        <button 
                          className="disconnect-btn"
                          onClick={() => {
                            setConnection(null);
                            setPortfolio(null);
                            setCryptoBalances(null);
                            setUsdcBalance(null);
                            setTransfers([]);
                            setError(null);
                            setTransferSuccess(null);
                          }}
                        >
                          🔄 Connect Different Account
                        </button>
                        
                        <button 
                          className="clear-tokens-btn"
                          onClick={() => {
                            if (connection) {
                              MeshService.clearSavedConnection(connection.id);
                              setSavedConnections(MeshService.getSavedConnections());
                              alert(`Saved tokens for ${connection.provider} have been cleared. You'll need to authenticate again next time.`);
                            }
                          }}
                        >
                          🗑️ Clear Saved Tokens
                        </button>
                        
                        <button 
                          className="reload-balances-btn"
                          onClick={reloadAllBalances}
                          disabled={loading}
                        >
                          {loading ? '🔄 Loading...' : '🔄 Reload All Balances'}
                        </button>
                      </div>
                      
                      {/* Transfer Success Message */}
                      {transferSuccess && (
                        <div className={`transfer-success ${transferSuccess.status === 'pending' ? 'transfer-pending' : ''}`}>
                          <div className="success-icon">
                            {transferSuccess.status === 'pending' ? '⏳' : '✅'}
                          </div>
                          <h3>
                            {transferSuccess.status === 'pending' 
                              ? 'Transfer Submitted!' 
                              : 'Transfer Successful!'
                            }
                          </h3>
                          <p>Transfer ID: {transferSuccess.id}</p>
                          <p>Amount: {transferSuccess.amount} {transferSuccess.currency}</p>
                          <p>Network: {transferSuccess.network}</p>
                          <p>Status: <span className={`status-${transferSuccess.status}`}>{transferSuccess.status.toUpperCase()}</span></p>
                          {transferSuccess.hash && (
                            <p>Transaction Hash: <span className="hash-display">{transferSuccess.hash.substring(0, 10)}...{transferSuccess.hash.substring(transferSuccess.hash.length - 10)}</span></p>
                          )}
                          <p>Timestamp: {new Date(transferSuccess.timestamp).toLocaleString()}</p>
                          {transferSuccess.note && (
                            <div className="transfer-note">
                              <p><strong>Note:</strong> {transferSuccess.note}</p>
                            </div>
                          )}
                          {transferSuccess.actuallySuccessful === false && (
                            <div className="transfer-warning">
                              <p><strong>⚠️ Warning:</strong> Transfer may not have completed successfully. Please check your account.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Crypto Balances */}
          <div className="right-column">
            {/* Crypto Balances Display */}
            {cryptoBalances && (
              <div className="crypto-balances-section">
                <h2>👻 Phantom Wallet - All Token Balances</h2>
                <div className="wallet-info">
                  <div className="wallet-provider">
                    <span className="provider-label">Provider:</span>
                    <span className="provider-name">{cryptoBalances.brokerName || 'Phantom'}</span>
                  </div>
                  <div className="wallet-type">
                    <span className="type-label">Type:</span>
                    <span className="type-name">{cryptoBalances.brokerType || 'DeFi Wallet'}</span>
                  </div>
                  <div className="wallet-network">
                    <span className="network-label">Network:</span>
                    <span className="network-name">Solana</span>
                  </div>
                  <div className="wallet-connection">
                    <span className="connection-label">Connection ID:</span>
                    <span className="connection-id">{cryptoBalances.connectionId?.substring(0, 8)}...</span>
                  </div>
                </div>
                
                <div className="crypto-summary">
                  <div className="total-value">
                    <h3>Total Portfolio Value</h3>
                    <div className="value-display">
                      {cryptoBalances.summary.formattedTotalValue}
                    </div>
                    <div className="positions-count">
                      {cryptoBalances.summary.totalPositions} tokens with balance
                    </div>
                  </div>
                </div>
                
                {cryptoBalances.cryptocurrencyPositions && cryptoBalances.cryptocurrencyPositions.length > 0 ? (
                  <div className="crypto-positions">
                    <h3>Your Token Holdings</h3>
                    <div className="positions-list">
                      {cryptoBalances.cryptocurrencyPositions.map((position: any, index: number) => (
                        <div key={`${position.symbol}-${index}`} className="position-card">
                          <div className="position-header">
                            <h4>{position.symbol}</h4>
                            <span className="position-name">{position.name}</span>
                            <span className="position-network">{position.network}</span>
                          </div>
                          <div className="position-details">
                            <div className="position-amount">
                              <span className="label">Amount:</span>
                              <span className="value">{position.formattedAmount}</span>
                            </div>
                            <div className="position-value">
                              <span className="label">Market Value:</span>
                              <span className="value">{position.formattedValue}</span>
                            </div>
                            <div className="position-price">
                              <span className="label">Price per Token:</span>
                              <span className="value">{position.formattedPrice}</span>
                            </div>
                            <div className={`position-pnl ${position.pnl >= 0 ? 'positive' : 'negative'}`}>
                              <span className="label">P&L:</span>
                              <span className="value">{position.formattedPnL}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-balances">
                    <h3>No Token Balances Found</h3>
                    <p>Your Phantom wallet doesn't have any tokens with value, or the connection needs to be refreshed.</p>
                    <button 
                      className="reload-balances-btn"
                      onClick={reloadAllBalances}
                      disabled={loading}
                    >
                      {loading ? '🔄 Loading...' : '🔄 Refresh Balances'}
                    </button>
                  </div>
                )}
                
                <div className="balance-timestamp">
                  <small>Last updated: {new Date(cryptoBalances.timestamp).toLocaleString()}</small>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transfer History */}
        {transfers.length > 0 && (
          <div className="transfers-section">
            <h2>Transfer History</h2>
            <div className="transfers-list">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="transfer-item">
                  <div className="transfer-info">
                    <strong>{transfer.amount} {transfer.currency}</strong>
                    <span className="transfer-network">({transfer.network})</span>
                  </div>
                  <div className="transfer-addresses">
                    <div>From: {transfer.fromAccount}</div>
                    <div>To: {transfer.toAccount}</div>
                  </div>
                  <div className={`transfer-status ${transfer.status}`}>
                    {transfer.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
