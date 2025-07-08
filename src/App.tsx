import React, { useState, useEffect } from 'react';
import { MeshService } from './services/meshService';
import { MeshConnection, MeshPortfolio, MeshTransfer } from './types';
import './App.css';

interface ConnectionState {
  coinbase: MeshConnection | null;
  wallet: MeshConnection | null;
}

function App() {
  const [connections, setConnections] = useState<ConnectionState>({
    coinbase: null,
    wallet: null
  });
  const [portfolios, setPortfolios] = useState<{
    coinbase: MeshPortfolio | null;
    wallet: MeshPortfolio | null;
  }>({
    coinbase: null,
    wallet: null
  });
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
        const connection: MeshConnection = {
          id: result.connectionId,
          provider: 'coinbase',
          type: 'cex',
          connected: true,
          accounts: []
        };
        
        setConnections(prev => ({ ...prev, coinbase: connection }));
        
        // Load portfolio after connection
        setTimeout(() => {
          loadPortfolio(connection.id, 'coinbase');
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
  const handleConnectWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Opening Phantom Wallet connection...');
      const result = await MeshService.openWalletConnection();
      
      if (result.success && result.connectionId) {
        // Real connection successful
        const connection: MeshConnection = {
          id: result.connectionId,
          provider: 'phantom',
          type: 'self_custody',
          connected: true,
          accounts: []
        };
        
        setConnections(prev => ({ ...prev, wallet: connection }));
        
        // Load portfolio after connection
        setTimeout(() => {
          loadPortfolio(connection.id, 'wallet');
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
  const loadPortfolio = async (connectionId: string, type: 'coinbase' | 'wallet') => {
    try {
      console.log(`🔄 Loading ${type} portfolio for connection:`, connectionId);
      const portfolio = await MeshService.getPortfolio(connectionId);
      setPortfolios(prev => ({ ...prev, [type]: portfolio }));
      console.log(`✅ ${type} portfolio loaded successfully`);
      
      // Clear any existing errors if portfolio loads successfully
      setError(null);
      
    } catch (err: any) {
      console.error(`❌ Failed to load ${type} portfolio:`, err);
      
      // Check if this is a real connection error vs missing connection
      if (err.message?.includes('Failed to get portfolio information')) {
        // This means we have a connection but the API call failed
        // Show demo data with a clear message
        setError(`Unable to load real ${type} data. Showing demo portfolio below.`);
        
        const demoPortfolio = {
          accounts: [
            {
              id: `demo_${type}_btc`,
              name: 'Bitcoin',
              type: 'crypto' as const,
              balance: type === 'coinbase' ? 0.05 : 0.025,
              currency: 'BTC',
              network: 'bitcoin',
              provider: type === 'coinbase' ? 'coinbase' : 'phantom',
            },
            {
              id: `demo_${type}_eth`,
              name: 'Ethereum',
              type: 'crypto' as const,
              balance: type === 'coinbase' ? 1.2 : 0.8,
              currency: 'ETH',
              network: 'ethereum',
              provider: type === 'coinbase' ? 'coinbase' : 'phantom',
            },
            {
              id: `demo_${type}_usdc`,
              name: 'USD Coin',
              type: 'crypto' as const,
              balance: type === 'coinbase' ? 1000 : 500,
              currency: 'USDC',
              network: 'ethereum',
              provider: type === 'coinbase' ? 'coinbase' : 'phantom',
            },
          ],
          totalValue: type === 'coinbase' ? 4500.50 : 2750.25,
          lastUpdated: new Date().toISOString(),
        };
        
        setPortfolios(prev => ({ ...prev, [type]: demoPortfolio }));
      } else {
        // Some other error occurred
        setError(`Failed to connect ${type}. Please try again.`);
      }
    }
  };

  // Handle transfer from Coinbase
  const handleTransferFromCoinbase = async () => {
    if (!connections.coinbase) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const transfer = await MeshService.executeTransfer(
        connections.coinbase.id,
        appWalletAddress,
        5,
        'USDC',
        'base'
      );
      
      setTransfers(prev => [transfer, ...prev]);
      
      // Refresh portfolio after transfer
      setTimeout(() => {
        loadPortfolio(connections.coinbase!.id, 'coinbase');
      }, 2000);
      
    } catch (err) {
      setError('Failed to transfer from Coinbase');
    } finally {
      setLoading(false);
    }
  };

  // Handle transfer from Wallet
  const handleTransferFromWallet = async () => {
    if (!connections.wallet) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const transfer = await MeshService.executeTransfer(
        connections.wallet.id,
        appWalletAddress,
        5,
        'USDC',
        'base'
      );
      
      setTransfers(prev => [transfer, ...prev]);
      
      // Refresh portfolio after transfer
      setTimeout(() => {
        loadPortfolio(connections.wallet!.id, 'wallet');
      }, 2000);
      
    } catch (err) {
      setError('Failed to transfer from Wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🔗 Mesh Integration Demo</h1>
          <p>Connect your Coinbase and Phantom Wallet to manage your crypto</p>
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
          <h2>Connect Your Accounts</h2>
          <div className="connection-grid">
            
            {/* Coinbase Connection */}
            <div className="connection-card">
              <h3>🏦 Coinbase (CEX)</h3>
              {!connections.coinbase ? (
                <button 
                  className="connect-btn coinbase-btn"
                  onClick={handleConnectCoinbase}
                  disabled={loading}
                >
                  {loading ? 'Opening MeshConnect...' : 'Connect Coinbase'}
                </button>
              ) : (
                <div className="connected-state">
                  <p>✅ Connected</p>
                  <div className="connection-id">
                    ID: {connections.coinbase.id}
                  </div>
                  <button 
                    className="refresh-btn"
                    onClick={() => loadPortfolio(connections.coinbase!.id, 'coinbase')}
                    disabled={loading}
                  >
                    {loading ? 'Refreshing...' : 'Refresh Portfolio'}
                  </button>
                </div>
              )}
            </div>

            {/* Phantom Wallet Connection */}
            <div className="connection-card">
              <h3>👻 Phantom Wallet (Self-Custody)</h3>
              {!connections.wallet ? (
                <button 
                  className="connect-btn wallet-btn"
                  onClick={handleConnectWallet}
                  disabled={loading}
                >
                  {loading ? 'Opening MeshConnect...' : 'Connect Phantom Wallet'}
                </button>
              ) : (
                <div className="connected-state">
                  <p>✅ Connected</p>
                  <div className="connection-id">
                    ID: {connections.wallet.id}
                  </div>
                  <button 
                    className="refresh-btn"
                    onClick={() => loadPortfolio(connections.wallet!.id, 'wallet')}
                    disabled={loading}
                  >
                    {loading ? 'Refreshing...' : 'Refresh Portfolio'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Display */}
        {(portfolios.coinbase || portfolios.wallet) && (
          <div className="portfolio-section">
            <h2>Your Portfolio</h2>
            
            {/* Demo Notice */}
            <div className="demo-notice">
              <p>📊 <strong>Demo Data:</strong> Showing example portfolio data. Connect real wallets to see actual balances.</p>
            </div>
            
            <div className="portfolio-grid">
              
              {/* Coinbase Portfolio */}
              {portfolios.coinbase && (
                <div className="portfolio-card">
                  <h3>🏦 Coinbase Portfolio</h3>
                  <div className="portfolio-value">
                    ${portfolios.coinbase.totalValue.toFixed(2)}
                  </div>
                  <div className="assets-list">
                    {portfolios.coinbase.accounts.map((account) => (
                      <div key={account.id} className="asset-item">
                        <span className="asset-name">{account.currency}</span>
                        <span className="asset-balance">{account.balance.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wallet Portfolio */}
              {portfolios.wallet && (
                <div className="portfolio-card">
                  <h3>👻 Phantom Wallet Portfolio</h3>
                  <div className="portfolio-value">
                    ${portfolios.wallet.totalValue.toFixed(2)}
                  </div>
                  <div className="assets-list">
                    {portfolios.wallet.accounts.map((account) => (
                      <div key={account.id} className="asset-item">
                        <span className="asset-name">{account.currency}</span>
                        <span className="asset-balance">{account.balance.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transfer Section */}
        {(connections.coinbase || connections.wallet) && (
          <div className="transfer-section">
            <h2>Transfer $5 USDC to App Wallet</h2>
            <div className="transfer-buttons">
              {connections.coinbase && (
                <button 
                  className="transfer-btn coinbase-transfer"
                  onClick={handleTransferFromCoinbase}
                  disabled={loading}
                >
                  {loading ? 'Transferring...' : 'Transfer from Coinbase'}
                </button>
              )}
              {connections.wallet && (
                <button 
                  className="transfer-btn wallet-transfer"
                  onClick={handleTransferFromWallet}
                  disabled={loading}
                >
                  {loading ? 'Transferring...' : 'Transfer from Wallet'}
                </button>
              )}
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
