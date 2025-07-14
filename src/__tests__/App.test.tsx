import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import { MeshService } from '../services/meshService';

// Mock del MeshService
jest.mock('../services/meshService');
const mockMeshService = MeshService as jest.Mocked<typeof MeshService>;

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock de métodos del MeshService
    mockMeshService.getAppWalletAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
    mockMeshService.getLinkToken.mockResolvedValue('test_link_token');
    mockMeshService.getWalletLinkToken.mockResolvedValue('test_wallet_link_token');
    mockMeshService.getPortfolio.mockResolvedValue({
      accounts: [
        {
          id: '1',
          name: 'USDC',
          type: 'crypto',
          balance: 100.5,
          currency: 'USDC',
          network: 'base',
          provider: 'coinbase'
        }
      ],
      totalValue: 100.5,
      lastUpdated: new Date().toISOString()
    });
  });

  describe('Rendering', () => {
    test('renders main title and description', () => {
      render(<App />);
      
      expect(screen.getByText('🔗 Mesh Integration Demo')).toBeInTheDocument();
      expect(screen.getByText('Connect your Coinbase and Phantom Wallet to manage your crypto')).toBeInTheDocument();
    });

    test('renders connection cards', () => {
      render(<App />);
      
      expect(screen.getByText('🏦 Coinbase (CEX)')).toBeInTheDocument();
      expect(screen.getByText('👻 Phantom Wallet (Self-Custody)')).toBeInTheDocument();
      expect(screen.getByText('Connect Coinbase')).toBeInTheDocument();
      expect(screen.getByText('Connect Phantom Wallet')).toBeInTheDocument();
    });

    test('renders app wallet address section', () => {
      render(<App />);
      
      expect(screen.getByText('App Wallet Address')).toBeInTheDocument();
    });
  });

  describe('Wallet Address Loading', () => {
    test('loads and displays wallet address on mount', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('0x1234567890123456789012345678901234567890')).toBeInTheDocument();
      });
      
      expect(mockMeshService.getAppWalletAddress).toHaveBeenCalledTimes(1);
    });

    test('shows loading state initially', () => {
      render(<App />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Coinbase Connection', () => {
    test('handles coinbase connection successfully', async () => {
      render(<App />);
      
      const connectButton = screen.getByText('Connect Coinbase');
      
      await act(async () => {
        fireEvent.click(connectButton);
      });
      
      await waitFor(() => {
        expect(mockMeshService.getLinkToken).toHaveBeenCalledTimes(1);
      });
    });

    test('shows loading state during connection', async () => {
      render(<App />);
      
      const connectButton = screen.getByText('Connect Coinbase');
      fireEvent.click(connectButton);
      
      // Buscar el botón de Coinbase específico que está en estado loading
      const coinbaseButtons = screen.getAllByText('Connecting...');
      expect(coinbaseButtons.length).toBeGreaterThan(0);
    });

    test('handles connection error', async () => {
      mockMeshService.getLinkToken.mockRejectedValue(new Error('Connection failed'));
      
      render(<App />);
      
      const connectButton = screen.getByText('Connect Coinbase');
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect to Coinbase')).toBeInTheDocument();
      });
    });
  });

  describe('Phantom Wallet Connection', () => {
    test('handles wallet connection successfully', async () => {
      render(<App />);
      
      const connectButton = screen.getByText('Connect Phantom Wallet');
      
      await act(async () => {
        fireEvent.click(connectButton);
      });
      
      await waitFor(() => {
        expect(mockMeshService.getWalletLinkToken).toHaveBeenCalledTimes(1);
      });
    });

    test('shows loading state during wallet connection', async () => {
      render(<App />);
      
      const connectButton = screen.getByText('Connect Phantom Wallet');
      fireEvent.click(connectButton);
      
      // Buscar el botón de wallet específico que está en estado loading
      const walletButtons = screen.getAllByText('Connecting...');
      expect(walletButtons.length).toBeGreaterThan(0);
    });

    test('handles wallet connection error', async () => {
      mockMeshService.getWalletLinkToken.mockRejectedValue(new Error('Wallet connection failed'));
      
      render(<App />);
      
      const connectButton = screen.getByText('Connect Phantom Wallet');
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect to Phantom Wallet')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message', async () => {
      mockMeshService.getLinkToken.mockRejectedValue(new Error('Test error'));
      
      render(<App />);
      
      const connectButton = screen.getByText('Connect Coinbase');
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect to Coinbase')).toBeInTheDocument();
      });
    });

    test('can dismiss error message', async () => {
      mockMeshService.getLinkToken.mockRejectedValue(new Error('Test error'));
      
      render(<App />);
      
      const connectButton = screen.getByText('Connect Coinbase');
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect to Coinbase')).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByText('✕');
      fireEvent.click(dismissButton);
      
      expect(screen.queryByText('Failed to connect to Coinbase')).not.toBeInTheDocument();
    });
  });

  describe('Portfolio Display', () => {
    test('does not show portfolio section initially', () => {
      render(<App />);
      
      expect(screen.queryByText('Your Portfolio')).not.toBeInTheDocument();
    });
  });

  describe('Transfer Functionality', () => {
    test('does not show transfer section initially', () => {
      render(<App />);
      
      expect(screen.queryByText('Transfer $1 USDC to App Wallet')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper button roles', () => {
      render(<App />);
      
      const coinbaseButton = screen.getByRole('button', { name: /connect coinbase/i });
      const walletButton = screen.getByRole('button', { name: /connect phantom wallet/i });
      
      expect(coinbaseButton).toBeInTheDocument();
      expect(walletButton).toBeInTheDocument();
    });

    test('buttons are disabled when loading', async () => {
      render(<App />);
      
      const connectButton = screen.getByText('Connect Coinbase');
      fireEvent.click(connectButton);
      
      expect(connectButton).toBeDisabled();
    });
  });

  describe('Responsive Design', () => {
    test('renders connection grid layout', () => {
      render(<App />);
      
      const connectionGrid = screen.getByText('🏦 Coinbase (CEX)').closest('.connection-grid');
      expect(connectionGrid).toBeInTheDocument();
    });
  });
}); 