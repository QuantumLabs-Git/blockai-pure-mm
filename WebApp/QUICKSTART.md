# Quick Start Guide - BlockAI Pure MM Web App

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **MongoDB** - [Download](https://www.mongodb.com/try/download/community)
3. **Redis** - [Download](https://redis.io/download/)

## Step 1: Install Prerequisites (if needed)

### Mac:
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Install Redis
brew install redis
brew services start redis

# Install Node.js
brew install node
```

### Windows (using WSL2):
```bash
# Update packages
sudo apt update

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod

# Install Redis
sudo apt install redis-server
sudo systemctl start redis-server

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

## Step 2: Setup the Application

```bash
# Navigate to the WebApp directory
cd /Volumes/PRO-G40/Development/blockai-pure-mm/WebApp

# Setup backend
cd server
npm install
cp .env.example .env

# Setup frontend
cd ../client
npm install
```

## Step 3: Run the Application

### Option A: Using the run script (Mac/Linux)
```bash
cd /Volumes/PRO-G40/Development/blockai-pure-mm/WebApp
./run-local.sh
```

### Option B: Manual startup

**Terminal 1 - Backend:**
```bash
cd /Volumes/PRO-G40/Development/blockai-pure-mm/WebApp/server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /Volumes/PRO-G40/Development/blockai-pure-mm/WebApp/client
npm run dev
```

## Step 4: Access the Application

1. Open your browser to: http://localhost:5173
2. Create an account (email verification is disabled in dev mode)
3. Login with your credentials

## Step 5: Team Access

To allow team members to access from their computers:

1. Find your local IP address:
   - Mac: `ipconfig getifaddr en0`
   - Windows: `ipconfig` (look for IPv4 Address)

2. Team members can access:
   `http://YOUR_IP_ADDRESS:5173`

## Troubleshooting

### MongoDB not starting?
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start manually
mongod --dbpath /tmp/mongodb
```

### Redis not starting?
```bash
# Check if Redis is running
ps aux | grep redis

# Start manually
redis-server
```

### Port already in use?
```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Dependencies not installing?
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Default Ports

- Frontend: http://localhost:5173
- Backend API: http://localhost:5001
- MongoDB: mongodb://localhost:27017
- Redis: redis://localhost:6379

## Security Note

This is a development setup. For production:
- Use proper SSL certificates
- Set strong JWT secrets in .env
- Enable email verification
- Use production MongoDB/Redis instances
- Follow the DEPLOYMENT.md guide