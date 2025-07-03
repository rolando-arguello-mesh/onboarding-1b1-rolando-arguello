import axios from 'axios';
import { MeshAccount, MeshPortfolio, MeshTransfer } from '../types';

// Base API client
const api = axios.create({
  baseURL: '/api/mesh',
  timeout: 10000,
});

export class MeshService {
  
  // Get MeshConnect link token for authentication
  static async getLinkToken(): Promise<string> {
    try {
      const response = await api.get('/link-token');
      return response.data.linkToken;
    } catch (error) {
      console.error('Error getting link token:', error);
      throw new Error('Failed to get MeshConnect link token');
    }
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
} 