const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = 3005; // Fixed port for backend server

// TODO: Set these environment variables in your .env file
const MESH_CLIENT_ID = process.env.MESH_CLIENT_ID || 'your_mesh_client_id';
const MESH_CLIENT_SECRET = process.env.MESH_CLIENT_SECRET || 'your_mesh_client_secret';
const MESH_BASE_URL = process.env.MESH_BASE_URL || 'https://integration-api.meshconnect.com';
const APP_WALLET_ADDRESS = process.env.APP_WALLET_ADDRESS || '0x1234567890123456789012345678901234567890';

// Middleware
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// In-memory storage for access tokens (in production, use a proper database)
const connectedAccounts = new Map();

// Mesh API client
const meshAPI = axios.create({
  baseURL: MESH_BASE_URL,
  headers: {
    'X-Client-Id': MESH_CLIENT_ID,
    'X-Client-Secret': MESH_CLIENT_SECRET,
    'Content-Type': 'application/json',
  },
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Get MeshConnect link token for Coinbase
app.get('/api/mesh/link-token', async (req, res) => {
  try {
    const response = await meshAPI.post('/api/v1/linktoken', {
      userId: 'user_coinbase_' + Date.now(),
      integrationId: '9226e5c2-ebc3-4fdd-94f6-ed52cdce1420', // Coinbase integration ID
      restrictMultipleAccounts: true
    });
    
    console.log('✅ Coinbase link token generated successfully');
    res.json({ linkToken: response.data.content.linkToken });
  } catch (error) {
    console.error('❌ Error generating Coinbase link token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate link token' });
  }
});

// Get link token for self-custody wallets
app.get('/api/mesh/link-token-wallet', async (req, res) => {
  try {
    const response = await meshAPI.post('/api/v1/linktoken', {
      userId: 'user_wallet_' + Date.now(),
      // No integrationId to show all available wallets including Phantom
      restrictMultipleAccounts: true
    });
    
    console.log('✅ Wallet link token generated successfully');
    res.json({ linkToken: response.data.content.linkToken });
  } catch (error) {
    console.error('❌ Error generating wallet link token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate wallet link token' });
  }
});

// Get accounts for a connection
app.post('/api/mesh/accounts', async (req, res) => {
  try {
    const { connectionId } = req.body;
    
    const response = await meshAPI.get(`/api/v1/accounts/get/${connectionId}`);
    const accounts = response.data.content.accounts.map(account => ({
      id: account.accountId,
      name: account.accountName,
      type: account.accountType,
      balance: account.balance,
      currency: account.currency,
      network: account.network,
      provider: account.brokerType,
    }));
    
    res.json({ accounts });
  } catch (error) {
    console.error('Error getting accounts:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// Get portfolio for a connection
app.post('/api/mesh/portfolio', async (req, res) => {
  try {
    const { connectionId } = req.body;
    
    // Check if we have this connection stored
    const connectionData = connectedAccounts.get(connectionId);
    
    if (!connectionData) {
      console.log('⚠️ Connection not found for ID:', connectionId);
      return res.status(404).json({ error: 'Connection not found. Please reconnect your account.' });
    }
    
    console.log('📊 Getting portfolio for connection:', connectionId);
    
    // Use the real access token to get holdings
    const response = await meshAPI.get(`/api/v1/holdings/get/${connectionData.accessToken}`);
    const holdings = response.data.content.holdings;
    
    console.log('✅ Holdings retrieved successfully:', holdings.length, 'items');
    
    const accounts = holdings.map(holding => ({
      id: holding.accountId || holding.id,
      name: holding.symbol,
      type: 'crypto',
      balance: holding.quantity || holding.balance,
      currency: holding.symbol,
      network: holding.network,
      provider: connectionData.accountData?.brokerType || 'unknown',
    }));
    
    const totalValue = holdings.reduce((sum, holding) => {
      const price = holding.price || holding.priceUsd || 0;
      const quantity = holding.quantity || holding.balance || 0;
      return sum + (quantity * price);
    }, 0);
    
    const portfolio = {
      accounts,
      totalValue,
      lastUpdated: new Date().toISOString(),
    };
    
    console.log('📈 Portfolio calculated - Total value:', totalValue);
    res.json({ portfolio });
    
  } catch (error) {
    console.error('❌ Error getting portfolio:', error.response?.data || error.message);
    
    // If it's an authentication error, suggest reconnection
    if (error.response?.status === 401 || error.response?.status === 403) {
      res.status(401).json({ 
        error: 'Authentication expired. Please reconnect your account.',
        requiresReconnection: true 
      });
    } else {
      res.status(500).json({ error: 'Failed to get portfolio' });
    }
  }
});

// Execute transfer
app.post('/api/mesh/transfer', async (req, res) => {
  try {
    const { fromConnectionId, toAddress, amount, currency = 'USDC', network = 'base' } = req.body;
    
    const transferData = {
      fromAccountId: fromConnectionId,
      toAddress: toAddress || APP_WALLET_ADDRESS,
      amount: amount,
      symbol: currency,
      network: network,
    };
    
    const response = await meshAPI.post('/api/v1/transfers/managed', transferData);
    
    res.json({
      transfer: {
        id: response.data.content.transferId,
        fromAccount: fromConnectionId,
        toAccount: toAddress || APP_WALLET_ADDRESS,
        amount: amount,
        currency: currency,
        network: network,
        status: response.data.content.status,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error executing transfer:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to execute transfer' });
  }
});

// Get transfer history
app.post('/api/mesh/transfers', async (req, res) => {
  try {
    const { connectionId } = req.body;
    
    const response = await meshAPI.get(`/api/v1/transfers/get/${connectionId}`);
    const transfers = response.data.content.transfers.map(transfer => ({
      id: transfer.transferId,
      fromAccount: transfer.fromAddress,
      toAccount: transfer.toAddress,
      amount: transfer.amount,
      currency: transfer.symbol,
      network: transfer.network,
      status: transfer.status,
      timestamp: transfer.createdAt,
    }));
    
    res.json({ transfers });
  } catch (error) {
    console.error('Error getting transfers:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get transfer history' });
  }
});

// Get app wallet address
app.get('/api/wallet-address', (req, res) => {
  res.json({ address: APP_WALLET_ADDRESS });
});

// Store access token after successful connection
app.post('/api/mesh/store-connection', async (req, res) => {
  try {
    const { connectionId, accessToken, accountData } = req.body;
    
    // Store the connection data
    connectedAccounts.set(connectionId, {
      connectionId,
      accessToken,
      accountData,
      connectedAt: new Date().toISOString()
    });
    
    console.log('✅ Connection stored successfully:', connectionId);
    res.json({ success: true, message: 'Connection stored successfully' });
  } catch (error) {
    console.error('❌ Error storing connection:', error);
    res.status(500).json({ error: 'Failed to store connection' });
  }
});

// Get stored connections
app.get('/api/mesh/connections', async (req, res) => {
  try {
    const connections = Array.from(connectedAccounts.values());
    res.json({ connections });
  } catch (error) {
    console.error('❌ Error getting connections:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💼 App wallet address: ${APP_WALLET_ADDRESS}`);
  console.log(`🔗 Mesh API: ${MESH_BASE_URL}`);
}); 