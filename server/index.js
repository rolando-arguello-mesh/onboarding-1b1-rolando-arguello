const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3005; // Fixed port for backend server

// TODO: Set these environment variables in your .env file
const MESH_CLIENT_ID = process.env.MESH_CLIENT_ID || 'your_mesh_client_id';
const MESH_CLIENT_SECRET = process.env.MESH_CLIENT_SECRET || 'your_mesh_client_secret';
const MESH_BASE_URL = process.env.MESH_BASE_URL || 'https://integration-api.meshconnect.com';
const APP_WALLET_ADDRESS = process.env.APP_WALLET_ADDRESS || '0x1234567890123456789012345678901234567890';

// Middleware
app.use(cors());
app.use(express.json());

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

// Get MeshConnect link token
app.get('/api/mesh/link-token', async (req, res) => {
  try {
    const response = await meshAPI.post('/api/v1/linktoken', {
      userId: 'user_' + Date.now(),
      brokerType: 'coinbase', // Default to Coinbase, can be changed
    });
    
    res.json({ linkToken: response.data.content.linkToken });
  } catch (error) {
    console.error('Error generating link token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate link token' });
  }
});

// Get link token for self-custody wallet (Phantom)
app.get('/api/mesh/link-token-wallet', async (req, res) => {
  try {
    const response = await meshAPI.post('/api/v1/linktoken', {
      userId: 'user_wallet_' + Date.now(),
      // Basic authentication - allows user to choose any wallet including Phantom
      // No brokerType needed - this will show the full catalogue of self-custody wallets
    });
    
    res.json({ linkToken: response.data.content.linkToken });
  } catch (error) {
    console.error('Error generating wallet link token:', error.response?.data || error.message);
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
    
    const response = await meshAPI.get(`/api/v1/holdings/get/${connectionId}`);
    const holdings = response.data.content.holdings;
    
    const accounts = holdings.map(holding => ({
      id: holding.accountId,
      name: holding.symbol,
      type: 'crypto',
      balance: holding.quantity,
      currency: holding.symbol,
      network: holding.network,
      provider: holding.brokerType,
    }));
    
    const totalValue = holdings.reduce((sum, holding) => sum + (holding.quantity * holding.price), 0);
    
    res.json({
      portfolio: {
        accounts,
        totalValue,
        lastUpdated: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error getting portfolio:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get portfolio' });
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💼 App wallet address: ${APP_WALLET_ADDRESS}`);
  console.log(`🔗 Mesh API: ${MESH_BASE_URL}`);
}); 