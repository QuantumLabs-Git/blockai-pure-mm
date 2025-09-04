# BlockAI Pure MM - Full WebApp Package

This is the complete, self-contained WebApp folder that includes all necessary components for the BlockAI Pure MM application.

## Directory Structure

```
WebApp/
├── client/              # React frontend application
│   ├── src/            # React source code
│   ├── public/         # Static assets
│   └── package.json    # Frontend dependencies
│
├── server/             # Express.js backend application
│   ├── src/            # Server source code
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Business logic
│   │   └── models/     # Database models
│   └── package.json    # Backend dependencies
│
├── flask-app/          # Original Flask application (legacy)
│   ├── app.py          # Main Flask application
│   ├── Static/         # Static files (CSS, JS, images)
│   ├── Templates/      # HTML templates
│   └── *.py            # Python utility scripts
│
├── solana-warmup/      # Solana wallet warmup TypeScript scripts
│   ├── index.ts        # Main warmup script
│   ├── config.ts       # Configuration
│   ├── jupiter_api.ts  # Jupiter DEX integration
│   └── package.json    # TypeScript dependencies
│
├── modules/            # Python modules
│   └── token_manager.py # Token management utilities
│
└── shared/             # Shared types and constants
```

## Main Application (React + Express)

The modern web application uses:
- **Frontend**: React with Vite
- **Backend**: Express.js with MongoDB
- **Authentication**: JWT tokens
- **Real-time**: Socket.io

### Features:
- Multi-chain wallet management (Ethereum, BSC, Base, Solana)
- Many-to-Many transfers (fully functional on all chains)
- Token management and trading
- DEX/CEX market making
- Privacy transfers
- Wallet warmup automation

## Legacy Flask Application

The `flask-app` folder contains the original Python-based application with:
- Wallet generation for multiple blockchains
- Solana warmup integration
- Excel file generation for wallet management

## Running the Application

### Modern Web App (Recommended)
```bash
cd WebApp
npm install          # Install dependencies
npm run dev         # Run development server
```

### Legacy Flask App
```bash
cd WebApp/flask-app
pip install -r requirements-file.txt
python app.py
```

## Environment Variables

Create a `.env` file in the server directory with:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/blockai

# Authentication
JWT_SECRET=your-secret-key

# Blockchain RPC Endpoints
SOLANA_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
ETHEREUM_RPC_ENDPOINT=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
BSC_RPC_ENDPOINT=https://bsc-dataseed1.binance.org
BASE_RPC_ENDPOINT=https://mainnet.base.org
```

## Important Notes

1. **Self-Contained**: This WebApp folder contains all necessary files and can be moved as a complete unit
2. **Two Applications**: Contains both the modern React/Express app and the legacy Flask app
3. **Solana Warmup**: The TypeScript warmup scripts are integrated with both applications
4. **Many-to-Many Transfers**: Fully functional on all supported blockchains with real transaction execution

## Security

- Private keys are never stored on the server
- All sensitive operations happen client-side
- Encrypted wallet storage using AES-256-GCM
- JWT authentication with secure session management