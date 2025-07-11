import React, { useState, useEffect } from 'react';
import { MeshService } from './services/meshService';
import { MeshConnection, MeshPortfolio, MeshTransfer, CryptoBalanceData, USDCBalanceData } from './types';
import './App.css';

// App with separate buttons for Coinbase and Phantom Wallet

function App() {
  const [connection, setConnection] = useState<MeshConnection | null>(null);
  const [portfolio, setPortfolio] = useState<MeshPortfolio | null>(null);
  const [cryptoBalances, setCryptoBalances] = useState<CryptoBalanceData | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<USDCBalanceData | null>(null);
  const [transfers, setTransfers] = useState<MeshTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appWalletAddress, setAppWalletAddress] = useState<string>('');
  const [savedConnections, setSavedConnections] = useState<{ [key: string]: any }>({});
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<MeshTransfer | null>(null);

  // Check for existing saved connections on app load
  useEffect(() => {
    const checkSavedConnections = () => {
      const saved = MeshService.getSavedConnections();
      setSavedConnections(saved);
      
      // If we have saved connections, check if any are still valid
      const coinbaseCheck = MeshService.hasValidTokensForProvider('coinbase');
      const phantomCheck = MeshService.hasValidTokensForProvider('phantom');
      
      console.log('🔍 Checking saved connections on app load:');
      console.log('  - Coinbase tokens valid:', coinbaseCheck.hasTokens);
      console.log('  - Phantom tokens valid:', phantomCheck.hasTokens);
      
      // Auto-restore the most recent valid connection if available
      if (coinbaseCheck.hasTokens && !connection) {
        console.log('🔄 Auto-restoring Coinbase connection...');
        const restoredConnection: MeshConnection = {
          id: coinbaseCheck.connectionId!,
          provider: 'coinbase',
          type: 'cex',
          connected: true,
          accounts: []
        };
        setConnection(restoredConnection);
        
        // First restore the connection in the server, then load data
        setTimeout(async () => {
          try {
            await MeshService.restoreConnection(coinbaseCheck.connectionId!, coinbaseCheck.connection);
            loadCryptoBalances(restoredConnection);
            loadUSDCBalance(restoredConnection.id);
          } catch (error) {
            console.error('❌ Failed to restore Coinbase connection:', error);
            // Clear invalid connection
            MeshService.clearSavedConnection(coinbaseCheck.connectionId!);
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
            loadUSDCBalance(restoredConnection.id);
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

  // Load crypto balances for connected account (Coinbase or Phantom)
  const loadCryptoBalances = async (connectionToUse?: MeshConnection) => {
    const currentConnection = connectionToUse || connection;
    if (!currentConnection) return;
    
    try {
      console.log('🪙 Loading crypto balances for', currentConnection.provider, '...');
      
      // Use different endpoints based on provider
      let balanceData;
      if (currentConnection.provider === 'coinbase') {
        balanceData = await MeshService.getCoinbaseCryptoBalances();
      } else if (currentConnection.provider === 'phantom') {
        // For Phantom, we'll use the generic crypto balances endpoint
        balanceData = await MeshService.getCryptoBalances(currentConnection.id);
      } else {
        console.log('⚠️ Unknown provider for crypto balances:', currentConnection.provider);
        return;
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

  // Load app wallet address on mount
  useEffect(() => {
    const loadWalletAddress = async () => {
      try {
        const address = await MeshService.getAppWalletAddress();
        setAppWalletAddress(address);
      } catch (err) {
        console.error('Failed to load app wallet address:', err);
      }
    };
    loadWalletAddress();
  }, []);

  // Handle Coinbase connection
  const handleConnectCoinbase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Opening Coinbase connection...');
      const result = await MeshService.openCoinbaseConnection();
      
      if (result.success && result.connectionId) {
        // Real connection successful
        const newConnection: MeshConnection = {
          id: result.connectionId,
          provider: 'coinbase',
          type: 'cex',
          connected: true,
          accounts: []
        };
        
        setConnection(newConnection);
        
        // Load portfolio and crypto balances after connection
        setTimeout(() => {
          loadPortfolio(newConnection.id);
          loadCryptoBalances(newConnection);
          loadUSDCBalance(newConnection.id);
        }, 2000);
        
        console.log('Coinbase connected successfully with ID:', result.connectionId);
      } else {
        // Connection failed
        setError(result.error || 'Failed to connect to Coinbase');
      }
      
    } catch (err) {
      console.error('Error connecting to Coinbase:', err);
      setError('Failed to connect to Coinbase');
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
          loadUSDCBalance(newConnection.id);
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

  // Handle transfer of $5 USDC to app wallet using Mesh SDK (handles MFA automatically)
  const handleTransfer = async () => {
    if (!connection || !appWalletAddress) {
      setError('Connection or app wallet address not available');
      return;
    }

    setTransferLoading(true);
    setError(null);
    setTransferSuccess(null);

    try {
      console.log('🚀 Executing transfer with Mesh SDK: $5 USDC to app wallet');
      console.log('  - From:', connection.id);
      console.log('  - To:', appWalletAddress);
      console.log('  - Amount: 5 USDC');
      console.log('  - Network: Base');

      const result = await MeshService.executeTransferWithSDK(
        connection.id,
        appWalletAddress,
        5,
        'USDC',
        'base'
      );

      console.log('✅ Transfer SDK result:', result);
      
      if (result.success) {
        console.log('🎉 Transfer completed successfully via SDK!');
        
        // Create a success object for display
        const successTransfer = {
          id: 'sdk_transfer_' + Date.now(),
          amount: 5,
          currency: 'USDC',
          network: 'base',
          status: 'completed' as const,
          fromAccount: connection.provider,
          toAccount: 'App Wallet',
          timestamp: new Date().toISOString(),
          note: 'Transfer completed via Mesh SDK'
        };
        
        setTransferSuccess(successTransfer);
        
        // Refresh balances after transfer
        setTimeout(() => {
          loadCryptoBalances(connection);
          loadUSDCBalance(connection.id);
        }, 2000);
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
          <p>Connect your Coinbase account or Phantom Wallet to manage your portfolio</p>
        </header>

        {error && (
          <div className="error-message">
            <div>
              <strong>⚠️ {error}</strong>
            </div>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="dashboard-layout">
          
          {/* Left Column - App Wallet */}
          <div className="left-column">
            <div className="app-wallet">
              <h3>App Wallet Address</h3>
              <div className="wallet-address">
                {appWalletAddress || 'Loading...'}
              </div>
            </div>
            
            {/* App Wallet Balance Section - Placeholder for future implementation */}
            <div className="app-wallet-balance">
              <h3>💼 App Wallet Balance</h3>
              <div className="balance-placeholder">
                <p>Connect accounts to start receiving transfers</p>
                <div className="balance-value">$0.00</div>
              </div>
            </div>
          </div>

          {/* Right Column - Connected Accounts */}
          <div className="right-column">
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
                                  {conn.provider === 'coinbase' ? '🟡' : '👻'}
                                </span>
                                <div>
                                  <strong>{conn.provider === 'coinbase' ? 'Coinbase' : 'Phantom Wallet'}</strong>
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
                                      type: conn.provider === 'coinbase' ? 'cex' : 'self_custody',
                                      connected: true,
                                      accounts: []
                                    };
                                    setConnection(restoredConnection);
                                    
                                    // Load data for restored connection
                                    setTimeout(() => {
                                      loadCryptoBalances(restoredConnection);
                                      loadUSDCBalance(restoredConnection.id);
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
                        className="connect-btn coinbase-btn"
                        onClick={handleConnectCoinbase}
                        disabled={loading}
                      >
                        {loading ? 'Connecting...' : '🟡 Connect Coinbase'}
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
                      <h3>Connected to {connection.provider === 'coinbase' ? 'Coinbase' : 'Phantom Wallet'}</h3>
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
                        <button 
                          className="transfer-btn"
                          onClick={handleTransfer}
                          disabled={transferLoading || !appWalletAddress}
                        >
                          {transferLoading ? '🔄 Transferring...' : '💸 Transfer $5 USDC to App'}
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

            {/* USDC Balance Highlight */}
            {usdcBalance && (
              <div className="usdc-balance-section">
                <h3>💰 USDC Balance</h3>
                <div className="usdc-summary">
                  <div className="usdc-amount">
                    {usdcBalance.usdc.formattedBalance}
                  </div>
                  <div className="usdc-value">
                    {usdcBalance.usdc.formattedValue}
                  </div>
                </div>
              </div>
            )}

            {/* Crypto Balances Display */}
            {cryptoBalances && (
              <div className="crypto-balances-section">
                <h2>💰 Cryptocurrency Balances</h2>
                <div className="crypto-summary">
                  <div className="total-value">
                    <h3>Total Portfolio Value</h3>
                    <div className="value-display">
                      {cryptoBalances.summary.formattedTotalValue}
                    </div>
                    <div className="positions-count">
                      {cryptoBalances.summary.totalPositions} positions
                    </div>
                  </div>
                </div>
                
                <div className="crypto-positions">
                  <h3>Your Positions</h3>
                  <div className="positions-list">
                    {cryptoBalances.cryptocurrencyPositions.map((position, index) => (
                      <div key={position.symbol} className="position-card">
                        <div className="position-header">
                          <h4>{position.symbol}</h4>
                          <span className="position-name">{position.name}</span>
                        </div>
                        <div className="position-details">
                          <div className="position-amount">
                            <span className="label">Amount:</span>
                            <span className="value">{position.formattedAmount}</span>
                          </div>
                          <div className="position-value">
                            <span className="label">Value:</span>
                            <span className="value">{position.formattedValue}</span>
                          </div>
                          <div className="position-price">
                            <span className="label">Price:</span>
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
