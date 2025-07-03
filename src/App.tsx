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
      const linkToken = await MeshService.getLinkToken();
      
      // For demo purposes, we'll simulate a connection
      // In a real app, this would integrate with the Mesh SDK
      console.log('Coinbase link token:', linkToken);
      
      // Simulate connection
      const connection: MeshConnection = {
        id: 'coinbase_connection_' + Date.now(),
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
      
    } catch (err) {
      setError('Failed to connect to Coinbase');
    } finally {
      setLoading(false);
    }
  };

  // Handle Rainbow Wallet connection
  const handleConnectWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const linkToken = await MeshService.getWalletLinkToken();
      
      // For demo purposes, we'll simulate a connection
      console.log('Wallet link token:', linkToken);
      
      // Simulate connection
      const connection: MeshConnection = {
        id: 'wallet_connection_' + Date.now(),
        provider: 'rainbow',
        type: 'self_custody',
        connected: true,
        accounts: []
      };
      
      setConnections(prev => ({ ...prev, wallet: connection }));
      
      // Load portfolio after connection
      setTimeout(() => {
        loadPortfolio(connection.id, 'wallet');
      }, 1000);
      
    } catch (err) {
      setError('Failed to connect to Rainbow Wallet');
    } finally {
      setLoading(false);
    }
  };

  // Load portfolio for a connection
  const loadPortfolio = async (connectionId: string, type: 'coinbase' | 'wallet') => {
    try {
      const portfolio = await MeshService.getPortfolio(connectionId);
      setPortfolios(prev => ({ ...prev, [type]: portfolio }));
    } catch (err) {
      console.error(`Failed to load ${type} portfolio:`, err);
    }
  };

  // Load transfers for a connection
  const loadTransfers = async (connectionId: string) => {
    try {
      const transferHistory = await MeshService.getTransfers(connectionId);
      setTransfers(transferHistory);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    }
  };

  // Execute transfer from Coinbase
  const handleTransferFromCoinbase = async () => {
    if (!connections.coinbase) return;
    
    setLoading(true);
    try {
      const transfer = await MeshService.executeTransfer(
        connections.coinbase.id,
        appWalletAddress,
        5, // $5 USDC
        'USDC',
        'base'
      );
      
      setTransfers(prev => [transfer, ...prev]);
      // Refresh portfolio after transfer
      loadPortfolio(connections.coinbase.id, 'coinbase');
    } catch (err) {
      setError('Failed to execute Coinbase transfer');
    } finally {
      setLoading(false);
    }
  };

  // Execute transfer from wallet
  const handleTransferFromWallet = async () => {
    if (!connections.wallet) return;
    
    setLoading(true);
    try {
      const transfer = await MeshService.executeTransfer(
        connections.wallet.id,
        appWalletAddress,
        5, // $5 worth of USDC
        'USDC',
        'base'
      );
      
      setTransfers(prev => [transfer, ...prev]);
      // Refresh portfolio after transfer
      loadPortfolio(connections.wallet.id, 'wallet');
    } catch (err) {
      setError('Failed to execute wallet transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🔗 Mesh Integration Demo</h1>
          <p>Connect your Coinbase and Rainbow Wallet to manage your crypto</p>
        </header>

        {error && (
          <div className="error-message">
            {error}
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
                  {loading ? 'Connecting...' : 'Connect Coinbase'}
                </button>
              ) : (
                <div className="connected-state">
                  <p>✅ Connected</p>
                  <button 
                    className="refresh-btn"
                    onClick={() => loadPortfolio(connections.coinbase!.id, 'coinbase')}
                  >
                    Refresh Portfolio
                  </button>
                </div>
              )}
            </div>

            {/* Rainbow Wallet Connection */}
            <div className="connection-card">
              <h3>🌈 Rainbow Wallet (Self-Custody)</h3>
              {!connections.wallet ? (
                <button 
                  className="connect-btn wallet-btn"
                  onClick={handleConnectWallet}
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : 'Connect Rainbow Wallet'}
                </button>
              ) : (
                <div className="connected-state">
                  <p>✅ Connected</p>
                  <button 
                    className="refresh-btn"
                    onClick={() => loadPortfolio(connections.wallet!.id, 'wallet')}
                  >
                    Refresh Portfolio
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
                  <h3>🌈 Rainbow Wallet Portfolio</h3>
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
