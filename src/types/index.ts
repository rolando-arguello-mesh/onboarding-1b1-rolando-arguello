// MeshConnect API Types
export interface MeshAccount {
  id: string;
  name: string;
  type: 'crypto' | 'bank';
  balance: number;
  currency: string;
  network?: string;
  provider: string;
}

export interface MeshPortfolio {
  accounts: MeshAccount[];
  totalValue: number;
  lastUpdated: string;
}

export interface MeshTransfer {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  network: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

export interface MeshConnection {
  id: string;
  provider: string;
  type: 'cex' | 'self_custody';
  connected: boolean;
  accounts: MeshAccount[];
}

// App State Types
export interface AppState {
  connections: MeshConnection[];
  selectedConnection: MeshConnection | null;
  portfolio: MeshPortfolio | null;
  transfers: MeshTransfer[];
  loading: boolean;
  error: string | null;
} 