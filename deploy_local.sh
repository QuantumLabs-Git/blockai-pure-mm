#!/bin/bash

# Local Deployment Script for BlockAI Pure MM
# This script helps you run the application locally with Docker

set -e

echo "==================== BlockAI Pure MM Local Deployment ===================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose is required but not installed.${NC}" >&2; exit 1; }

echo -e "${GREEN}✓ Docker installed${NC}"
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << 'EOF'
# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here-change-this

# Solana Configuration
MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=c3ccc39d-a8c8-40ec-880d-40ac14e92533
DEVNET_MODE=false

# Supabase Configuration (Optional - will use local storage if not set)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Redis URL
REDIS_URL=redis://redis:6379
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}Please edit .env file with your configuration${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p Static/downloads
mkdir -p Static/instance_states
mkdir -p Static/instance_states/features
mkdir -p temp
mkdir -p ssl

echo -e "${GREEN}✓ Directories created${NC}"

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker-compose build

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Services are running${NC}"
    echo ""
    echo -e "${GREEN}==================== Deployment Complete ====================${NC}"
    echo ""
    echo -e "Application is available at: ${GREEN}http://localhost:5000${NC}"
    echo ""
    echo -e "To view logs: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "To stop: ${YELLOW}docker-compose down${NC}"
    echo -e "To restart: ${YELLOW}docker-compose restart${NC}"
    echo ""
else
    echo -e "${RED}✗ Services failed to start${NC}"
    echo -e "Check logs with: docker-compose logs"
    exit 1
fi