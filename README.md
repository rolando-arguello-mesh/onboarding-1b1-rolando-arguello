# 🔗 Mesh Integration Demo

A cryptocurrency wallet integration demo using Mesh Connect SDK for both Coinbase (CEX) and Phantom Wallet (self-custody).

## 🚀 Features

- **Dual Wallet Support**: Connect both Coinbase and Phantom Wallet
- **Automated Transfers**: Transfer $1 USDC from connected accounts to app wallet
- **MFA Support**: Built-in two-factor authentication for Coinbase
- **Real-time Portfolio**: View crypto balances and holdings
- **Persistent Sessions**: Save connection tokens for future use
- **Matrix/Cyberpunk UI**: Modern dark theme with neon accents

## 💼 Wallet Types Supported

### 🏦 Coinbase (Centralized Exchange)
- **Type**: CEX (Centralized Exchange)
- **Transfer Process**: Automated through Mesh APIs
- **MFA**: Built-in 2FA verification within modal
- **User Experience**: Complete transfer in one modal
- **Requirements**: 6-digit MFA codes from Coinbase app

### 👻 Phantom Wallet (Self-Custody)
- **Type**: Self-Custody Wallet
- **Transfer Process**: User redirected to Phantom wallet
- **Approval**: User approves transaction directly in Phantom
- **Network**: Transactions broadcast to Solana blockchain
- **User Experience**: Modal opens → redirects to Phantom → user approves

## 📋 Transfer Process Comparison

| Feature | Coinbase (CEX) | Phantom (Self-Custody) |
|---------|----------------|------------------------|
| **Automation** | Fully automated | User approval required |
| **MFA/2FA** | Built-in Mesh modal | Handled by wallet |
| **Network** | Base (Ethereum L2) | Solana |
| **Approval** | MFA code entry | Wallet signature |
| **Speed** | Instant (after MFA) | Depends on network |
| **Control** | Mesh handles all | User has full control |

## 🔧 Setup Instructions

### Prerequisites
- Node.js 14+ and npm/yarn
- Mesh Connect API keys (sandbox and production)

### Installation
```bash
# Clone repository
git clone <repository-url>
cd mesh-integration-demo

# Install dependencies
npm install

# Start development servers
npm run dev        # Frontend (React)
npm run server     # Backend (Node.js)
```

### Configuration
1. Get your Mesh Connect API keys from [Mesh Dashboard](https://dashboard.meshconnect.com)
2. Add your API keys to the server configuration
3. Update allowed callback URLs in Mesh Dashboard

## 📚 Implementation Details

### Phantom Wallet Implementation
The Phantom wallet integration uses the same Mesh Connect SDK but with different behavior:

```javascript
// Frontend: Same method for both wallet types
const result = await MeshService.executeTransferWithSDK(
  connection.id,
  appWalletAddress,
  5,
  'USDC',
  'base'
);

// Backend: Automatic detection of wallet type
const brokerType = connectionData.accessToken?.brokerType;
if (brokerType === 'phantom') {
  integrationId = '757e703f-a8fe-4dc4-d0ec-08dc6737ad96'; // Phantom integration ID
} else if (brokerType === 'coinbase') {
  integrationId = '47624467-e52e-4938-a41a-7926b6c27acf'; // Coinbase integration ID
}
```

### Transfer Flow for Phantom
1. **User clicks transfer button**
2. **Mesh SDK opens modal**
3. **User redirected to Phantom wallet**
4. **User approves transaction in Phantom**
5. **Transaction submitted to Solana network**
6. **Confirmation returned to app**

### Transfer Flow for Coinbase
1. **User clicks transfer button**
2. **Mesh SDK opens modal**
3. **User enters MFA code in modal**
4. **Mesh handles transfer via API**
5. **Transfer completed automatically**
6. **Confirmation returned to app**

## 🔐 Security Features

### Coinbase Security
- **MFA Validation**: Real-time validation of 6-digit codes
- **Token Encryption**: Secure token storage and transmission
- **Session Management**: Automatic token refresh
- **Error Handling**: Comprehensive MFA error detection

### Phantom Security
- **User Control**: All transactions require user approval
- **Wallet Signature**: Cryptographic signatures for all transactions
- **Network Validation**: Transactions verified on Solana network
- **No Stored Keys**: App never stores private keys

## 🚨 Common Issues & Solutions

### Phantom Wallet Issues
- **Wallet Not Found**: Ensure Phantom extension is installed
- **Transaction Rejected**: User must approve in Phantom wallet
- **Network Issues**: Check Solana network status
- **Connection Lost**: Reconnect wallet if session expires

### Coinbase Issues
- **MFA Codes**: Use 6-digit codes from Coinbase app (not SMS)
- **Code Timing**: Enter codes within 10 seconds of generation
- **7-digit Codes**: These are invalid - only use 6-digit codes
- **Clock Sync**: Ensure device clock is synchronized

## 🧪 Testing

### Frontend Tests
```bash
npm test                    # Run all tests
npm test -- --coverage     # Run with coverage
npm test -- --watch        # Run in watch mode
```

### Backend Tests
```bash
npm run test:server         # Run server tests
npm run test:integration    # Run integration tests
```

## 📊 API Endpoints

### Phantom Wallet Endpoints
- `GET /api/mesh/link-token-wallet` - Get Phantom link token
- `POST /api/mesh/link-token` - Generate transfer link token
- `POST /api/mesh/transfer` - Execute transfer (works for both wallets)

### Coinbase Endpoints
- `GET /api/mesh/link-token` - Get Coinbase link token
- `POST /api/mesh/transfer-with-mfa` - Execute transfer with MFA
- `POST /api/mesh/crypto-balances` - Get crypto balances

## 📱 Responsive Design

The app works on all devices:
- **Desktop**: Full feature set with dual-column layout
- **Tablet**: Optimized layout with stacked columns
- **Mobile**: Mobile-first responsive design

## 🎨 UI/UX Features

- **Matrix Theme**: Dark cyberpunk aesthetic
- **Neon Accents**: Green/cyan color scheme
- **Animated Elements**: Smooth transitions and hover effects
- **Clear Status**: Visual indicators for connection and transfer status
- **Wallet-Specific UI**: Different experiences for CEX vs self-custody

## 📈 Performance

- **Lazy Loading**: Components loaded on demand
- **Caching**: Connection tokens cached locally
- **Optimization**: Minimized API calls
- **Error Recovery**: Graceful handling of network issues

## 📝 Development Notes

### Code Architecture
- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **API Integration**: Mesh Connect SDK
- **State Management**: React hooks
- **Styling**: Custom CSS with Matrix theme

### Key Files
- `src/App.tsx` - Main application component
- `src/services/meshService.ts` - Mesh SDK integration
- `server/index.js` - Backend API server
- `src/types/index.ts` - TypeScript definitions

## 🚀 Deployment

### Production Setup
1. Build frontend: `npm run build`
2. Configure production API keys
3. Set up domain and SSL
4. Update Mesh Dashboard callbacks
5. Deploy to hosting provider

### Environment Variables
```bash
MESH_CLIENT_ID=your_client_id
MESH_CLIENT_SECRET=your_client_secret
MESH_ENVIRONMENT=production
```

## 📞 Support

For questions or issues:
- **Mesh Connect**: [Documentation](https://docs.meshconnect.com)
- **Phantom Wallet**: [Support](https://phantom.app/help)
- **Coinbase**: [Developer Portal](https://developers.coinbase.com)

## 📄 License

This project is licensed under the MIT License.
