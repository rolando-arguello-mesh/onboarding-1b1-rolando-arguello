import axios from 'axios';
import { MeshAccount, MeshPortfolio, MeshTransfer } from '../types';

// Import MeshConnect SDK
import { createLink } from '@meshconnect/web-link-sdk';

// Base API client
const api = axios.create({
  baseURL: 'http://localhost:3005/api/mesh',
  timeout: 10000,
});

// Get client ID from environment or use default
const MESH_CLIENT_ID = process.env.MESH_CLIENT_ID || 'cd2ee500-013f-47b2-38e6-08ddb8d45bc6';

export class MeshService {
  
  // Persistent token management
  private static STORAGE_KEY = 'mesh_connections';
  
  // Save connection tokens to localStorage
  static saveConnectionTokens(connectionId: string, accessToken: any, provider: string): void {
    try {
      const existingConnections = this.getSavedConnections();
      existingConnections[connectionId] = {
        accessToken,
        provider,
        savedAt: new Date().toISOString(),
        connectionId
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingConnections));
      console.log('✅ Connection tokens saved to localStorage:', connectionId);
    } catch (error) {
      console.error('❌ Failed to save connection tokens:', error);
    }
  }

  // Get all saved connections from localStorage
  static getSavedConnections(): { [key: string]: any } {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('❌ Failed to get saved connections:', error);
      return {};
    }
  }

  // Get specific saved connection
  static getSavedConnection(connectionId: string): any | null {
    const connections = this.getSavedConnections();
    return connections[connectionId] || null;
  }

  // Check if we have valid tokens for a provider
  static hasValidTokensForProvider(provider: string): { hasTokens: boolean; connectionId?: string; connection?: any } {
    const connections = this.getSavedConnections();
    
    for (const [connectionId, connection] of Object.entries(connections)) {
      if ((connection as any).provider === provider) {
        // Check if token is not too old (optional - you can add expiration logic here)
        const savedAt = new Date((connection as any).savedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
        
        // Consider tokens valid for 24 hours (adjust as needed)
        if (hoursDiff < 24) {
          return { hasTokens: true, connectionId, connection };
        }
      }
    }
    
    return { hasTokens: false };
  }

  // Clear saved connection
  static clearSavedConnection(connectionId: string): void {
    try {
      const connections = this.getSavedConnections();
      delete connections[connectionId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(connections));
      console.log('✅ Connection cleared from localStorage:', connectionId);
    } catch (error) {
      console.error('❌ Failed to clear connection:', error);
    }
  }

  // Clear all saved connections
  static clearAllSavedConnections(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('✅ All connections cleared from localStorage');
    } catch (error) {
      console.error('❌ Failed to clear all connections:', error);
    }
  }

  // Get MeshConnect link token for CEX (Coinbase)
  static async getLinkToken(): Promise<string> {
    try {
      const response = await api.get('/link-token');
      return response.data.linkToken;
    } catch (error) {
      console.error('Error getting link token:', error);
      throw new Error('Failed to get MeshConnect link token');
    }
  }

  // Get MeshConnect link token for self-custody wallet (Phantom)
  static async getPhantomLinkToken(): Promise<string> {
    try {
      const response = await api.get('/link-token-wallet');
      return response.data.linkToken;
    } catch (error) {
      console.error('Error getting Phantom link token:', error);
      throw new Error('Failed to get Phantom link token');
    }
  }

  // Legacy method for backward compatibility
  static async getWalletLinkToken(): Promise<string> {
    return this.getPhantomLinkToken();
  }

  // Store connection data after successful authentication
  static async storeConnection(connectionId: string, accessToken: any, accountData?: any): Promise<void> {
    try {
      await api.post('/store-connection', {
        connectionId,
        accessToken,
        accountData
      });
      console.log('✅ Connection stored successfully');
    } catch (error) {
      console.error('❌ Error storing connection:', error);
      throw new Error('Failed to store connection data');
    }
  }

  // Open MeshConnect for Coinbase
  static async openCoinbaseConnection(): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    try {
      // First check if we have existing valid tokens for Coinbase
      const existingTokenCheck = this.hasValidTokensForProvider('coinbase');
      
      if (existingTokenCheck.hasTokens) {
        console.log('🔄 Found existing Coinbase tokens, reusing connection:', existingTokenCheck.connectionId);
        
        // Verify the tokens are still valid by making a test API call
        try {
          await this.storeConnection(existingTokenCheck.connectionId!, existingTokenCheck.connection!.accessToken, { provider: 'coinbase' });
          
          return { 
            success: true, 
            connectionId: existingTokenCheck.connectionId!,
            fromCache: true 
          } as any;
        } catch (error) {
          console.log('⚠️ Existing tokens invalid, clearing and creating new connection');
          this.clearSavedConnection(existingTokenCheck.connectionId!);
        }
      }
      
      console.log('🔐 No valid tokens found, initiating new Coinbase authentication...');
      const linkToken = await this.getLinkToken();
      
      return new Promise((resolve) => {
        const link = createLink({
          clientId: MESH_CLIENT_ID,
          onIntegrationConnected: async (payload) => {
            console.log('Coinbase connected successfully:', payload);
            // Check if accessToken exists and extract connection info
            if (payload.accessToken) {
              const accessToken = payload.accessToken as any;
              const connectionId = accessToken.accountId || accessToken.account_id || accessToken.id || 'connection_' + Date.now();
              
              try {
                // Store the connection data for future API calls
                await this.storeConnection(connectionId, accessToken, payload);
                
                // Save tokens locally for future use
                this.saveConnectionTokens(connectionId, accessToken, 'coinbase');
                
                resolve({ 
                  success: true, 
                  connectionId: connectionId 
                });
              } catch (error) {
                console.error('Error storing connection:', error);
                resolve({ 
                  success: false, 
                  error: 'Failed to store connection data' 
                });
              }
            } else {
              resolve({ 
                success: false, 
                error: 'No access token received' 
              });
            }
          },
          onTransferFinished: (payload) => {
            console.log('Transfer finished:', payload);
          },
          onExit: (error, summary) => {
            console.log('Connection closed:', error, summary);
            resolve({ 
              success: false, 
              error: error || 'User closed connection' 
            });
          },
          onEvent: (event) => {
            console.log('MeshConnect event:', event);
          }
        });
        
        link.openLink(linkToken);
      });
    } catch (error) {
      console.error('Error opening Coinbase connection:', error);
      return { success: false, error: 'Failed to open connection' };
    }
  }

  // Open MeshConnect for Phantom Wallet
  static async openPhantomConnection(): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    try {
      // First check if we have existing valid tokens for Phantom
      const existingTokenCheck = this.hasValidTokensForProvider('phantom');
      
      if (existingTokenCheck.hasTokens) {
        console.log('🔄 Found existing Phantom tokens, reusing connection:', existingTokenCheck.connectionId);
        
        // Verify the tokens are still valid by making a test API call
        try {
          await this.storeConnection(existingTokenCheck.connectionId!, existingTokenCheck.connection!.accessToken, { provider: 'phantom' });
          
          return { 
            success: true, 
            connectionId: existingTokenCheck.connectionId!,
            fromCache: true 
          } as any;
        } catch (error) {
          console.log('⚠️ Existing tokens invalid, clearing and creating new connection');
          this.clearSavedConnection(existingTokenCheck.connectionId!);
        }
      }
      
      console.log('🔐 No valid tokens found, initiating new Phantom authentication...');
      const linkToken = await this.getPhantomLinkToken();
      
      return new Promise((resolve) => {
        const link = createLink({
          clientId: MESH_CLIENT_ID,
          onIntegrationConnected: async (payload) => {
            console.log('Phantom connected successfully:', payload);
            // Check if accessToken exists and extract connection info
            if (payload.accessToken) {
              const accessToken = payload.accessToken as any;
              const connectionId = accessToken.accountId || accessToken.account_id || accessToken.id || 'phantom_' + Date.now();
              
              try {
                // Store the connection data for future API calls
                await this.storeConnection(connectionId, accessToken, payload);
                
                // Save tokens locally for future use
                this.saveConnectionTokens(connectionId, accessToken, 'phantom');
                
                resolve({ 
                  success: true, 
                  connectionId: connectionId 
                });
              } catch (error) {
                console.error('Error storing connection:', error);
                resolve({ 
                  success: false, 
                  error: 'Failed to store connection data' 
                });
              }
            } else {
              resolve({ 
                success: false, 
                error: 'No access token received' 
              });
            }
          },
          onTransferFinished: (payload) => {
            console.log('Transfer finished:', payload);
          },
          onExit: (error, summary) => {
            console.log('Connection closed:', error, summary);
            resolve({ 
              success: false, 
              error: error || 'User closed connection' 
            });
          },
          onEvent: (event) => {
            console.log('MeshConnect event:', event);
          }
        });
        
        link.openLink(linkToken);
      });
    } catch (error) {
      console.error('Error opening Phantom connection:', error);
      return { success: false, error: 'Failed to open connection' };
    }
  }

  // Legacy method for backward compatibility
  static async openWalletConnection(): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    return this.openPhantomConnection();
  }

  // Get account information for connected providers
  static async getAccounts(connectionId: string): Promise<MeshAccount[]> {
    try {
      const response = await api.post('/accounts', { connectionId });
      return response.data.accounts;
    } catch (error) {
      console.error('Error getting accounts:', error);
      throw new Error('Failed to get account information');
    }
  }

  // Get cryptocurrency balances from Coinbase
  static async getCoinbaseCryptoBalances(): Promise<any> {
    try {
      const response = await api.get('/coinbase-crypto-balances');
      return response.data;
    } catch (error) {
      console.error('Error getting Coinbase crypto balances:', error);
      throw new Error('Failed to get Coinbase crypto balances');
    }
  }

  // Get cryptocurrency balances for any connected account
  static async getCryptoBalances(connectionId: string): Promise<any> {
    try {
      const response = await api.post('/crypto-balances', { connectionId });
      return response.data;
    } catch (error) {
      console.error('Error getting crypto balances:', error);
      throw new Error('Failed to get crypto balances');
    }
  }

  // Get complete balance information from Coinbase (multiple endpoints)
  static async getCoinbaseCompleteBalance(): Promise<any> {
    try {
      const response = await api.get('/coinbase-complete-balance');
      return response.data;
    } catch (error) {
      console.error('Error getting Coinbase complete balance:', error);
      throw new Error('Failed to get Coinbase complete balance');
    }
  }



  // Get USDC balance specifically
  static async getUSDCBalance(connectionId: string): Promise<any> {
    try {
      const response = await api.post('/usdc-balance', { connectionId });
      return response.data;
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      throw new Error('Failed to get USDC balance');
    }
  }

  // Get portfolio information
  static async getPortfolio(connectionId: string): Promise<MeshPortfolio> {
    try {
      const response = await api.post('/portfolio', { connectionId });
      return response.data.portfolio;
    } catch (error) {
      console.error('Error getting portfolio:', error);
      throw new Error('Failed to get portfolio information');
    }
  }

  // Execute a transfer
  static async executeTransfer(
    fromConnectionId: string,
    toAddress: string,
    amount: number,
    currency: string = 'USDC',
    network: string = 'base'
  ): Promise<MeshTransfer> {
    try {
      const response = await api.post('/transfer', {
        fromConnectionId,
        toAddress,
        amount,
        currency,
        network,
      });
      return response.data.transfer;
    } catch (error) {
      console.error('Error executing transfer:', error);
      throw new Error('Failed to execute transfer');
    }
  }

  // Get transfer history
  static async getTransfers(connectionId: string): Promise<MeshTransfer[]> {
    try {
      const response = await api.post('/transfers', { connectionId });
      return response.data.transfers;
    } catch (error) {
      console.error('Error getting transfers:', error);
      throw new Error('Failed to get transfer history');
    }
  }

  // Get app wallet address
  static async getAppWalletAddress(): Promise<string> {
    try {
      const response = await axios.get('http://localhost:3005/api/wallet-address');
      return response.data.address;
    } catch (error) {
      console.error('Error getting app wallet address:', error);
      throw new Error('Failed to get app wallet address');
    }
  }
} 