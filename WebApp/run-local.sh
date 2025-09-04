#!/bin/bash

echo "🚀 Starting BlockAI Pure MM Web Application..."
echo ""

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB is not installed. Please install MongoDB first."
    echo "   Mac: brew install mongodb-community"
    echo "   Ubuntu: sudo apt install mongodb"
    exit 1
fi

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed. Please install Redis first."
    echo "   Mac: brew install redis"
    echo "   Ubuntu: sudo apt install redis-server"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ All prerequisites installed"
echo ""

# Start MongoDB
echo "📦 Starting MongoDB..."
mongod --fork --logpath /tmp/mongodb.log --dbpath /tmp/mongodb || echo "MongoDB might already be running"

# Start Redis
echo "📦 Starting Redis..."
redis-server --daemonize yes || echo "Redis might already be running"

# Install server dependencies
echo ""
echo "📦 Installing server dependencies..."
cd server
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file - please update with your settings"
fi

# Install client dependencies
echo ""
echo "📦 Installing client dependencies..."
cd ../client
npm install

# Start the application
echo ""
echo "🚀 Starting the application..."
echo ""
echo "Open two terminal windows:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd $(pwd)/../server"
echo "  npm run dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd $(pwd)"
echo "  npm run dev"
echo ""
echo "Then access the application at:"
echo "  Local: http://localhost:5173"
echo "  Network: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}'):5173"
echo ""
echo "Press Ctrl+C to stop"