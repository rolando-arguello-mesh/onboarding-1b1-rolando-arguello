# 🔗 Mesh Integration Demo

A comprehensive React TypeScript application that integrates with MeshConnect to connect Coinbase and Phantom Wallet, display portfolios, and execute USDC transfers on the Base network.

## ✨ Features

- **Coinbase Integration**: Connect to Coinbase account (CEX)
- **Phantom Wallet Integration**: Connect to Phantom Wallet (Self-custody)
- **Portfolio Display**: View cryptocurrency holdings from both connections
- **Transfer Functionality**: Move $5 USDC from accounts to app wallet
- **Base Network**: All transfers execute on the Base network
- **Modern UI**: Beautiful, responsive interface with gradient designs
- **Real-time Updates**: Live portfolio and transfer status updates

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Mesh API credentials (Client ID and Secret)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd 1B1
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory with your Mesh API credentials:

```env
# Mesh API Configuration
MESH_CLIENT_ID=your_mesh_client_id
MESH_CLIENT_SECRET=your_mesh_client_secret
MESH_BASE_URL=https://integration-api.meshconnect.com
MESH_ENVIRONMENT=sandbox

# Server Configuration
PORT=3001
NODE_ENV=development

# Application Configuration
APP_WALLET_ADDRESS=your_app_wallet_address
```

4. **Start the development servers**

Start the backend server:
```bash
npm run server
```

In a new terminal, start the React frontend:
```bash
npm start
```

Or run both simultaneously:
```bash
npm run dev
```

## 🏗️ Architecture

### Frontend (React TypeScript)
- **Components**: Modern React functional components with hooks
- **State Management**: React useState for application state
- **Styling**: Custom CSS with gradients and animations
- **API Integration**: Axios for HTTP requests to backend

### Backend (Node.js/Express)
- **API Routes**: RESTful endpoints for Mesh integration
- **Mesh SDK**: Direct integration with Mesh API
- **CORS**: Configured for frontend communication
- **Error Handling**: Comprehensive error management

## 🔌 API Endpoints

### Mesh Integration
- `GET /api/mesh/link-token` - Get link token for Coinbase
- `GET /api/mesh/link-token-wallet` - Get link token for wallets
- `POST /api/mesh/accounts` - Get account information
- `POST /api/mesh/portfolio` - Get portfolio holdings
- `POST /api/mesh/transfer` - Execute USDC transfer
- `POST /api/mesh/transfers` - Get transfer history

### Utilities
- `GET /api/health` - Health check endpoint
- `GET /api/wallet-address` - Get app wallet address

## 💰 Transfer Flow

### CEX (Coinbase) Transfer
1. User connects Coinbase account via MeshConnect
2. System retrieves portfolio and account information
3. User initiates $5 USDC transfer to app wallet
4. Transfer executes via Mesh API (not Link UI)
5. Transfer status updates in real-time

### Self-Custody Wallet Transfer
1. User connects Phantom Wallet (or compatible self-custody wallet)
2. System retrieves portfolio on Base network
3. User initiates $5 worth of USDC transfer
4. Transfer executes on Base network
5. Portfolio updates reflect the transfer

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, CSS3
- **Backend**: Node.js, Express.js
- **Integration**: MeshConnect SDK
- **Network**: Base (Ethereum Layer 2)
- **Cryptocurrency**: USDC (USD Coin)
- **Development**: Nodemon, Concurrently

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop and mobile
- **Modern Gradients**: Beautiful color schemes
- **Smooth Animations**: CSS transitions and hover effects
- **Real-time Updates**: Live status indicators
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during operations

## 📱 Usage

1. **Connect Accounts**: Use the connection buttons to link your Coinbase and Phantom Wallet
2. **View Portfolio**: See your cryptocurrency holdings from both accounts
3. **Execute Transfers**: Use the transfer buttons to move $5 USDC to the app wallet
4. **Monitor Status**: Track transfer progress and history

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
├── services/           # API service classes
├── types/             # TypeScript type definitions
├── App.tsx            # Main application component
├── App.css            # Application styles
└── index.tsx          # Application entry point

server/
└── index.js           # Express server with Mesh integration
```

### Key Files
- `src/services/meshService.ts` - Mesh API integration
- `src/types/index.ts` - TypeScript interfaces
- `server/index.js` - Backend API server
- `src/App.tsx` - Main React component
- `src/App.css` - UI styling

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 🚢 Deployment

Build the production version:
```bash
npm run build
```

The app is configured to work with both development and production environments.

## 📝 Notes

- **Happy Path Implementation**: Focus on successful user flows
- **Single Network**: Base network for all operations
- **Simplified UX**: Clean, intuitive interface
- **Real Mesh Integration**: Uses actual Mesh API endpoints
- **Environment Variables**: Secure API credential management

## 🔒 Security

- Environment variables for sensitive data
- CORS configuration for API access
- Input validation and error handling
- Secure API communication with Mesh

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:
1. Check the console for error messages
2. Verify your Mesh API credentials
3. Ensure proper network connectivity
4. Review the API documentation

---

Built with ❤️ using React, TypeScript, and MeshConnect
