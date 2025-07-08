import { 
  MeshAccount, 
  MeshPortfolio, 
  MeshTransfer, 
  MeshConnection, 
  AppState 
} from '../index';

describe('TypeScript Types and Interfaces', () => {
  describe('MeshAccount', () => {
    test('should create valid MeshAccount object', () => {
      const account: MeshAccount = {
        id: '1',
        name: 'Test Account',
        type: 'crypto',
        balance: 100.5,
        currency: 'USDC',
        network: 'base',
        provider: 'coinbase'
      };

      expect(account.id).toBe('1');
      expect(account.name).toBe('Test Account');
      expect(account.type).toBe('crypto');
      expect(account.balance).toBe(100.5);
      expect(account.currency).toBe('USDC');
      expect(account.network).toBe('base');
      expect(account.provider).toBe('coinbase');
    });

    test('should allow bank type accounts', () => {
      const bankAccount: MeshAccount = {
        id: '2',
        name: 'Bank Account',
        type: 'bank',
        balance: 1000,
        currency: 'USD',
        provider: 'chase'
      };

      expect(bankAccount.type).toBe('bank');
      expect(bankAccount.network).toBeUndefined();
    });

    test('should have correct type constraints', () => {
      // TypeScript compilation will catch type errors
      const account: MeshAccount = {
        id: '1',
        name: 'Test',
        type: 'crypto', // Should only accept 'crypto' | 'bank'
        balance: 100,
        currency: 'USDC',
        provider: 'coinbase'
      };

      expect(['crypto', 'bank']).toContain(account.type);
    });
  });

  describe('MeshPortfolio', () => {
    test('should create valid MeshPortfolio object', () => {
      const mockAccount: MeshAccount = {
        id: '1',
        name: 'USDC Account',
        type: 'crypto',
        balance: 100,
        currency: 'USDC',
        network: 'base',
        provider: 'coinbase'
      };

      const portfolio: MeshPortfolio = {
        accounts: [mockAccount],
        totalValue: 100,
        lastUpdated: '2023-01-01T00:00:00Z'
      };

      expect(portfolio.accounts).toHaveLength(1);
      expect(portfolio.totalValue).toBe(100);
      expect(portfolio.lastUpdated).toBe('2023-01-01T00:00:00Z');
    });

    test('should handle empty accounts array', () => {
      const portfolio: MeshPortfolio = {
        accounts: [],
        totalValue: 0,
        lastUpdated: '2023-01-01T00:00:00Z'
      };

      expect(portfolio.accounts).toHaveLength(0);
      expect(portfolio.totalValue).toBe(0);
    });
  });

  describe('MeshTransfer', () => {
    test('should create valid MeshTransfer object', () => {
      const transfer: MeshTransfer = {
        id: 'transfer_1',
        fromAccount: 'account_1',
        toAccount: '0x1234567890123456789012345678901234567890',
        amount: 5,
        currency: 'USDC',
        network: 'base',
        status: 'completed',
        timestamp: '2023-01-01T00:00:00Z'
      };

      expect(transfer.id).toBe('transfer_1');
      expect(transfer.amount).toBe(5);
      expect(transfer.currency).toBe('USDC');
      expect(transfer.network).toBe('base');
      expect(transfer.status).toBe('completed');
    });

    test('should handle different transfer statuses', () => {
      const statuses: Array<MeshTransfer['status']> = ['pending', 'completed', 'failed'];
      
      statuses.forEach(status => {
        const transfer: MeshTransfer = {
          id: `transfer_${status}`,
          fromAccount: 'account_1',
          toAccount: 'account_2',
          amount: 10,
          currency: 'USDC',
          network: 'base',
          status,
          timestamp: '2023-01-01T00:00:00Z'
        };

        expect(['pending', 'completed', 'failed']).toContain(transfer.status);
      });
    });
  });

  describe('MeshConnection', () => {
    test('should create valid CEX connection', () => {
      const connection: MeshConnection = {
        id: 'coinbase_123',
        provider: 'coinbase',
        type: 'cex',
        connected: true,
        accounts: []
      };

      expect(connection.provider).toBe('coinbase');
      expect(connection.type).toBe('cex');
      expect(connection.connected).toBe(true);
    });

    test('should create valid self-custody connection', () => {
      const connection: MeshConnection = {
        id: 'wallet_456',
        provider: 'phantom',
        type: 'self_custody',
        connected: true,
        accounts: []
      };

      expect(connection.provider).toBe('phantom');
      expect(connection.type).toBe('self_custody');
      expect(connection.connected).toBe(true);
    });

    test('should handle connections with accounts', () => {
      const mockAccount: MeshAccount = {
        id: '1',
        name: 'Test Account',
        type: 'crypto',
        balance: 50,
        currency: 'ETH',
        network: 'ethereum',
        provider: 'metamask'
      };

      const connection: MeshConnection = {
        id: 'metamask_789',
        provider: 'metamask',
        type: 'self_custody',
        connected: true,
        accounts: [mockAccount]
      };

      expect(connection.accounts).toHaveLength(1);
      expect(connection.accounts[0]).toEqual(mockAccount);
    });
  });

  describe('AppState', () => {
    test('should create valid AppState object', () => {
      const mockConnection: MeshConnection = {
        id: '1',
        provider: 'coinbase',
        type: 'cex',
        connected: true,
        accounts: []
      };

      const mockPortfolio: MeshPortfolio = {
        accounts: [],
        totalValue: 0,
        lastUpdated: '2023-01-01T00:00:00Z'
      };

      const appState: AppState = {
        connections: [mockConnection],
        selectedConnection: mockConnection,
        portfolio: mockPortfolio,
        transfers: [],
        loading: false,
        error: null
      };

      expect(appState.connections).toHaveLength(1);
      expect(appState.selectedConnection).toEqual(mockConnection);
      expect(appState.portfolio).toEqual(mockPortfolio);
      expect(appState.transfers).toHaveLength(0);
      expect(appState.loading).toBe(false);
      expect(appState.error).toBeNull();
    });

    test('should handle loading state', () => {
      const appState: AppState = {
        connections: [],
        selectedConnection: null,
        portfolio: null,
        transfers: [],
        loading: true,
        error: null
      };

      expect(appState.loading).toBe(true);
      expect(appState.selectedConnection).toBeNull();
      expect(appState.portfolio).toBeNull();
    });

    test('should handle error state', () => {
      const errorMessage = 'Connection failed';
      const appState: AppState = {
        connections: [],
        selectedConnection: null,
        portfolio: null,
        transfers: [],
        loading: false,
        error: errorMessage
      };

      expect(appState.error).toBe(errorMessage);
      expect(appState.loading).toBe(false);
    });
  });

  describe('Type Compatibility', () => {
    test('should allow valid account types', () => {
      const validTypes: Array<MeshAccount['type']> = ['crypto', 'bank'];
      
      validTypes.forEach(type => {
        const account: MeshAccount = {
          id: '1',
          name: 'Test',
          type,
          balance: 100,
          currency: 'USD',
          provider: 'test'
        };
        
        expect(['crypto', 'bank']).toContain(account.type);
      });
    });

    test('should allow valid connection types', () => {
      const validTypes: Array<MeshConnection['type']> = ['cex', 'self_custody'];
      
      validTypes.forEach(type => {
        const connection: MeshConnection = {
          id: '1',
          provider: 'test',
          type,
          connected: true,
          accounts: []
        };
        
        expect(['cex', 'self_custody']).toContain(connection.type);
      });
    });

    test('should allow valid transfer statuses', () => {
      const validStatuses: Array<MeshTransfer['status']> = ['pending', 'completed', 'failed'];
      
      validStatuses.forEach(status => {
        const transfer: MeshTransfer = {
          id: '1',
          fromAccount: 'from',
          toAccount: 'to',
          amount: 10,
          currency: 'USDC',
          network: 'base',
          status,
          timestamp: '2023-01-01T00:00:00Z'
        };
        
        expect(['pending', 'completed', 'failed']).toContain(transfer.status);
      });
    });
  });

  describe('Optional Properties', () => {
    test('should handle optional network property in MeshAccount', () => {
      const accountWithoutNetwork: MeshAccount = {
        id: '1',
        name: 'Bank Account',
        type: 'bank',
        balance: 1000,
        currency: 'USD',
        provider: 'bank'
      };

      expect(accountWithoutNetwork.network).toBeUndefined();
    });

    test('should handle nullable properties in AppState', () => {
      const minimalAppState: AppState = {
        connections: [],
        selectedConnection: null,
        portfolio: null,
        transfers: [],
        loading: false,
        error: null
      };

      expect(minimalAppState.selectedConnection).toBeNull();
      expect(minimalAppState.portfolio).toBeNull();
      expect(minimalAppState.error).toBeNull();
    });
  });
}); 