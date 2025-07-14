const request = require('supertest');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock del servidor
let app;

// Mock data
const mockLinkToken = 'test_link_token_123';
const mockAccounts = [
  {
    accountId: '1',
    accountName: 'Test Account',
    accountType: 'crypto',
    balance: 100.5,
    currency: 'USDC',
    network: 'base',
    brokerType: 'coinbase'
  }
];

const mockHoldings = [
  {
    accountId: '1',
    symbol: 'USDC',
    quantity: 100.5,
    price: 1.0,
    network: 'base',
    brokerType: 'coinbase'
  }
];

const mockTransfer = {
  transferId: 'transfer_1',
  fromAddress: 'account_1',
  toAddress: '0x1234567890123456789012345678901234567890',
  amount: 1,
  symbol: 'USDC',
  network: 'base',
  status: 'completed',
  createdAt: '2023-01-01T00:00:00Z'
};

// Crear una versión modificada del servidor para testing
function createTestApp() {
  const express = require('express');
  const cors = require('cors');
  
  const testApp = express();
  
  // Middleware
  testApp.use(cors());
  testApp.use(express.json());
  
  // Crear mock del mesh API
  const mockMeshAPI = {
    get: jest.fn(),
    post: jest.fn(),
  };
  
  mockedAxios.create.mockReturnValue(mockMeshAPI);
  
  // Health check endpoint
  testApp.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
  });

  // Endpoints de Mesh (copiados del servidor principal pero sin listen)
  testApp.get('/api/mesh/link-token', async (req, res) => {
    try {
      const response = await mockMeshAPI.post('/api/v1/linktoken', {
        userId: 'user_' + Date.now(),
        brokerType: 'coinbase',
      });
      
      res.json({ linkToken: response.data.content.linkToken });
    } catch (error) {
      console.error('Error generating link token:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to generate link token' });
    }
  });

  testApp.get('/api/mesh/link-token-wallet', async (req, res) => {
    try {
      const response = await mockMeshAPI.post('/api/v1/linktoken', {
        userId: 'user_wallet_' + Date.now(),
        brokerType: 'metamask',
      });
      
      res.json({ linkToken: response.data.content.linkToken });
    } catch (error) {
      console.error('Error generating wallet link token:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to generate wallet link token' });
    }
  });

  testApp.post('/api/mesh/accounts', async (req, res) => {
    try {
      const { connectionId } = req.body;
      
      const response = await mockMeshAPI.get(`/api/v1/accounts/get/${connectionId}`);
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

  testApp.post('/api/mesh/portfolio', async (req, res) => {
    try {
      const { connectionId } = req.body;
      
      const response = await mockMeshAPI.get(`/api/v1/holdings/get/${connectionId}`);
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

  testApp.post('/api/mesh/transfer', async (req, res) => {
    try {
      const { fromConnectionId, toAddress, amount, currency = 'USDC', network = 'base' } = req.body;
      
      const transferData = {
        fromAccountId: fromConnectionId,
        toAddress: toAddress || '0x1234567890123456789012345678901234567890',
        amount: amount,
        symbol: currency,
        network: network,
      };
      
      const response = await mockMeshAPI.post('/api/v1/transfers/managed', transferData);
      
      res.json({
        transfer: {
          id: response.data.content.transferId,
          fromAccount: fromConnectionId,
          toAccount: toAddress || '0x1234567890123456789012345678901234567890',
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

  testApp.post('/api/mesh/transfers', async (req, res) => {
    try {
      const { connectionId } = req.body;
      
      const response = await mockMeshAPI.get(`/api/v1/transfers/get/${connectionId}`);
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

  testApp.get('/api/wallet-address', (req, res) => {
    res.json({ address: '0x1234567890123456789012345678901234567890' });
  });
  
  return { app: testApp, mockMeshAPI };
}

describe('Server API Endpoints', () => {
  let mockMeshAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Crear la app de test
    const testSetup = createTestApp();
    app = testSetup.app;
    mockMeshAPI = testSetup.mockMeshAPI;
  });

  describe('Health Check', () => {
    test('GET /api/health should return server status', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'Server is running');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Mesh Link Token Endpoints', () => {
    test('GET /api/mesh/link-token should return link token for CEX', async () => {
      mockMeshAPI.post.mockResolvedValue({
        data: { content: { linkToken: mockLinkToken } }
      });

      const response = await request(app).get('/api/mesh/link-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('linkToken', mockLinkToken);
      expect(mockMeshAPI.post).toHaveBeenCalledWith('/api/v1/linktoken', {
        userId: expect.stringContaining('user_'),
        brokerType: 'coinbase'
      });
    });

    test('GET /api/mesh/link-token should handle errors', async () => {
      mockMeshAPI.post.mockRejectedValue(new Error('API Error'));

      const response = await request(app).get('/api/mesh/link-token');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to generate link token');
    });

    test('GET /api/mesh/link-token-wallet should return link token for wallet', async () => {
      mockMeshAPI.post.mockResolvedValue({
        data: { content: { linkToken: mockLinkToken } }
      });

      const response = await request(app).get('/api/mesh/link-token-wallet');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('linkToken', mockLinkToken);
      expect(mockMeshAPI.post).toHaveBeenCalledWith('/api/v1/linktoken', {
        userId: expect.stringContaining('user_wallet_'),
        brokerType: 'metamask'
      });
    });

    test('GET /api/mesh/link-token-wallet should handle errors', async () => {
      mockMeshAPI.post.mockRejectedValue(new Error('API Error'));

      const response = await request(app).get('/api/mesh/link-token-wallet');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to generate wallet link token');
    });
  });

  describe('Accounts Endpoint', () => {
    test('POST /api/mesh/accounts should return accounts', async () => {
      const connectionId = 'connection_123';
      
      mockMeshAPI.get.mockResolvedValue({
        data: { content: { accounts: mockAccounts } }
      });

      const response = await request(app)
        .post('/api/mesh/accounts')
        .send({ connectionId });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accounts');
      expect(response.body.accounts).toHaveLength(1);
      expect(response.body.accounts[0]).toEqual({
        id: '1',
        name: 'Test Account',
        type: 'crypto',
        balance: 100.5,
        currency: 'USDC',
        network: 'base',
        provider: 'coinbase'
      });
      expect(mockMeshAPI.get).toHaveBeenCalledWith(`/api/v1/accounts/get/${connectionId}`);
    });

    test('POST /api/mesh/accounts should handle errors', async () => {
      const connectionId = 'connection_123';
      
      mockMeshAPI.get.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/api/mesh/accounts')
        .send({ connectionId });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to get accounts');
    });
  });

  describe('Portfolio Endpoint', () => {
    test('POST /api/mesh/portfolio should return portfolio', async () => {
      const connectionId = 'connection_123';
      
      mockMeshAPI.get.mockResolvedValue({
        data: { content: { holdings: mockHoldings } }
      });

      const response = await request(app)
        .post('/api/mesh/portfolio')
        .send({ connectionId });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('portfolio');
      expect(response.body.portfolio).toHaveProperty('accounts');
      expect(response.body.portfolio).toHaveProperty('totalValue', 100.5);
      expect(response.body.portfolio).toHaveProperty('lastUpdated');
      expect(mockMeshAPI.get).toHaveBeenCalledWith(`/api/v1/holdings/get/${connectionId}`);
    });

    test('POST /api/mesh/portfolio should handle errors', async () => {
      const connectionId = 'connection_123';
      
      mockMeshAPI.get.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/api/mesh/portfolio')
        .send({ connectionId });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to get portfolio');
    });
  });

  describe('Transfer Endpoint', () => {
    test('POST /api/mesh/transfer should execute transfer with default parameters', async () => {
      const transferData = {
        fromConnectionId: 'connection_123',
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: 1
      };
      
      mockMeshAPI.post.mockResolvedValue({
        data: { content: mockTransfer }
      });

      const response = await request(app)
        .post('/api/mesh/transfer')
        .send(transferData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transfer');
      expect(response.body.transfer).toEqual({
        id: 'transfer_1',
        fromAccount: 'connection_123',
        toAccount: '0x1234567890123456789012345678901234567890',
        amount: 1,
        currency: 'USDC',
        network: 'base',
        status: 'completed',
        timestamp: expect.any(String)
      });
      expect(mockMeshAPI.post).toHaveBeenCalledWith('/api/v1/transfers/managed', {
        fromAccountId: 'connection_123',
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: 1,
        symbol: 'USDC',
        network: 'base'
      });
    });

    test('POST /api/mesh/transfer should execute transfer with custom parameters', async () => {
      const transferData = {
        fromConnectionId: 'connection_123',
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: 10,
        currency: 'ETH',
        network: 'ethereum'
      };
      
      mockMeshAPI.post.mockResolvedValue({
        data: { content: mockTransfer }
      });

      const response = await request(app)
        .post('/api/mesh/transfer')
        .send(transferData);
      
      expect(response.status).toBe(200);
      expect(mockMeshAPI.post).toHaveBeenCalledWith('/api/v1/transfers/managed', {
        fromAccountId: 'connection_123',
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: 10,
        symbol: 'ETH',
        network: 'ethereum'
      });
    });

    test('POST /api/mesh/transfer should handle errors', async () => {
      const transferData = {
        fromConnectionId: 'connection_123',
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: 1
      };
      
      mockMeshAPI.post.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/api/mesh/transfer')
        .send(transferData);
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to execute transfer');
    });
  });

  describe('Transfer History Endpoint', () => {
    test('POST /api/mesh/transfers should return transfer history', async () => {
      const connectionId = 'connection_123';
      
      mockMeshAPI.get.mockResolvedValue({
        data: { content: { transfers: [mockTransfer] } }
      });

      const response = await request(app)
        .post('/api/mesh/transfers')
        .send({ connectionId });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transfers');
      expect(response.body.transfers).toHaveLength(1);
      expect(response.body.transfers[0]).toEqual({
        id: 'transfer_1',
        fromAccount: 'account_1',
        toAccount: '0x1234567890123456789012345678901234567890',
        amount: 1,
        currency: 'USDC',
        network: 'base',
        status: 'completed',
        timestamp: '2023-01-01T00:00:00Z'
      });
      expect(mockMeshAPI.get).toHaveBeenCalledWith(`/api/v1/transfers/get/${connectionId}`);
    });

    test('POST /api/mesh/transfers should handle errors', async () => {
      const connectionId = 'connection_123';
      
      mockMeshAPI.get.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/api/mesh/transfers')
        .send({ connectionId });
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to get transfer history');
    });
  });

  describe('Wallet Address Endpoint', () => {
    test('GET /api/wallet-address should return app wallet address', async () => {
      const response = await request(app).get('/api/wallet-address');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('address');
      expect(response.body.address).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('CORS Configuration', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(200);
    });
  });

  describe('Request Validation', () => {
    test('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/mesh/accounts')
        .send({});
      
      expect(response.status).toBe(500);
    });

    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/mesh/accounts')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });
  });

  describe('API Error Handling', () => {
    test('should handle Mesh API 401 errors', async () => {
      const authError = new Error('Unauthorized');
      authError.response = { status: 401, data: { error: 'Unauthorized' } };
      
      mockMeshAPI.post.mockRejectedValue(authError);

      const response = await request(app).get('/api/mesh/link-token');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to generate link token');
    });

    test('should handle Mesh API 500 errors', async () => {
      const serverError = new Error('Internal Server Error');
      serverError.response = { status: 500, data: { error: 'Internal Server Error' } };
      
      mockMeshAPI.post.mockRejectedValue(serverError);

      const response = await request(app).get('/api/mesh/link-token');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to generate link token');
    });
  });
}); 