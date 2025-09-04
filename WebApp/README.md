# BlockAI Pure MM - Web Application

A secure, distributed market making platform with client-side key management.

## Architecture Overview

This web application implements a secure client-server architecture where:

- **Private keys never leave the user's device**
- **All transaction signing happens client-side**
- **Server only receives and broadcasts signed transactions**
- **Keys are encrypted and stored in XLS files on user's device**

## Security Features

### Client-Side Security
- Private keys encrypted using AES-256-GCM
- Keys stored in encrypted XLS files
- Web Crypto API for secure operations
- Automatic memory cleanup after operations
- 15-minute inactivity auto-lock
- No browser storage of sensitive data

### Server-Side Security
- JWT-based authentication
- Rate limiting on all API endpoints
- Account lockout after failed attempts
- Session management with Redis
- HTTPS enforcement in production
- Helmet.js for security headers

## Project Structure

```
WebApp/
├── server/                 # Backend server
│   ├── src/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utility functions
│   │   └── index.js       # Server entry point
│   └── package.json
│
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── crypto/        # Crypto utilities
│   │   ├── services/      # API services
│   │   └── main.jsx       # Client entry point
│   └── package.json
│
└── shared/                 # Shared types/constants
    ├── types/
    └── constants/
```

## Key Management Flow

1. **Initial Setup**
   - User uploads XLS file with private keys
   - Enter encryption password
   - Keys are encrypted client-side
   - Encrypted data saved to new XLS file

2. **Daily Usage**
   - Upload encrypted XLS file
   - Enter password to decrypt
   - Keys loaded into memory only
   - Automatic cleanup after use

3. **Transaction Signing**
   - Transaction prepared server-side
   - Sent to client for signing
   - Signed locally with private key
   - Signed transaction sent back to server
   - Server broadcasts to blockchain

## Installation

### Prerequisites
- Node.js 18+
- MongoDB
- Redis

### Server Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Client Setup
```bash
cd client
npm install
npm run dev
```

## Environment Variables

### Server (.env)
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/blockai-mm
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
CLIENT_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Client (.env)
```
VITE_API_URL=http://localhost:3000/api
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Wallet Operations
- `POST /api/wallet/generate` - Generate new wallets
- `POST /api/wallet/prepare-transaction` - Prepare unsigned transaction
- `POST /api/wallet/broadcast` - Broadcast signed transaction

### Market Making
- `POST /api/warmup/start` - Start wallet warmup
- `POST /api/warmup/stop` - Stop wallet warmup
- `GET /api/warmup/status` - Get warmup status
- `GET /api/warmup/logs` - Stream warmup logs

## Security Best Practices

1. **Never store private keys on server**
2. **Always use HTTPS in production**
3. **Implement proper CORS policies**
4. **Use strong encryption passwords**
5. **Regular security audits**
6. **Keep dependencies updated**

## Development

### Running Tests
```bash
# Server tests
cd server && npm test

# Client tests
cd client && npm test
```

### Building for Production
```bash
# Build client
cd client && npm run build

# Start server in production
cd server && NODE_ENV=production npm start
```

## License

Proprietary - BlockAI Pure MM