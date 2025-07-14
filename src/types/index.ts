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
  status: 'pending' | 'completed' | 'failed' | 'success' | 'confirmed';
  timestamp: string;
  hash?: string | null;
  networkId?: string;
  fees?: {
    network: number | null;
    institution: number | null;
    total: number | null;
  };
  actuallySuccessful?: boolean;
  rawStatus?: string;
  note?: string;
}

export interface MeshConnection {
  id: string;
  provider: string;
  type: 'cex' | 'self_custody';
  connected: boolean;
  accounts: MeshAccount[];
}

// Add cryptocurrency balance interfaces
export interface CryptocurrencyPosition {
  symbol: string;
  name: string;
  amount: number;
  marketValue: number;
  lastPrice: number;
  costBasis: number;
  pnl: number;
  network: string;
  accountId: string;
  formattedAmount: string;
  formattedValue: string;
  formattedPrice: string;
  formattedPnL: string;
  rawPosition: any;
}

export interface CryptoBalanceData {
  success: boolean;
  connectionId: string;
  brokerType: string;
  brokerName?: string;
  summary: {
    totalCryptoValue: number;
    totalPositions: number;
    formattedTotalValue: string;
  };
  cryptocurrencyPositions: CryptocurrencyPosition[];
  otherPositions: {
    equityCount: number;
    nftCount: number;
    optionCount: number;
  };
  timestamp: string;
  error?: {
    message: string;
    details: string;
    canRetry: boolean;
  };
}

export interface USDCBalanceData {
  success: boolean;
  connectionId: string;
  brokerType: string;
  brokerName?: string;
  usdc: {
    totalBalance: number;
    totalValue: number;
    formattedBalance: string;
    formattedValue: string;
    positions: any[];
    positionsCount: number;
  };
  timestamp: string;
}

export interface BaseTokenPosition {
  symbol: string;
  name: string;
  amount: number;
  marketValue: number;
  formattedAmount: string;
  formattedValue: string;
  network: string;
  provider: string;
  connectionId: string;
}

export interface BaseTokenBalance {
  totalBalance: number;
  totalValue: number;
  formattedBalance: string;
  formattedValue: string;
  positions: BaseTokenPosition[];
  positionsCount: number;
}

export interface BaseBalanceData {
  success: boolean;
  network: string;
  balances: {
    usdt: BaseTokenBalance;
    eth: BaseTokenBalance;
    totalValue: number;
  };
  summary: {
    totalValue: number;
    formattedTotalValue: string;
    totalTokens: number;
    supportedTokens: string[];
  };
  timestamp: string;
}

export interface BaseTokenBalanceData {
  success: boolean;
  token: string;
  network: string;
  totalBalance: number;
  totalValue: number;
  formattedBalance: string;
  formattedValue: string;
  positions: BaseTokenPosition[];
  positionsCount: number;
  timestamp: string;
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