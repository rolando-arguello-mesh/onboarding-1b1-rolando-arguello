# MeshConnect Integration App

A React TypeScript application that integrates with MeshConnect to manage crypto portfolios and transfers between Coinbase and self-custody wallets.

## Features

- 🔗 **MeshConnect Integration**: Connect to Coinbase and Rainbow Wallet
- 📊 **Portfolio Display**: View balances and holdings from both connections
- 💸 **Transfer Functionality**: Move $5 USDC between CEX and self-custody wallets
- 🌐 **Base Network**: All operations on Base network
- ⚡ **Full-Stack**: React frontend with Node.js/Express backend

## Prerequisites

- Node.js 16+
- npm or yarn
- MeshConnect API credentials (sandbox environment)

## Setup

1. **Clone and Install Dependencies**
```bash
npm install
```

2. **Environment Configuration**
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Then update the `.env` file with your MeshConnect credentials:
```
MESH_API_URL=https://api.meshconnect.com
MESH_CLIENT_ID=your_mesh_client_id_here
MESH_CLIENT_SECRET=your_mesh_client_secret_here
MESH_ENVIRONMENT=sandbox
PORT=3001
NODE_ENV=development
MESH_API_KEY=your_mesh_api_key_here
```

3. **Get MeshConnect Credentials**
   - Visit [MeshConnect Dashboard](https://dashboard.meshconnect.com/)
   - Create a sandbox account
   - Get your Client ID, Client Secret, and API Key

## Development

Run both frontend and backend:
```bash
npm run dev
```

Or run them separately:
```bash
# Backend only
npm run server

# Frontend only (in another terminal)
npm start
```

## Project Structure

```
src/
├── components/         # React components
├── services/          # API services
├── types/            # TypeScript types
└── utils/            # Utility functions

server/
├── index.js          # Express server
├── routes/           # API routes
└── services/         # MeshConnect integration
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/mesh/link-token` - Generate MeshConnect link token
- `POST /api/mesh/accounts` - Get account information
- `POST /api/mesh/transfer` - Execute transfers

## Supported Connections

- **Coinbase** (CEX)
- **Rainbow Wallet** (Self-custody on Base network)

## Learn More

- [MeshConnect Documentation](https://docs.meshconnect.com/)
- [MeshConnect Workshop](https://workshop.meshconnect.com/)
- [Interactive Demo](https://dashboard.meshconnect.com/demos)
