#!/bin/bash

# Deploy BlockAI Pure MM using AWS App Runner
# This gives you a public URL immediately!

set -e

echo "======================================"
echo "  Deploying BlockAI Pure MM to AWS"
echo "======================================"

# Variables
REGION="us-east-1"
SERVICE_NAME="blockai-pure-mm"
ECR_REPO="894059646844.dkr.ecr.us-east-1.amazonaws.com/blockai-pure-mm"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
docker build -t blockai-pure-mm .

echo -e "${YELLOW}Step 2: Tagging for ECR...${NC}"
docker tag blockai-pure-mm:latest ${ECR_REPO}:latest

echo -e "${YELLOW}Step 3: Logging into ECR...${NC}"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO}

echo -e "${YELLOW}Step 4: Pushing to ECR...${NC}"
docker push ${ECR_REPO}:latest

echo -e "${YELLOW}Step 5: Creating App Runner service...${NC}"

# Create the App Runner service
aws apprunner create-service \
  --service-name "${SERVICE_NAME}" \
  --source-configuration "{
    \"ImageRepository\": {
      \"ImageIdentifier\": \"${ECR_REPO}:latest\",
      \"ImageConfiguration\": {
        \"Port\": \"5000\",
        \"RuntimeEnvironmentVariables\": {
          \"FLASK_ENV\": \"production\",
          \"NODE_OPTIONS\": \"--max-old-space-size=512\",
          \"SECRET_KEY\": \"$(openssl rand -hex 32)\"
        }
      },
      \"ImageRepositoryType\": \"ECR\"
    },
    \"AutoDeploymentsEnabled\": false,
    \"AuthenticationConfiguration\": {
      \"AccessRoleArn\": \"arn:aws:iam::894059646844:role/blockai-minimal-TaskExecutionRole-GyeS4UU3bkPE\"
    }
  }" \
  --region ${REGION} \
  --output json > apprunner-output.json

# Extract the service ARN
SERVICE_ARN=$(cat apprunner-output.json | grep -o '"ServiceArn": "[^"]*' | cut -d'"' -f4)

echo -e "${YELLOW}Waiting for service to be ready...${NC}"
sleep 30

# Get the service URL
SERVICE_URL=$(aws apprunner describe-service \
  --service-arn ${SERVICE_ARN} \
  --query 'Service.ServiceUrl' \
  --output text \
  --region ${REGION})

echo ""
echo -e "${GREEN}======================================"
echo -e "  Deployment Complete!"
echo -e "======================================${NC}"
echo ""
echo -e "${GREEN}Your application URL:${NC}"
echo -e "${GREEN}https://${SERVICE_URL}${NC}"
echo ""
echo "It may take 3-5 minutes for the service to be fully available."
echo ""
echo "To check status:"
echo "aws apprunner describe-service --service-arn ${SERVICE_ARN}"
echo ""