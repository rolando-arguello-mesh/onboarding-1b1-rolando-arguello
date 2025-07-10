import React, { useState, useEffect } from 'react';
import { MeshService } from './services/meshService';
import { MeshConnection, MeshPortfolio, MeshTransfer } from './types';
import './App.css';

// App with separate buttons for Coinbase and Phantom Wallet

function App() {
  const [connection, setConnection] = useState<MeshConnection | null>(null);
  const [portfolio, setPortfolio] = useState<MeshPortfolio | null>(null);
  const [transfers, setTransfers] = useState<MeshTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appWalletAddress, setAppWalletAddress] = useState<string>('');

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
        
        // Load portfolio after connection
        setTimeout(() => {
          loadPortfolio(newConnection.id);
        }, 1000);
        
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
        
        // Load portfolio after connection
        setTimeout(() => {
          loadPortfolio(newConnection.id);
        }, 1000);
        
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

  // Handle transfer from wallet
  const handleTransfer = async () => {
    if (!connection) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const transfer = await MeshService.executeTransfer(
        connection.id,
        appWalletAddress,
        5,
        'USDC',
        'base'
      );
      
      setTransfers(prev => [transfer, ...prev]);
      
      // Refresh portfolio after transfer
      setTimeout(() => {
        loadPortfolio(connection.id);
      }, 2000);
      
    } catch (err) {
      setError('Failed to execute transfer');
    } finally {
      setLoading(false);
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
              <br />
              <small>Using demo data for now. The portfolio below shows example values.</small>
            </div>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="app-wallet">
          <h3>App Wallet Address</h3>
          <div className="wallet-address">
            {appWalletAddress || 'Loading...'}
          </div>
        </div>

        <div className="connections-section">
          <h2>Connect Your Account</h2>
          <div className="connection-center">
            {!connection ? (
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
            ) : (
              <div className="connected-state">
                <div className="connection-success">
                  <div className="success-icon">✅</div>
                  <h3>Connected to {connection.provider === 'coinbase' ? 'Coinbase' : 'Phantom Wallet'}</h3>
                  <p>Connection ID: {connection.id}</p>
                  <p>Type: {connection.type === 'cex' ? 'Centralized Exchange' : 'Self-Custody Wallet'}</p>
                  <button 
                    className="disconnect-btn"
                    onClick={() => {
                      setConnection(null);
                      setPortfolio(null);
                      setTransfers([]);
                      setError(null);
                    }}
                  >
                    🔄 Connect Different Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Display */}
        {portfolio && (
          <div className="portfolio-section">
            <h2>Your Portfolio</h2>
            
            {/* Demo Notice */}
            <div className="demo-notice">
              <p>📊 <strong>Demo Data:</strong> Showing example portfolio data. Connect real wallets to see actual balances.</p>
            </div>
            
            <div className="portfolio-card">
              <h3>💼 Wallet Portfolio</h3>
              <div className="portfolio-value">
                ${portfolio.totalValue.toFixed(2)}
              </div>
              <div className="assets-list">
                {portfolio.accounts.map((account) => (
                  <div key={account.id} className="asset-item">
                    <span className="asset-name">{account.currency}</span>
                    <span className="asset-balance">{account.balance.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transfer Section */}
        {connection && (
          <div className="transfer-section">
            <h2>Transfer $5 USDC to App Wallet</h2>
            <div className="transfer-center">
              <button 
                className="transfer-btn main-transfer-btn"
                onClick={handleTransfer}
                disabled={loading}
              >
                {loading ? 'Transferring...' : '💸 Transfer from Wallet'}
              </button>
            </div>
          </div>
        )}

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
