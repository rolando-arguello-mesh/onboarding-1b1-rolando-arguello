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

// Debug endpoint to test Mesh API endpoints
app.get('/api/debug/mesh-endpoints', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Testing Mesh API endpoints...');
    
    // Test basic endpoints without authentication
    const testEndpoints = [
      { method: 'GET', endpoint: '/api/v1/health' },
      { method: 'GET', endpoint: '/api/v1/integrations' },
      { method: 'GET', endpoint: '/api/v1/networks' },
      { method: 'GET', endpoint: '/api/v1/tokens' },
      { method: 'GET', endpoint: '/api/v1/accounts' },
      { method: 'GET', endpoint: '/api/v1/portfolio' },
      { method: 'GET', endpoint: '/api/v1/holdings' },
      { method: 'GET', endpoint: '/api/v1/balance' },
      { method: 'GET', endpoint: '/api/v1/balances' },
      { method: 'GET', endpoint: '/api/v1/transactions' },
      { method: 'POST', endpoint: '/api/v1/accounts/get' },
      { method: 'POST', endpoint: '/api/v1/portfolio/get' },
      { method: 'POST', endpoint: '/api/v1/holdings/get' },
      { method: 'POST', endpoint: '/api/v1/balance/get' },
      { method: 'POST', endpoint: '/api/v1/balances/get' },
      { method: 'POST', endpoint: '/api/v1/transactions/get' }
    ];
    
    const results = [];
    
    for (const { method, endpoint } of testEndpoints) {
      try {
        console.log(`🔍 Testing ${method} ${endpoint}...`);
        let response;
        
        if (method === 'POST') {
          response = await meshAPI.post(endpoint, {}, {
            headers: meshAPI.defaults.headers
          });
        } else {
          response = await meshAPI.get(endpoint, {
            headers: meshAPI.defaults.headers
          });
        }
        
        results.push({
          endpoint,
          method,
          status: response.status,
          success: true,
          dataKeys: Object.keys(response.data || {})
        });
        
        console.log(`✅ ${method} ${endpoint} - SUCCESS (${response.status})`);
      } catch (error) {
        results.push({
          endpoint,
          method,
          status: error.response?.status || 'ERROR',
          success: false,
          error: error.message
        });
        
        console.log(`❌ ${method} ${endpoint} - FAILED (${error.response?.status || 'ERROR'})`);
      }
    }
    
    res.json({
      message: 'Mesh API endpoint test completed',
      results: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
    
  } catch (error) {
    console.error('❌ DEBUG endpoint error:', error);
    res.status(500).json({ error: 'Debug test failed', details: error.message });
  }
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
    
    // Check if we have this connection stored
    const connectionData = connectedAccounts.get(connectionId);
    
    if (!connectionData) {
      console.log('⚠️ Connection not found for ID:', connectionId);
      return res.status(404).json({ error: 'Connection not found. Please reconnect your account.' });
    }
    
    const response = await meshAPI.get(`/api/v1/accounts/get/${connectionId}`, {
      headers: {
        ...meshAPI.defaults.headers,
        'Authorization': `Bearer ${connectionData.accessToken}`
      }
    });
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
    
    console.log('🔍 PORTFOLIO REQUEST - connectionId:', connectionId);
    console.log('🔍 PORTFOLIO REQUEST - req.body:', JSON.stringify(req.body, null, 2));
    
    // Check if we have this connection stored
    const connectionData = connectedAccounts.get(connectionId);
    
    console.log('🔍 PORTFOLIO REQUEST - Available connections:', Array.from(connectedAccounts.keys()));
    console.log('🔍 PORTFOLIO REQUEST - connectionData found:', !!connectionData);
    
    if (!connectionData) {
      console.log('⚠️ Connection not found for ID:', connectionId);
      console.log('⚠️ Available connections:', Array.from(connectedAccounts.keys()));
      return res.status(404).json({ error: 'Connection not found. Please reconnect your account.' });
    }
    
    console.log('🔍 PORTFOLIO REQUEST - connectionData:', JSON.stringify({
      connectionId: connectionData.connectionId,
      hasAccessToken: !!connectionData.accessToken,
      accessTokenType: typeof connectionData.accessToken,
      accessTokenKeys: connectionData.accessToken ? Object.keys(connectionData.accessToken) : [],
      accountData: connectionData.accountData ? 'present' : 'missing',
      connectedAt: connectionData.connectedAt
    }, null, 2));
    
    console.log('📊 Getting portfolio for connection:', connectionId);
    
    // Extract the real access token from the nested structure
    let realAccessToken = null;
    let accountId = null;
    
    if (connectionData.accessToken.accountTokens && connectionData.accessToken.accountTokens.length > 0) {
      const firstAccount = connectionData.accessToken.accountTokens[0];
      realAccessToken = firstAccount.accessToken;
      accountId = firstAccount.account.meshAccountId || firstAccount.account.accountId;
    }
    
    console.log('🔍 EXTRACTED TOKEN INFO:');
    console.log('- realAccessToken:', realAccessToken ? 'present' : 'missing');
    console.log('- accountId:', accountId);
    
    if (!realAccessToken) {
      throw new Error('No access token found in connection data');
    }
    
    // Based on debugging, only some endpoints exist in Mesh API
    // We found that /api/v1/integrations works, so let's focus on similar patterns
    const possibleEndpoints = [
      // Try endpoints that might be similar to the working /api/v1/integrations pattern
      { method: 'GET', endpoint: '/api/v1/integrations', body: null },
      { method: 'GET', endpoint: '/api/v1/accounts', body: null },
      { method: 'GET', endpoint: '/api/v1/portfolio', body: null },
      { method: 'GET', endpoint: '/api/v1/balances', body: null },
      { method: 'GET', endpoint: '/api/v1/holdings', body: null },
      
      // Try POST endpoints that require auth - use same patterns as working integrations endpoint
      { method: 'POST', endpoint: '/api/v1/accounts/get', body: { accessToken: realAccessToken } },
      { method: 'POST', endpoint: '/api/v1/portfolio/get', body: { accessToken: realAccessToken } },
      { method: 'POST', endpoint: '/api/v1/holdings/get', body: { accessToken: realAccessToken } },
      { method: 'POST', endpoint: '/api/v1/balances/get', body: { accessToken: realAccessToken } },
      
      // Try portfolio-specific endpoints with different structures
      { method: 'POST', endpoint: '/api/v1/portfolio/holdings', body: { accessToken: realAccessToken } },
      { method: 'POST', endpoint: '/api/v1/portfolio/holdings/values', body: { accessToken: realAccessToken } },
      { method: 'POST', endpoint: '/api/v1/portfolio/balance', body: { accessToken: realAccessToken } },
      
      // Try balance endpoints (common in financial APIs)
      { method: 'POST', endpoint: '/api/v1/balance/get', body: { accessToken: realAccessToken } },
      { method: 'POST', endpoint: '/api/v1/balance', body: { accessToken: realAccessToken } },
      
      // Try transaction endpoints (might return portfolio-like data)
      { method: 'POST', endpoint: '/api/v1/transactions/get', body: { accessToken: realAccessToken } },
      { method: 'POST', endpoint: '/api/v1/transactions', body: { accessToken: realAccessToken } },
      
      // Try with different auth token structures
      { method: 'POST', endpoint: '/api/v1/accounts/get', body: { authToken: realAccessToken } },
      { method: 'POST', endpoint: '/api/v1/portfolio/get', body: { authToken: realAccessToken } },
      { method: 'POST', endpoint: '/api/v1/holdings/get', body: { authToken: realAccessToken } },
      
      // Try endpoints with connection ID (sometimes APIs use this pattern)
      { method: 'POST', endpoint: '/api/v1/accounts/get', body: { connectionId: connectionId } },
      { method: 'POST', endpoint: '/api/v1/portfolio/get', body: { connectionId: connectionId } },
      { method: 'POST', endpoint: '/api/v1/holdings/get', body: { connectionId: connectionId } }
    ];
    
    let response = null;
    let lastError = null;
    
    for (const { method, endpoint, body } of possibleEndpoints) {
      try {
        console.log(`🔍 TRYING MESH API ${method} REQUEST - URL:`, endpoint);
        const requestHeaders = {
          ...meshAPI.defaults.headers,
          'Authorization': `Bearer ${realAccessToken}`
        };
        
        console.log('🔍 MESH API REQUEST - Headers Authorization:', `Bearer ${realAccessToken.substring(0, 20)}...`);
        
        if (method === 'POST') {
          response = await meshAPI.post(endpoint, body, {
            headers: requestHeaders
          });
        } else {
          response = await meshAPI.get(endpoint, {
            headers: requestHeaders
          });
        }
        
        console.log(`✅ SUCCESS with ${method} ${endpoint}`);
        break;
      } catch (error) {
        console.log(`❌ FAILED with ${method} ${endpoint} - Status:`, error.response?.status);
        console.log(`❌ FAILED with ${method} ${endpoint} - Data:`, error.response?.data);
        lastError = error;
        continue;
      }
    }
    
    if (!response) {
      throw lastError || new Error('All tested API endpoints failed with 404 - endpoints may not exist');
    }
    
    console.log('✅ MESH API RESPONSE - Status:', response.status);
    console.log('✅ MESH API RESPONSE - Data structure:', JSON.stringify({
      hasContent: !!response.data.content,
      hasHoldings: !!response.data.content?.holdings,
      hasAccounts: !!response.data.content?.accounts,
      holdingsCount: response.data.content?.holdings?.length || 0,
      accountsCount: response.data.content?.accounts?.length || 0,
      responseKeys: Object.keys(response.data || {}),
      contentKeys: Object.keys(response.data?.content || {})
    }, null, 2));
    
    // Try to extract holdings/accounts from different possible response structures
    let holdings = null;
    
    if (response.data.content?.holdings) {
      holdings = response.data.content.holdings;
      console.log('✅ Found holdings in response.data.content.holdings');
    } else if (response.data.content?.accounts) {
      holdings = response.data.content.accounts;
      console.log('✅ Found accounts in response.data.content.accounts');
    } else if (response.data.holdings) {
      holdings = response.data.holdings;
      console.log('✅ Found holdings in response.data.holdings');
    } else if (response.data.accounts) {
      holdings = response.data.accounts;
      console.log('✅ Found accounts in response.data.accounts');
    } else if (Array.isArray(response.data.content)) {
      holdings = response.data.content;
      console.log('✅ Found array in response.data.content');
    } else if (Array.isArray(response.data)) {
      holdings = response.data;
      console.log('✅ Found array in response.data');
    } else {
      console.log('⚠️ Unknown response structure, using empty array');
      holdings = [];
    }
    
    console.log('✅ Holdings/accounts retrieved:', Array.isArray(holdings) ? holdings.length : 'not an array', 'items');
    
    if (Array.isArray(holdings) && holdings.length > 0) {
      console.log('🔍 HOLDINGS SAMPLE:', holdings.slice(0, 2).map(h => ({
        id: h.accountId || h.id,
        symbol: h.symbol,
        quantity: h.quantity || h.balance,
        price: h.price || h.priceUsd,
        network: h.network,
        name: h.accountName || h.name,
        type: h.accountType || h.type
      })));
    }
    
    let accounts = [];
    
    if (Array.isArray(holdings)) {
      accounts = holdings.map(holding => ({
        id: holding.accountId || holding.id,
        name: holding.symbol || holding.accountName || holding.name || 'Unknown Asset',
        type: holding.accountType || holding.type || 'crypto',
        balance: holding.quantity || holding.balance || 0,
        currency: holding.symbol || holding.currency || 'Unknown',
        network: holding.network || 'unknown',
        provider: connectionData.accountData?.brokerType || holding.brokerType || 'unknown',
      }));
    }
    
    const totalValue = Array.isArray(holdings) ? holdings.reduce((sum, holding) => {
      const price = holding.price || holding.priceUsd || 0;
      const quantity = holding.quantity || holding.balance || 0;
      return sum + (quantity * price);
    }, 0) : 0;
    
    const portfolio = {
      accounts,
      totalValue,
      lastUpdated: new Date().toISOString(),
    };
    
    console.log('📈 Portfolio calculated - Total value:', totalValue);
    console.log('📈 Portfolio accounts count:', accounts.length);
    res.json({ portfolio });
    
  } catch (error) {
    console.error('❌ ERROR GETTING PORTFOLIO - Full error:', error);
    console.error('❌ ERROR GETTING PORTFOLIO - Error message:', error.message);
    console.error('❌ ERROR GETTING PORTFOLIO - Error stack:', error.stack);
    
    if (error.response) {
      console.error('❌ ERROR GETTING PORTFOLIO - Response status:', error.response.status);
      console.error('❌ ERROR GETTING PORTFOLIO - Response statusText:', error.response.statusText);
      console.error('❌ ERROR GETTING PORTFOLIO - Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('❌ ERROR GETTING PORTFOLIO - Response headers:', JSON.stringify(error.response.headers, null, 2));
    }
    
    if (error.request) {
      console.error('❌ ERROR GETTING PORTFOLIO - Request details:', {
        method: error.request.method,
        url: error.request.url,
        headers: error.request.headers
      });
    }
    
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
    
    // Check if we have this connection stored
    const connectionData = connectedAccounts.get(connectionId);
    
    if (!connectionData) {
      console.log('⚠️ Connection not found for ID:', connectionId);
      return res.status(404).json({ error: 'Connection not found. Please reconnect your account.' });
    }
    
    const response = await meshAPI.get(`/api/v1/transfers/get/${connectionId}`, {
      headers: {
        ...meshAPI.defaults.headers,
        'Authorization': `Bearer ${connectionData.accessToken}`
      }
    });
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
    
    console.log('🔍 STORE CONNECTION - connectionId:', connectionId);
    console.log('🔍 STORE CONNECTION - accessToken type:', typeof accessToken);
    console.log('🔍 STORE CONNECTION - accessToken keys:', accessToken ? Object.keys(accessToken) : 'null');
    console.log('🔍 STORE CONNECTION - accessToken value:', JSON.stringify(accessToken, null, 2));
    console.log('🔍 STORE CONNECTION - accountData:', JSON.stringify(accountData, null, 2));
    
    // Store the connection data
    const connectionData = {
      connectionId,
      accessToken,
      accountData,
      connectedAt: new Date().toISOString()
    };
    
    connectedAccounts.set(connectionId, connectionData);
    
    console.log('✅ Connection stored successfully:', connectionId);
    console.log('✅ Total connections stored:', connectedAccounts.size);
    console.log('✅ All connection IDs:', Array.from(connectedAccounts.keys()));
    
    res.json({ success: true, message: 'Connection stored successfully' });
  } catch (error) {
    console.error('❌ Error storing connection:', error);
    console.error('❌ Error storing connection - stack:', error.stack);
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
  console.log(`🔑 Mesh Client ID: ${MESH_CLIENT_ID}`);
  console.log(`🔐 Mesh Client Secret: ${MESH_CLIENT_SECRET ? 'Present' : 'Missing'}`);
  console.log(`🗂️ Connected accounts storage: ${connectedAccounts.size} connections`);
}); 