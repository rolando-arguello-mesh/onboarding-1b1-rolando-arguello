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