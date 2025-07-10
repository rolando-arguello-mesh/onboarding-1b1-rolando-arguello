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
const APP_WALLET_ADDRESS = process.env.APP_WALLET_ADDRESS || '0xb4437EC792d9aa41ab91f48eF9BF517fFbcaFAD2';

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

// Debug endpoint to create test connection
app.post('/api/debug/create-test-connection', (req, res) => {
  try {
    const { provider = 'coinbase' } = req.body;
    
    const testConnectionId = `test_${provider}_${Date.now()}`;
    
    // Create a test connection with realistic structure based on logs
    const testConnectionData = {
      connectionId: testConnectionId,
      accessToken: {
        accountTokens: [
          {
            account: {
              meshAccountId: "a7d05bca-aad2-4129-47d2-08ddbf3f58f3",
              frontAccountId: "a7d05bca-aad2-4129-47d2-08ddbf3f58f3",
              accountId: "81a31226-25aa-534c-8a9c-e17293cf2508",
              accountName: "Test Account"
            },
            accessToken: "test_access_token_12345",
            refreshToken: "test_refresh_token_12345"
          }
        ],
        brokerType: provider,
        brokerName: provider === 'coinbase' ? 'Coinbase' : 'Phantom',
        brokerBrandInfo: {
          brokerLogoUrl: "https://example.com/logo.svg"
        },
        expiresInSeconds: 3600
      },
      accountData: {
        provider: provider
      },
      connectedAt: new Date().toISOString()
    };
    
    // Store the test connection
    connectedAccounts.set(testConnectionId, testConnectionData);
    
    console.log('✅ Test connection created:', testConnectionId);
    
    res.json({
      success: true,
      connectionId: testConnectionId,
      message: 'Test connection created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating test connection:', error);
    res.status(500).json({ error: 'Failed to create test connection' });
  }
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

// Debug endpoint to test Mesh API endpoints
app.get('/api/debug/connections', (req, res) => {
  try {
    const connections = Array.from(connectedAccounts.entries()).map(([key, value]) => ({
      connectionId: key,
      hasAccessToken: !!value.accessToken,
      accessTokenType: typeof value.accessToken,
      brokerType: value.accessToken?.brokerType,
      brokerName: value.accessToken?.brokerName,
      accountTokensCount: value.accessToken?.accountTokens?.length || 0,
      connectedAt: value.connectedAt
    }));
    
    res.json({
      totalConnections: connectedAccounts.size,
      connections: connections
    });
  } catch (error) {
    console.error('❌ Debug connections error:', error);
    res.status(500).json({ error: 'Failed to get debug connections' });
  }
});

// Debug endpoint to inspect raw Mesh holdings API response
app.post('/api/debug/mesh-holdings', async (req, res) => {
  try {
    const { connectionId } = req.body;
    
    // Get connection data
    const connectionData = connectedAccounts.get(connectionId);
    if (!connectionData) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Extract the access token
    const realAccessToken = connectionData.accessToken?.accountTokens?.[0]?.accessToken;
    const brokerType = connectionData.accessToken?.brokerType;
    
    if (!realAccessToken) {
      return res.status(400).json({ error: 'No access token found' });
    }
    
    // Make the actual API call to Mesh Connect
    const meshResponse = await meshAPI.post('/api/v1/holdings/get', {
      authToken: realAccessToken,
      type: brokerType,
      includeMarketValue: true
    });
    
    // Return the complete raw response for debugging
    res.json({
      success: true,
      connectionId,
      brokerType,
      responseStatus: meshResponse.status,
      responseData: meshResponse.data,
      analysisHelp: {
        hasContent: !!meshResponse.data.content,
        contentKeys: Object.keys(meshResponse.data?.content || {}),
        responseStructure: {
          cryptoPositions: meshResponse.data?.content?.cryptocurrencyPositions?.length || 0,
          equityPositions: meshResponse.data?.content?.equityPositions?.length || 0,
          nftPositions: meshResponse.data?.content?.nftPositions?.length || 0,
          optionPositions: meshResponse.data?.content?.optionPositions?.length || 0
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Debug mesh holdings error:', error);
    res.status(500).json({ 
      error: 'Debug mesh holdings failed',
      message: error.message,
      responseData: error.response?.data || null
    });
  }
});

// Get all available integrations from Mesh
app.get('/api/mesh/integrations', async (req, res) => {
  try {
    const response = await meshAPI.get('/api/v1/integrations');
    console.log('✅ Retrieved all integrations from Mesh');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error retrieving integrations:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to retrieve integrations' });
  }
});

// Get MeshConnect link token for Coinbase (goes directly to Coinbase)
app.get('/api/mesh/link-token', async (req, res) => {
  try {
    const response = await meshAPI.post('/api/v1/linktoken', {
      userId: 'user_coinbase_' + Date.now(),
      integrationId: '47624467-e52e-4938-a41a-7926b6c27acf', // Coinbase integration ID from official docs
      restrictMultipleAccounts: true
    });
    
    console.log('✅ Coinbase link token generated successfully');
    res.json({ linkToken: response.data.content.linkToken });
  } catch (error) {
    console.error('❌ Error generating Coinbase link token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate link token' });
  }
});

// Get link token for Phantom wallet (goes directly to Phantom)
app.get('/api/mesh/link-token-wallet', async (req, res) => {
  try {
    const response = await meshAPI.post('/api/v1/linktoken', {
      userId: 'user_phantom_' + Date.now(),
      integrationId: '757e703f-a8fe-4dc4-d0ec-08dc6737ad96', // Phantom integration ID from official API
      restrictMultipleAccounts: true
    });
    
    console.log('✅ Phantom link token generated successfully');
    res.json({ linkToken: response.data.content.linkToken });
  } catch (error) {
    console.error('❌ Error generating Phantom link token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate Phantom link token' });
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
      brokerType: connectionData.accessToken?.brokerType,
      brokerName: connectionData.accessToken?.brokerName,
      connectedAt: connectionData.connectedAt
    }, null, 2));
    
    console.log('📊 Getting portfolio for connection:', connectionId);
    
    // Extract the real access token from the nested structure
    let realAccessToken = null;
    let brokerType = null;
    
    if (connectionData.accessToken.accountTokens && connectionData.accessToken.accountTokens.length > 0) {
      const firstAccount = connectionData.accessToken.accountTokens[0];
      realAccessToken = firstAccount.accessToken;
      brokerType = connectionData.accessToken.brokerType;
    }
    
    console.log('🔍 EXTRACTED TOKEN INFO:');
    console.log('- realAccessToken:', realAccessToken ? 'present' : 'missing');
    console.log('- brokerType:', brokerType);
    
    if (!realAccessToken) {
      throw new Error('No access token found in connection data');
    }
    
    if (!brokerType) {
      throw new Error('No broker type found in connection data');
    }
    
    // Check if this is a test connection
    const isTestConnection = connectionId.startsWith('test_');
    
    let holdings = [];
    
    if (isTestConnection) {
      console.log('🔍 DETECTED TEST CONNECTION - Using demo data');
      
      // Return demo data for test connections
      holdings = [
        {
          symbol: 'BTC',
          quantity: 0.125,
          marketValue: 5000.00,
          costBasis: 4800.00,
          network: 'bitcoin',
          accountId: 'test_btc_account'
        },
        {
          symbol: 'ETH',
          quantity: 2.5,
          marketValue: 7500.00,
          costBasis: 7000.00,
          network: 'ethereum',
          accountId: 'test_eth_account'
        },
        {
          symbol: 'USDC',
          quantity: 1500.00,
          marketValue: 1500.00,
          costBasis: 1500.00,
          network: 'ethereum',
          accountId: 'test_usdc_account'
        }
      ];
    } else {
      // Use the correct Mesh Connect Holdings API endpoint for real connections
      console.log('🔍 CALLING MESH HOLDINGS API - URL: /api/v1/holdings/get');
      console.log('🔍 CALLING MESH HOLDINGS API - brokerType:', brokerType);
      console.log('🔍 CALLING MESH HOLDINGS API - authToken:', realAccessToken.substring(0, 20) + '...');
      
      try {
        const response = await meshAPI.post('/api/v1/holdings/get', {
          authToken: realAccessToken,
          type: brokerType,
          includeMarketValue: true
        });
        
        console.log('✅ MESH HOLDINGS API RESPONSE - Status:', response.status);
        console.log('✅ MESH HOLDINGS API RESPONSE - Structure:', JSON.stringify({
          hasContent: !!response.data.content,
          hasHoldings: !!response.data.content?.holdings,
          holdingsCount: response.data.content?.holdings?.length || 0,
          responseKeys: Object.keys(response.data || {}),
          contentKeys: Object.keys(response.data?.content || {})
        }, null, 2));
        
        // Extract holdings from the response - handle the real API structure
        let holdings = [];
        const content = response.data.content || {};
        
        // Handle different types of positions returned by Mesh Connect API
        const cryptoPositions = content.cryptocurrencyPositions || [];
        const equityPositions = content.equityPositions || [];
        const nftPositions = content.nftPositions || [];
        const optionPositions = content.optionPositions || [];
        
        console.log('🔍 MESH API RESPONSE BREAKDOWN:');
        console.log('- cryptocurrencyPositions:', cryptoPositions.length);
        console.log('- equityPositions:', equityPositions.length);
        console.log('- nftPositions:', nftPositions.length);
        console.log('- optionPositions:', optionPositions.length);
        
        // Convert cryptocurrency positions to our holdings format
        cryptoPositions.forEach(position => {
          holdings.push({
            symbol: position.symbol,
            quantity: position.amount || 0,
            marketValue: position.marketValue || (position.amount * position.lastPrice) || 0,
            costBasis: position.costBasis || (position.amount * position.costBasis) || 0,
            network: 'crypto',
            accountId: `crypto_${position.symbol}`,
            type: 'cryptocurrency',
            lastPrice: position.lastPrice || 0
          });
        });
        
        // Convert equity positions to our holdings format
        equityPositions.forEach(position => {
          holdings.push({
            symbol: position.symbol,
            quantity: position.amount || 0,
            marketValue: position.marketValue || (position.amount * position.lastPrice) || 0,
            costBasis: position.costBasis || (position.amount * position.costBasis) || 0,
            network: 'equity',
            accountId: `equity_${position.symbol}`,
            type: 'equity',
            lastPrice: position.lastPrice || 0
          });
        });
        
        // Convert NFT positions to our holdings format
        nftPositions.forEach(position => {
          holdings.push({
            symbol: position.symbol || position.name || 'NFT',
            quantity: 1,
            marketValue: position.marketValue || 0,
            costBasis: position.costBasis || 0,
            network: position.network || 'nft',
            accountId: `nft_${position.id || position.symbol}`,
            type: 'nft'
          });
        });
        
        // Convert option positions to our holdings format
        optionPositions.forEach(position => {
          holdings.push({
            symbol: position.symbol,
            quantity: position.amount || 0,
            marketValue: position.marketValue || 0,
            costBasis: position.costBasis || 0,
            network: 'options',
            accountId: `option_${position.symbol}`,
            type: 'option'
          });
        });
        
                 // If no holdings found but API was successful, log the full response for debugging
         if (holdings.length === 0) {
           console.log('🔍 NO HOLDINGS FOUND - Full API response:', JSON.stringify(response.data, null, 2));
         }
        
      } catch (apiError) {
        console.error('❌ MESH HOLDINGS API ERROR:', apiError.message);
        console.error('❌ MESH HOLDINGS API ERROR - Status:', apiError.response?.status);
        console.error('❌ MESH HOLDINGS API ERROR - Data:', apiError.response?.data);
        
        // If API call fails, show demo data with a warning
        console.log('⚠️ API call failed, showing demo data');
        holdings = [
          {
            symbol: 'BTC',
            quantity: 0.05,
            marketValue: 2000.00,
            costBasis: 1900.00,
            network: 'bitcoin',
            accountId: 'demo_btc_account'
          },
          {
            symbol: 'ETH',
            quantity: 1.2,
            marketValue: 3600.00,
            costBasis: 3400.00,
            network: 'ethereum',
            accountId: 'demo_eth_account'
          },
          {
            symbol: 'USDC',
            quantity: 500.00,
            marketValue: 500.00,
            costBasis: 500.00,
            network: 'ethereum',
            accountId: 'demo_usdc_account'
          }
        ];
      }
    }
    
    console.log('✅ Holdings retrieved:', holdings.length, 'items');
    
    if (holdings.length > 0) {
      console.log('🔍 HOLDINGS SAMPLE:', holdings.slice(0, 2).map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        marketValue: h.marketValue,
        costBasis: h.costBasis,
        network: h.network,
        accountId: h.accountId
      })));
    }
    
    // Convert holdings to portfolio format
    const accounts = holdings.map(holding => ({
      id: holding.accountId || holding.symbol,
      name: holding.symbol || 'Unknown Asset',
      type: 'crypto',
      balance: holding.quantity || 0,
      currency: holding.symbol || 'Unknown',
      network: holding.network || 'unknown',
      provider: brokerType,
      marketValue: holding.marketValue || 0,
      costBasis: holding.costBasis || 0,
      pnl: (holding.marketValue || 0) - (holding.costBasis || 0)
    }));
    
    const totalValue = holdings.reduce((sum, holding) => {
      return sum + (holding.marketValue || 0);
    }, 0);
    
    const portfolio = {
      accounts,
      totalValue,
      lastUpdated: new Date().toISOString(),
      isTestData: isTestConnection
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

// Get networks (cached for performance)
let cachedNetworks = null;
let networksLastFetched = null;
const NETWORKS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getNetworks() {
  const now = Date.now();
  
  if (!cachedNetworks || !networksLastFetched || (now - networksLastFetched) > NETWORKS_CACHE_DURATION) {
    try {
      console.log('🌐 Fetching networks from Mesh API...');
      const response = await meshAPI.get('/api/v1/transfers/managed/networks');
      cachedNetworks = response.data.content.networks;
      networksLastFetched = now;
      console.log('✅ Networks cached successfully:', cachedNetworks.length);
    } catch (error) {
      console.error('❌ Failed to fetch networks:', error.response?.data || error.message);
      throw error;
    }
  }
  
  return cachedNetworks;
}

// Find Base network ID
async function getBaseNetworkId() {
  const networks = await getNetworks();
  // Look for Base network (chainId 8453)
  const baseNetwork = networks.find(n => 
    n.name.toLowerCase().includes('base') || 
    n.chainId === '8453' ||
    n.chainId === 8453
  );
  
  if (!baseNetwork) {
    console.log('⚠️ Base network not found, available networks:', networks.map(n => ({ name: n.name, chainId: n.chainId })));
    // Fallback to Ethereum if Base not found
    const ethNetwork = networks.find(n => n.chainId === '1' || n.chainId === 1);
    return ethNetwork?.id;
  }
  
  return baseNetwork.id;
}

// Execute transfer (3-step flow: configure -> preview -> execute)
app.post('/api/mesh/transfer', async (req, res) => {
  try {
    const { fromConnectionId, toAddress, amount, currency = 'USDC', network = 'base' } = req.body;
    
    console.log('🚀 Starting managed transfer process...');
    console.log('  - From Connection:', fromConnectionId);
    console.log('  - To Address:', toAddress || APP_WALLET_ADDRESS);
    console.log('  - Amount:', amount, currency);
    console.log('  - Network:', network);
    
    // Get connection data
    const connectionData = connectedAccounts.get(fromConnectionId);
    if (!connectionData) {
      return res.status(404).json({ error: 'Connection not found. Please reconnect your account.' });
    }

    // Extract access token
    const realAccessToken = connectionData.accessToken?.accountTokens?.[0]?.accessToken;
    const brokerType = connectionData.accessToken?.brokerType;
    
    if (!realAccessToken) {
      return res.status(400).json({ error: 'Invalid access token for connection' });
    }

    // Step 1: Get Base network ID
    const baseNetworkId = await getBaseNetworkId();
    if (!baseNetworkId) {
      return res.status(400).json({ error: 'Base network not supported' });
    }

    console.log('📡 Step 1: Configure transfer...');
    console.log('  - Base Network ID:', baseNetworkId);
    console.log('  - Broker Type:', brokerType);
    console.log('  - Access Token (first 20 chars):', realAccessToken.substring(0, 20) + '...');
    
    // Step 2: Configure transfer
    const configurePayload = {
      fromAuthToken: realAccessToken,  // Changed case to match docs
      fromType: brokerType,           // Changed case to match docs
      toAddresses: [{                 // Changed case to match docs
        networkId: baseNetworkId,     // Changed case to match docs
        symbol: currency,             // Changed case to match docs
        address: toAddress || APP_WALLET_ADDRESS
      }]
    };
    
    console.log('📡 Configure payload:', JSON.stringify(configurePayload, null, 2));
    
    const configureResponse = await meshAPI.post('/api/v1/transfers/managed/configure', configurePayload);

    console.log('✅ Step 1 completed: Transfer configured');
    console.log('🔍 Configure response structure:', JSON.stringify(configureResponse.data, null, 2));
    
    const holdings = configureResponse.data.content.holdings;
    
    // Find the matching asset
    const asset = holdings.find(h => h.symbol === currency);
    if (!asset) {
      return res.status(400).json({ error: `Asset ${currency} not available for transfer` });
    }

    const network_info = asset.networks.find(n => n.id === baseNetworkId);
    if (!network_info || !network_info.eligibleForTransfer) {
      return res.status(400).json({ error: `${currency} transfers not eligible on Base network` });
    }

    // Validate amount limits
    if (amount < network_info.minimumAmount || amount > network_info.maximumAmount) {
      return res.status(400).json({ 
        error: `Amount ${amount} ${currency} is outside allowed range (${network_info.minimumAmount} - ${network_info.maximumAmount})` 
      });
    }

    console.log('📡 Step 2: Preview transfer...');

    // Step 3: Preview transfer
    const previewPayload = {
      fromAuthToken: realAccessToken,    // Changed case to match docs
      fromType: brokerType,             // Changed case to match docs
      networkId: baseNetworkId,         // Changed case to match docs
      symbol: currency,                 // Changed case to match docs
      toAddress: toAddress || APP_WALLET_ADDRESS, // Changed case to match docs
      amount: amount                    // Changed case to match docs
    };
    
    console.log('📡 Preview payload:', JSON.stringify(previewPayload, null, 2));
    
    const previewResponse = await meshAPI.post('/api/v1/transfers/managed/preview', previewPayload);

    console.log('✅ Step 2 completed: Transfer previewed');
    console.log('🔍 Preview response structure:', JSON.stringify(previewResponse.data, null, 2));

    // Handle different possible response structures
    let previewResult = previewResponse.data.PreviewResult || 
                       previewResponse.data.content || 
                       previewResponse.data;
    
    console.log('🔍 Preview result structure:', JSON.stringify(previewResult, null, 2));
    
    const previewId = previewResult.PreviewId || 
                     previewResult.previewId || 
                     previewResult.id;

    if (!previewId) {
      console.error('❌ No preview ID found in response');
      return res.status(500).json({ error: 'Invalid preview response: missing preview ID' });
    }

    console.log('📡 Step 3: Execute transfer...');
    console.log('  - Preview ID:', previewId);
    console.log('  - Expires in:', previewResult.ExpiresIn || previewResult.expiresIn || 'unknown', 'seconds');

    // Step 4: Execute transfer
    const executeResponse = await meshAPI.post('/api/v1/transfers/managed/execute', {
      fromAuthToken: realAccessToken,
      fromType: brokerType,
      previewId: previewId
      // Note: mfaCode would be included here if required
    });

    console.log('✅ Step 3 completed: Transfer executed successfully!');
    console.log('🔍 Execute response structure:', JSON.stringify(executeResponse.data, null, 2));

    // Handle different possible response structures
    const transferResult = executeResponse.data.TransferResult || 
                          executeResponse.data.content || 
                          executeResponse.data;
    
    console.log('🔍 Transfer result structure:', JSON.stringify(transferResult, null, 2));
    
    res.json({
      transfer: {
        id: transferResult.TransferId || transferResult.transferId || transferResult.id,
        fromAccount: fromConnectionId,
        toAccount: transferResult.ToAddress || transferResult.toAddress || (toAddress || APP_WALLET_ADDRESS),
        amount: transferResult.Amount || transferResult.amount || amount,
        currency: transferResult.Symbol || transferResult.symbol || currency,
        network: transferResult.NetworkName || transferResult.networkName || 'Base',
        status: (transferResult.Status || transferResult.status || 'pending').toLowerCase(),
        timestamp: new Date().toISOString(),
        hash: transferResult.Hash || transferResult.hash || transferResult.txHash,
        networkId: transferResult.NetworkId || transferResult.networkId || baseNetworkId,
        fees: {
          network: transferResult.NetworkGasFee || transferResult.networkGasFee,
          institution: transferResult.InstitutionTransferFee || transferResult.institutionTransferFee,
          total: transferResult.TotalTrasferFeeFiat || transferResult.totalTransferFeeFiat
        }
      }
    });

  } catch (error) {
    console.error('❌ Error executing managed transfer:', error.response?.data || error.message);
    console.error('❌ Full error response:', JSON.stringify(error.response?.data, null, 2));
    
    let errorMessage = 'Failed to execute transfer';
    if (error.response?.data?.ErrorMessage) {
      errorMessage = error.response.data.ErrorMessage;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ error: errorMessage });
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
    
    // If this is a Coinbase connection, immediately get USDC balance
    if (accessToken?.brokerType === 'coinbase' || accessToken?.brokerName?.toLowerCase().includes('coinbase')) {
      console.log('💰 COINBASE CONNECTION DETECTED - Getting USDC balance immediately...');
      
      try {
        // Get USDC balance right after connection
        const realAccessToken = accessToken?.accountTokens?.[0]?.accessToken;
        
        if (realAccessToken) {
          const holdingsResponse = await meshAPI.post('/api/v1/holdings/get', {
            authToken: realAccessToken,
            type: 'coinbase',
            includeMarketValue: true
          });
          
          const cryptoPositions = holdingsResponse.data.content?.cryptocurrencyPositions || [];
          
          console.log('🪙 COINBASE CONNECTION - TOTAL CRYPTOCURRENCY POSITIONS:', cryptoPositions.length);
          console.log('🪙 COINBASE CONNECTION - CRYPTOCURRENCYPOSITIONS BALANCES:');
          
          // Process and display all cryptocurrency positions
          let totalCryptoValue = 0;
          let totalUSDC = 0;
          
          cryptoPositions.forEach((position, index) => {
            const symbol = position.symbol?.trim() || 'UNKNOWN';
            const name = position.name?.trim() || position.symbol || 'Unknown';
            const amount = parseFloat(position.amount || 0);
            const marketValue = parseFloat(position.marketValue || 0);
            const lastPrice = parseFloat(position.lastPrice || 0);
            const costBasis = parseFloat(position.costBasis || 0);
            
            totalCryptoValue += marketValue;
            
            // Check if this is USDC for special tracking
            const isUSDC = symbol.toUpperCase() === 'USDC' || name.toUpperCase().includes('USD COIN');
            if (isUSDC) {
              totalUSDC += amount;
            }
            
            // Log each position clearly
            console.log(`  ${index + 1}. ${symbol} (${name})`);
            console.log(`     Amount: ${amount.toFixed(6)} ${symbol}`);
            console.log(`     Market Value: $${marketValue.toFixed(2)}`);
            console.log(`     Last Price: $${lastPrice.toFixed(2)}`);
            console.log(`     Cost Basis: $${costBasis.toFixed(2)}`);
            console.log(`     P&L: $${(marketValue - costBasis).toFixed(2)}`);
            console.log(`     Network: ${position.network || 'N/A'}`);
            console.log(`     ---`);
          });
          
          console.log('🪙 COINBASE CONNECTION - PORTFOLIO SUMMARY:');
          console.log(`     Total Crypto Value: $${totalCryptoValue.toFixed(2)}`);
          console.log(`     Total USDC Balance: ${totalUSDC.toFixed(2)} USDC`);
          console.log(`     Total Crypto Positions: ${cryptoPositions.length}`);
          
        }
      } catch (balanceError) {
        console.error('❌ Error getting USDC balance after Coinbase connection:', balanceError.message);
      }
    }
    
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

// Get USDC balance specifically
app.post('/api/mesh/usdc-balance', async (req, res) => {
  try {
    const { connectionId } = req.body;
    
    console.log('💰 USDC BALANCE REQUEST - connectionId:', connectionId);
    
    // Check if we have this connection stored
    const connectionData = connectedAccounts.get(connectionId);
    
    if (!connectionData) {
      console.log('⚠️ Connection not found for USDC balance request');
      return res.status(404).json({ error: 'Connection not found. Please reconnect your account.' });
    }
    
    // Extract the access token
    const realAccessToken = connectionData.accessToken?.accountTokens?.[0]?.accessToken;
    const brokerType = connectionData.accessToken?.brokerType;
    const brokerName = connectionData.accessToken?.brokerName;
    
    console.log('💰 USDC BALANCE - brokerType:', brokerType, 'brokerName:', brokerName);
    console.log('💰 USDC BALANCE - isCoinbase:', brokerType === 'coinbase' || brokerName?.toLowerCase().includes('coinbase'));
    
    if (!realAccessToken) {
      console.log('⚠️ No access token found for USDC balance');
      return res.status(400).json({ error: 'No access token found' });
    }
    
    try {
      console.log('💰 CALLING MESH API FOR USDC BALANCE...');
      
      // Make the API call to Mesh Connect
      const response = await meshAPI.post('/api/v1/holdings/get', {
        authToken: realAccessToken,
        type: brokerType,
        includeMarketValue: true
      });
      
      console.log('💰 MESH API RESPONSE STATUS:', response.status);
      
      // Extract USDC positions from the response
      const content = response.data.content || {};
      const cryptoPositions = content.cryptocurrencyPositions || [];
      
      console.log('💰 TOTAL CRYPTO POSITIONS:', cryptoPositions.length);
      
      // Enhanced USDC filtering for Coinbase - include all possible variations
      const usdcVariations = [
        'USDC', 'USD COIN', 'USD-C', 'USDCOIN', 'USD_COIN',
        'usdc', 'usd coin', 'usd-c', 'usdcoin', 'usd_coin'
      ];
      
      const usdcPositions = cryptoPositions.filter(position => {
        const symbol = position.symbol?.trim();
        const name = position.name?.trim() || '';
        
        // Check if symbol matches any USDC variation
        const symbolMatch = usdcVariations.some(variation => 
          symbol?.toUpperCase() === variation.toUpperCase()
        );
        
        // Check if name contains USDC variations
        const nameMatch = usdcVariations.some(variation => 
          name?.toUpperCase().includes(variation.toUpperCase())
        );
        
        return symbolMatch || nameMatch;
      });
      
      console.log('💰 USDC POSITIONS FOUND:', usdcPositions.length);
      
      // Log all crypto positions for debugging (especially for Coinbase)
      if (brokerType === 'coinbase' || brokerName?.toLowerCase().includes('coinbase')) {
        console.log('💰 COINBASE - ALL CRYPTO POSITIONS:');
        cryptoPositions.forEach((position, index) => {
          console.log(`  ${index + 1}. Symbol: "${position.symbol}", Name: "${position.name || 'N/A'}", Amount: ${position.amount}, MarketValue: ${position.marketValue}`);
        });
      }
      
      if (usdcPositions.length > 0) {
        console.log('💰 USDC POSITIONS DETAILS:', JSON.stringify(usdcPositions, null, 2));
      }
      
      // Calculate total USDC balance
      let totalUSDC = 0;
      const usdcDetails = [];
      
      usdcPositions.forEach(position => {
        const amount = parseFloat(position.amount || 0);
        const marketValue = parseFloat(position.marketValue || amount); // Use amount if no marketValue
        const lastPrice = parseFloat(position.lastPrice || 1); // USDC should be ~$1
        
        totalUSDC += amount;
        
        usdcDetails.push({
          symbol: position.symbol,
          name: position.name || position.symbol,
          amount: amount,
          marketValue: marketValue,
          lastPrice: lastPrice,
          network: position.network || 'unknown',
          accountId: position.accountId || 'unknown'
        });
        
        console.log(`💰 USDC FOUND: ${position.symbol} - Amount: ${amount}, MarketValue: ${marketValue}`);
      });
      
      console.log('💰 TOTAL USDC CALCULATED:', totalUSDC);
      console.log('💰 TOTAL USDC VALUE: $', totalUSDC.toFixed(2));
      
      // If no USDC found, list all available cryptocurrencies with more details
      if (usdcPositions.length === 0) {
        const allCryptos = cryptoPositions.map(p => ({
          symbol: p.symbol,
          name: p.name || 'N/A',
          amount: p.amount,
          marketValue: p.marketValue
        }));
        console.log('💰 ALL AVAILABLE CRYPTOCURRENCIES:', JSON.stringify(allCryptos, null, 2));
        console.log('💰 LOOKING FOR USDC-LIKE SYMBOLS...');
        
        // Look for any symbol that might be USDC-related
        const potentialUSDC = cryptoPositions.filter(p => 
          p.symbol?.toUpperCase().includes('USD') || 
          p.name?.toUpperCase().includes('USD') ||
          p.symbol?.toUpperCase().includes('STABLE') ||
          p.name?.toUpperCase().includes('STABLE')
        );
        
        if (potentialUSDC.length > 0) {
          console.log('💰 POTENTIAL USD-RELATED POSITIONS:', JSON.stringify(potentialUSDC, null, 2));
        }
      }
      
      res.json({
        success: true,
        connectionId,
        brokerType,
        brokerName,
        usdc: {
          totalBalance: totalUSDC,
          totalValue: totalUSDC,
          formattedValue: `$${totalUSDC.toFixed(2)}`,
          positions: usdcDetails,
          positionsCount: usdcPositions.length
        },
        allCryptos: cryptoPositions.map(p => ({
          symbol: p.symbol,
          name: p.name || 'N/A',
          amount: p.amount,
          marketValue: p.marketValue,
          formattedValue: `$${(p.marketValue || 0).toFixed(2)}`
        })),
        timestamp: new Date().toISOString()
      });
      
    } catch (apiError) {
      console.error('❌ MESH API ERROR FOR USDC:', apiError.message);
      console.error('❌ MESH API ERROR DETAILS:', apiError.response?.data || apiError);
      
      res.status(500).json({
        error: 'Failed to get USDC balance from Mesh API',
        message: apiError.message,
        details: apiError.response?.data || null
      });
    }
    
  } catch (error) {
    console.error('❌ USDC BALANCE ERROR:', error);
    res.status(500).json({ error: 'Failed to get USDC balance' });
  }
});

// Get USDC balance from the most recent Coinbase connection
app.get('/api/mesh/coinbase-usdc', async (req, res) => {
  try {
    console.log('💰 COINBASE USDC REQUEST - Looking for Coinbase connections...');
    
    // Find the most recent Coinbase connection
    let coinbaseConnection = null;
    let mostRecentTime = 0;
    
    for (const [connectionId, connectionData] of connectedAccounts.entries()) {
      const brokerType = connectionData.accessToken?.brokerType;
      const brokerName = connectionData.accessToken?.brokerName;
      const isCoinbase = brokerType === 'coinbase' || brokerName?.toLowerCase().includes('coinbase');
      
      if (isCoinbase) {
        const connectedTime = new Date(connectionData.connectedAt).getTime();
        if (connectedTime > mostRecentTime) {
          mostRecentTime = connectedTime;
          coinbaseConnection = { connectionId, ...connectionData };
        }
      }
    }
    
    if (!coinbaseConnection) {
      console.log('⚠️ No Coinbase connections found');
      return res.status(404).json({ error: 'No Coinbase connection found. Please connect your Coinbase account first.' });
    }
    
    console.log('💰 COINBASE USDC - Using connection:', coinbaseConnection.connectionId);
    
    // Get USDC balance using the found connection
    const realAccessToken = coinbaseConnection.accessToken?.accountTokens?.[0]?.accessToken;
    
    if (!realAccessToken) {
      console.log('⚠️ No access token found for Coinbase connection');
      return res.status(400).json({ error: 'No access token found for Coinbase connection' });
    }
    
    try {
      console.log('💰 GETTING COINBASE USDC BALANCE...');
      
      // Make the API call to Mesh Connect
      const response = await meshAPI.post('/api/v1/holdings/get', {
        authToken: realAccessToken,
        type: 'coinbase',
        includeMarketValue: true
      });
      
      const cryptoPositions = response.data.content?.cryptocurrencyPositions || [];
      
      // Enhanced USDC filtering for Coinbase
      const usdcVariations = [
        'USDC', 'USD COIN', 'USD-C', 'USDCOIN', 'USD_COIN',
        'usdc', 'usd coin', 'usd-c', 'usdcoin', 'usd_coin'
      ];
      
      const usdcPositions = cryptoPositions.filter(position => {
        const symbol = position.symbol?.trim();
        const name = position.name?.trim() || '';
        
        const symbolMatch = usdcVariations.some(variation => 
          symbol?.toUpperCase() === variation.toUpperCase()
        );
        
        const nameMatch = usdcVariations.some(variation => 
          name?.toUpperCase().includes(variation.toUpperCase())
        );
        
        return symbolMatch || nameMatch;
      });
      
      // Calculate total USDC balance
      let totalUSDC = 0;
      const usdcDetails = [];
      
      usdcPositions.forEach(position => {
        const amount = parseFloat(position.amount || 0);
        const marketValue = parseFloat(position.marketValue || amount);
        
        totalUSDC += amount;
        
        usdcDetails.push({
          symbol: position.symbol,
          name: position.name || position.symbol,
          amount: amount,
          marketValue: marketValue,
          formattedAmount: `${amount.toFixed(2)} USDC`,
          formattedValue: `$${marketValue.toFixed(2)}`,
          network: position.network || 'unknown'
        });
      });
      
      console.log('💰 COINBASE USDC BALANCE:', totalUSDC);
      console.log('💰 COINBASE USDC VALUE: $', totalUSDC.toFixed(2));
      
      res.json({
        success: true,
        connectionId: coinbaseConnection.connectionId,
        brokerType: 'coinbase',
        usdc: {
          totalBalance: totalUSDC,
          totalValue: totalUSDC,
          formattedBalance: `${totalUSDC.toFixed(2)} USDC`,
          formattedValue: `$${totalUSDC.toFixed(2)}`,
          positions: usdcDetails,
          positionsCount: usdcPositions.length
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (apiError) {
      console.error('❌ COINBASE USDC API ERROR:', apiError.message);
      res.status(500).json({
        error: 'Failed to get USDC balance from Coinbase',
        message: apiError.message
      });
    }
    
  } catch (error) {
    console.error('❌ COINBASE USDC ERROR:', error);
    res.status(500).json({ error: 'Failed to get Coinbase USDC balance' });
  }
});

// Get cryptocurrency balances for any connected account
app.post('/api/mesh/crypto-balances', async (req, res) => {
  try {
    const { connectionId } = req.body;
    
    console.log('🪙 CRYPTO BALANCES REQUEST - connectionId:', connectionId);
    
    // Check if we have this connection stored
    const connectionData = connectedAccounts.get(connectionId);
    
    if (!connectionData) {
      console.log('⚠️ Connection not found for crypto balances request');
      return res.status(404).json({ error: 'Connection not found. Please reconnect your account.' });
    }
    
    // Extract the access token and broker info
    const realAccessToken = connectionData.accessToken?.accountTokens?.[0]?.accessToken;
    const brokerType = connectionData.accessToken?.brokerType;
    const brokerName = connectionData.accessToken?.brokerName;
    
    console.log('🪙 CRYPTO BALANCES - brokerType:', brokerType, 'brokerName:', brokerName);
    
    if (!realAccessToken) {
      console.log('⚠️ No access token found for crypto balances');
      return res.status(400).json({ error: 'No access token found' });
    }
    
    try {
      console.log('🪙 GETTING CRYPTO BALANCES FOR', brokerType, '...');
      
      // Make the API call to Mesh Connect
      const response = await meshAPI.post('/api/v1/holdings/get', {
        authToken: realAccessToken,
        type: brokerType,
        includeMarketValue: true
      });
      
      console.log('🪙 MESH API RESPONSE STATUS:', response.status);
      
      // Extract cryptocurrency positions from the response
      const content = response.data.content || {};
      const cryptoPositions = content.cryptocurrencyPositions || [];
      
      console.log('🪙 TOTAL CRYPTOCURRENCY POSITIONS FOUND:', cryptoPositions.length);
      console.log('🪙 CRYPTOCURRENCYPOSITIONS CONTENT FOR', brokerType, ':');
      
      // Process all cryptocurrency positions
      let totalCryptoValue = 0;
      const cryptoBalances = [];
      
      cryptoPositions.forEach((position, index) => {
        const symbol = position.symbol?.trim() || 'UNKNOWN';
        const name = position.name?.trim() || position.symbol || 'Unknown';
        const amount = parseFloat(position.amount || 0);
        const marketValue = parseFloat(position.marketValue || 0);
        const lastPrice = parseFloat(position.lastPrice || 0);
        const costBasis = parseFloat(position.costBasis || 0);
        
        totalCryptoValue += marketValue;
        
        // Log each position clearly
        console.log(`  ${index + 1}. ${symbol} (${name})`);
        console.log(`     Amount: ${amount}`);
        console.log(`     Market Value: $${marketValue.toFixed(2)}`);
        console.log(`     Last Price: $${lastPrice.toFixed(2)}`);
        console.log(`     Cost Basis: $${costBasis.toFixed(2)}`);
        console.log(`     P&L: $${(marketValue - costBasis).toFixed(2)}`);
        console.log(`     Network: ${position.network || 'N/A'}`);
        console.log(`     ---`);
        
        cryptoBalances.push({
          symbol: symbol,
          name: name,
          amount: amount,
          marketValue: marketValue,
          lastPrice: lastPrice,
          costBasis: costBasis,
          pnl: marketValue - costBasis,
          network: position.network || 'unknown',
          accountId: position.accountId || 'unknown',
          // Formatted values for display
          formattedAmount: `${amount.toFixed(6)} ${symbol}`,
          formattedValue: `$${marketValue.toFixed(2)}`,
          formattedPrice: `$${lastPrice.toFixed(2)}`,
          formattedPnL: `$${(marketValue - costBasis).toFixed(2)}`,
          // Additional data from API
          rawPosition: position
        });
      });
      
      console.log('🪙 TOTAL CRYPTO PORTFOLIO VALUE: $', totalCryptoValue.toFixed(2));
      console.log('🪙 TOTAL CRYPTO POSITIONS COUNT:', cryptoBalances.length);
      
      // Also log any other types of positions for reference
      const equityPositions = content.equityPositions || [];
      const nftPositions = content.nftPositions || [];
      const optionPositions = content.optionPositions || [];
      
      console.log('📊 PORTFOLIO BREAKDOWN:');
      console.log(`  - Cryptocurrency Positions: ${cryptoPositions.length}`);
      console.log(`  - Equity Positions: ${equityPositions.length}`);
      console.log(`  - NFT Positions: ${nftPositions.length}`);
      console.log(`  - Option Positions: ${optionPositions.length}`);
      
      // If no crypto positions found, show the full response structure
      if (cryptoPositions.length === 0) {
        console.log('🪙 NO CRYPTO POSITIONS FOUND - Full response structure:');
        console.log(JSON.stringify(response.data, null, 2));
      }
      
      res.json({
        success: true,
        connectionId: connectionId,
        brokerType: brokerType,
        brokerName: brokerName,
        summary: {
          totalCryptoValue: totalCryptoValue,
          totalPositions: cryptoBalances.length,
          formattedTotalValue: `$${totalCryptoValue.toFixed(2)}`
        },
        cryptocurrencyPositions: cryptoBalances,
        otherPositions: {
          equityCount: equityPositions.length,
          nftCount: nftPositions.length,
          optionCount: optionPositions.length
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (apiError) {
      console.error('❌ CRYPTO BALANCES API ERROR:', apiError.message);
      console.error('❌ CRYPTO BALANCES API DETAILS:', apiError.response?.data || apiError);
      
      res.status(500).json({
        error: 'Failed to get cryptocurrency balances',
        message: apiError.message,
        details: apiError.response?.data || null
      });
    }
    
  } catch (error) {
    console.error('❌ CRYPTO BALANCES ERROR:', error);
    res.status(500).json({ error: 'Failed to get cryptocurrency balances' });
  }
});

// Get all cryptocurrency balances from Coinbase
app.get('/api/mesh/coinbase-crypto-balances', async (req, res) => {
  try {
    console.log('🪙 COINBASE CRYPTO BALANCES REQUEST - Looking for Coinbase connections...');
    
    // Find the most recent Coinbase connection
    let coinbaseConnection = null;
    let mostRecentTime = 0;
    
    for (const [connectionId, connectionData] of connectedAccounts.entries()) {
      const brokerType = connectionData.accessToken?.brokerType;
      const brokerName = connectionData.accessToken?.brokerName;
      const isCoinbase = brokerType === 'coinbase' || brokerName?.toLowerCase().includes('coinbase');
      
      if (isCoinbase) {
        const connectedTime = new Date(connectionData.connectedAt).getTime();
        if (connectedTime > mostRecentTime) {
          mostRecentTime = connectedTime;
          coinbaseConnection = { connectionId, ...connectionData };
        }
      }
    }
    
    if (!coinbaseConnection) {
      console.log('⚠️ No Coinbase connections found');
      return res.status(404).json({ error: 'No Coinbase connection found. Please connect your Coinbase account first.' });
    }
    
    console.log('🪙 COINBASE CRYPTO BALANCES - Using connection:', coinbaseConnection.connectionId);
    
    // Get crypto balances using the found connection
    const realAccessToken = coinbaseConnection.accessToken?.accountTokens?.[0]?.accessToken;
    
    if (!realAccessToken) {
      console.log('⚠️ No access token found for Coinbase connection');
      return res.status(400).json({ error: 'No access token found for Coinbase connection' });
    }
    
    try {
      console.log('🪙 GETTING ALL COINBASE CRYPTO BALANCES...');
      
      // Make the API call to Mesh Connect
      const response = await meshAPI.post('/api/v1/holdings/get', {
        authToken: realAccessToken,
        type: 'coinbase',
        includeMarketValue: true
      });
      
      console.log('🪙 MESH API RESPONSE STATUS:', response.status);
      
      // Extract cryptocurrency positions from the response
      const content = response.data.content || {};
      const cryptoPositions = content.cryptocurrencyPositions || [];
      
      console.log('🪙 TOTAL CRYPTOCURRENCY POSITIONS FOUND:', cryptoPositions.length);
      console.log('🪙 CRYPTOCURRENCYPOSITIONS CONTENT:');
      
      // Process all cryptocurrency positions
      let totalCryptoValue = 0;
      const cryptoBalances = [];
      
      cryptoPositions.forEach((position, index) => {
        const symbol = position.symbol?.trim() || 'UNKNOWN';
        const name = position.name?.trim() || position.symbol || 'Unknown';
        const amount = parseFloat(position.amount || 0);
        const marketValue = parseFloat(position.marketValue || 0);
        const lastPrice = parseFloat(position.lastPrice || 0);
        const costBasis = parseFloat(position.costBasis || 0);
        
        totalCryptoValue += marketValue;
        
        // Log each position clearly
        console.log(`  ${index + 1}. ${symbol} (${name})`);
        console.log(`     Amount: ${amount}`);
        console.log(`     Market Value: $${marketValue.toFixed(2)}`);
        console.log(`     Last Price: $${lastPrice.toFixed(2)}`);
        console.log(`     Cost Basis: $${costBasis.toFixed(2)}`);
        console.log(`     P&L: $${(marketValue - costBasis).toFixed(2)}`);
        console.log(`     Network: ${position.network || 'N/A'}`);
        console.log(`     ---`);
        
        cryptoBalances.push({
          symbol: symbol,
          name: name,
          amount: amount,
          marketValue: marketValue,
          lastPrice: lastPrice,
          costBasis: costBasis,
          pnl: marketValue - costBasis,
          network: position.network || 'unknown',
          accountId: position.accountId || 'unknown',
          // Formatted values for display
          formattedAmount: `${amount.toFixed(6)} ${symbol}`,
          formattedValue: `$${marketValue.toFixed(2)}`,
          formattedPrice: `$${lastPrice.toFixed(2)}`,
          formattedPnL: `$${(marketValue - costBasis).toFixed(2)}`,
          // Additional data from API
          rawPosition: position
        });
      });
      
      console.log('🪙 TOTAL CRYPTO PORTFOLIO VALUE: $', totalCryptoValue.toFixed(2));
      console.log('🪙 TOTAL CRYPTO POSITIONS COUNT:', cryptoBalances.length);
      
      // Also log any other types of positions for reference
      const equityPositions = content.equityPositions || [];
      const nftPositions = content.nftPositions || [];
      const optionPositions = content.optionPositions || [];
      
      console.log('📊 PORTFOLIO BREAKDOWN:');
      console.log(`  - Cryptocurrency Positions: ${cryptoPositions.length}`);
      console.log(`  - Equity Positions: ${equityPositions.length}`);
      console.log(`  - NFT Positions: ${nftPositions.length}`);
      console.log(`  - Option Positions: ${optionPositions.length}`);
      
      // If no crypto positions found, show the full response structure
      if (cryptoPositions.length === 0) {
        console.log('🪙 NO CRYPTO POSITIONS FOUND - Full response structure:');
        console.log(JSON.stringify(response.data, null, 2));
      }
      
      res.json({
        success: true,
        connectionId: coinbaseConnection.connectionId,
        brokerType: 'coinbase',
        summary: {
          totalCryptoValue: totalCryptoValue,
          totalPositions: cryptoBalances.length,
          formattedTotalValue: `$${totalCryptoValue.toFixed(2)}`
        },
        cryptocurrencyPositions: cryptoBalances,
        otherPositions: {
          equityCount: equityPositions.length,
          nftCount: nftPositions.length,
          optionCount: optionPositions.length
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (apiError) {
      console.error('❌ COINBASE CRYPTO BALANCES API ERROR:', apiError.message);
      console.error('❌ COINBASE CRYPTO BALANCES API DETAILS:', apiError.response?.data || apiError);
      
      res.status(500).json({
        error: 'Failed to get cryptocurrency balances from Coinbase',
        message: apiError.message,
        details: apiError.response?.data || null
      });
    }
    
  } catch (error) {
    console.error('❌ COINBASE CRYPTO BALANCES ERROR:', error);
    res.status(500).json({ error: 'Failed to get Coinbase cryptocurrency balances' });
  }
});

// Get complete account information using multiple Mesh Connect endpoints
app.get('/api/mesh/coinbase-complete-balance', async (req, res) => {
  try {
    console.log('💎 COINBASE COMPLETE BALANCE REQUEST - Looking for Coinbase connections...');
    
    // Find the most recent Coinbase connection
    let coinbaseConnection = null;
    let mostRecentTime = 0;
    
    for (const [connectionId, connectionData] of connectedAccounts.entries()) {
      const brokerType = connectionData.accessToken?.brokerType;
      const brokerName = connectionData.accessToken?.brokerName;
      const isCoinbase = brokerType === 'coinbase' || brokerName?.toLowerCase().includes('coinbase');
      
      if (isCoinbase) {
        const connectedTime = new Date(connectionData.connectedAt).getTime();
        if (connectedTime > mostRecentTime) {
          mostRecentTime = connectedTime;
          coinbaseConnection = { connectionId, ...connectionData };
        }
      }
    }
    
    if (!coinbaseConnection) {
      console.log('⚠️ No Coinbase connections found');
      return res.status(404).json({ error: 'No Coinbase connection found. Please connect your Coinbase account first.' });
    }
    
    console.log('💎 COINBASE COMPLETE BALANCE - Using connection:', coinbaseConnection.connectionId);
    
    const realAccessToken = coinbaseConnection.accessToken?.accountTokens?.[0]?.accessToken;
    
    if (!realAccessToken) {
      console.log('⚠️ No access token found for Coinbase connection');
      return res.status(400).json({ error: 'No access token found for Coinbase connection' });
    }
    
    try {
      console.log('💎 CALLING MULTIPLE MESH CONNECT ENDPOINTS...');
      
      // Call all relevant endpoints in parallel
      const [holdingsResponse, balanceResponse, holdingsValueResponse] = await Promise.allSettled([
        // 1. Get Holdings - detailed cryptocurrency positions
        meshAPI.post('/api/v1/holdings/get', {
          authToken: realAccessToken,
          type: 'coinbase',
          includeMarketValue: true
        }),
        
        // 2. Get Balance - account balance (cash, buying power, etc.)
        meshAPI.post('/api/v1/balance/get', {
          authToken: realAccessToken,
          type: 'coinbase'
        }),
        
        // 3. Get Holdings Value - portfolio performance and totals
        meshAPI.post('/api/v1/holdings/value', {
          authToken: realAccessToken,
          type: 'coinbase'
        })
      ]);
      
      console.log('💎 ENDPOINTS RESULTS:');
      console.log(`  - Holdings: ${holdingsResponse.status}`);
      console.log(`  - Balance: ${balanceResponse.status}`);
      console.log(`  - Holdings Value: ${holdingsValueResponse.status}`);
      
      const results = {
        success: true,
        connectionId: coinbaseConnection.connectionId,
        brokerType: 'coinbase',
        timestamp: new Date().toISOString()
      };
      
      // Process Holdings response (cryptocurrencyPositions)
      if (holdingsResponse.status === 'fulfilled') {
        const holdingsData = holdingsResponse.value.data;
        const cryptoPositions = holdingsData.content?.cryptocurrencyPositions || [];
        
        console.log('🪙 HOLDINGS ENDPOINT - CRYPTOCURRENCYPOSITIONS:');
        console.log(`  Total positions: ${cryptoPositions.length}`);
        
        let totalCryptoValue = 0;
        const processedCrypto = [];
        
        cryptoPositions.forEach((position, index) => {
          const symbol = position.symbol?.trim() || 'UNKNOWN';
          const name = position.name?.trim() || position.symbol || 'Unknown';
          const amount = parseFloat(position.amount || 0);
          const marketValue = parseFloat(position.marketValue || 0);
          const lastPrice = parseFloat(position.lastPrice || 0);
          const costBasis = parseFloat(position.costBasis || 0);
          
          totalCryptoValue += marketValue;
          
          console.log(`  ${index + 1}. ${symbol} (${name}): ${amount.toFixed(6)} = $${marketValue.toFixed(2)}`);
          
          processedCrypto.push({
            symbol, name, amount, marketValue, lastPrice, costBasis,
            pnl: marketValue - costBasis,
            formattedAmount: `${amount.toFixed(6)} ${symbol}`,
            formattedValue: `$${marketValue.toFixed(2)}`
          });
        });
        
        results.holdings = {
          cryptocurrencyPositions: processedCrypto,
          totalCryptoValue: totalCryptoValue,
          formattedTotalValue: `$${totalCryptoValue.toFixed(2)}`,
          rawData: holdingsData
        };
      } else {
        console.log('❌ Holdings endpoint failed:', holdingsResponse.reason?.message);
        results.holdings = { error: holdingsResponse.reason?.message || 'Failed to get holdings' };
      }
      
      // Process Balance response (cash, buying power, etc.)
      if (balanceResponse.status === 'fulfilled') {
        const balanceData = balanceResponse.value.data;
        console.log('💰 BALANCE ENDPOINT RESPONSE:');
        console.log(JSON.stringify(balanceData, null, 2));
        
        results.balance = {
          rawData: balanceData,
          content: balanceData.content || {}
        };
      } else {
        console.log('❌ Balance endpoint failed:', balanceResponse.reason?.message);
        results.balance = { error: balanceResponse.reason?.message || 'Failed to get balance' };
      }
      
      // Process Holdings Value response (portfolio performance)
      if (holdingsValueResponse.status === 'fulfilled') {
        const holdingsValueData = holdingsValueResponse.value.data;
        console.log('📊 HOLDINGS VALUE ENDPOINT RESPONSE:');
        console.log(JSON.stringify(holdingsValueData, null, 2));
        
        results.holdingsValue = {
          rawData: holdingsValueData,
          content: holdingsValueData.content || {}
        };
      } else {
        console.log('❌ Holdings Value endpoint failed:', holdingsValueResponse.reason?.message);
        results.holdingsValue = { error: holdingsValueResponse.reason?.message || 'Failed to get holdings value' };
      }
      
      console.log('💎 COMPLETE BALANCE SUMMARY:');
      console.log(`  Total Crypto Value: ${results.holdings?.formattedTotalValue || 'N/A'}`);
      console.log(`  Total Crypto Positions: ${results.holdings?.cryptocurrencyPositions?.length || 0}`);
      
      res.json(results);
      
    } catch (apiError) {
      console.error('❌ COINBASE COMPLETE BALANCE API ERROR:', apiError.message);
      res.status(500).json({
        error: 'Failed to get complete balance from Coinbase',
        message: apiError.message,
        details: apiError.response?.data || null
      });
    }
    
  } catch (error) {
    console.error('❌ COINBASE COMPLETE BALANCE ERROR:', error);
    res.status(500).json({ error: 'Failed to get Coinbase complete balance' });
  }
});

// Debug endpoint to test UI with mock crypto balances
app.get('/api/debug/mock-crypto-balances', (req, res) => {
  try {
    const mockData = {
      success: true,
      connectionId: 'mock_coinbase_connection',
      brokerType: 'coinbase',
      brokerName: 'Coinbase',
      summary: {
        totalCryptoValue: 12.21,
        totalPositions: 1,
        formattedTotalValue: '$12.21'
      },
      cryptocurrencyPositions: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          amount: 12.21,
          marketValue: 12.21,
          lastPrice: 1.00,
          costBasis: 12.21,
          pnl: 0.00,
          network: 'ethereum',
          accountId: 'usdc_account_1',
          formattedAmount: '12.210000 USDC',
          formattedValue: '$12.21',
          formattedPrice: '$1.00',
          formattedPnL: '$0.00',
          rawPosition: {}
        }
      ],
      otherPositions: {
        equityCount: 0,
        nftCount: 0,
        optionCount: 0
      },
      timestamp: new Date().toISOString()
    };

    console.log('🧪 MOCK CRYPTO BALANCES - Returning test data');
    res.json(mockData);
  } catch (error) {
    console.error('❌ Mock crypto balances error:', error);
    res.status(500).json({ error: 'Failed to get mock crypto balances' });
  }
});

// Debug endpoint to test UI with mock USDC balance
app.get('/api/debug/mock-usdc-balance', (req, res) => {
  try {
    const mockData = {
      success: true,
      connectionId: 'mock_coinbase_connection',
      brokerType: 'coinbase',
      brokerName: 'Coinbase',
      usdc: {
        totalBalance: 12.21,
        totalValue: 12.21,
        formattedBalance: '12.21 USDC',
        formattedValue: '$12.21',
        positions: [
          {
            symbol: 'USDC',
            name: 'USD Coin',
            amount: 12.21,
            marketValue: 12.21,
            formattedAmount: '12.21 USDC',
            formattedValue: '$12.21',
            network: 'ethereum'
          }
        ],
        positionsCount: 1
      },
      timestamp: new Date().toISOString()
    };

    console.log('🧪 MOCK USDC BALANCE - Returning test data');
    res.json(mockData);
  } catch (error) {
    console.error('❌ Mock USDC balance error:', error);
    res.status(500).json({ error: 'Failed to get mock USDC balance' });
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