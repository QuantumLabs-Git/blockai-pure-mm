#!/bin/bash

# Simple AWS Deployment Script using ECR + App Runner
# No complex infrastructure needed!

set -e

echo "==================== Simple AWS Deployment ===================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get AWS account info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"
APP_NAME="blockai-pure-mm"

echo -e "${GREEN}AWS Account: $ACCOUNT_ID${NC}"
echo -e "${GREEN}Region: $REGION${NC}"
echo ""

# Step 1: Create ECR Repository
echo -e "${YELLOW}Step 1: Creating ECR Repository...${NC}"
aws ecr create-repository --repository-name $APP_NAME --region $REGION 2>/dev/null || echo "Repository already exists"

# Step 2: Build and Push Docker Image
echo -e "${YELLOW}Step 2: Building Docker image...${NC}"
docker build -t $APP_NAME .

echo -e "${YELLOW}Step 3: Pushing to ECR...${NC}"
# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Tag and push
docker tag $APP_NAME:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$APP_NAME:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$APP_NAME:latest

echo -e "${GREEN}✓ Docker image pushed to ECR${NC}"

# Step 3: Create App Runner Service
echo -e "${YELLOW}Step 4: Creating App Runner service...${NC}"

# Create the App Runner service configuration
cat > apprunner.yaml << EOF
version: 1.0
runtime: docker
build:
  commands:
    build:
      - echo "No build commands"
run:
  runtime-version: latest
  command: gunicorn --bind 0.0.0.0:8080 --workers 2 --threads 2 --timeout 120 app:app
  network:
    port: 8080
    env: PORT
  env:
    - name: FLASK_ENV
      value: production
    - name: NODE_OPTIONS
      value: --max-old-space-size=512
EOF

# Create secrets for sensitive data
echo -e "${YELLOW}Creating secrets in Parameter Store...${NC}"
aws ssm put-parameter --name "/blockai/flask_secret_key" --value "$(python3 -c 'import secrets; print(secrets.token_hex(32))')" --type SecureString --overwrite 2>/dev/null || true

# Create App Runner service using AWS CLI
aws apprunner create-service \
  --service-name "$APP_NAME" \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'$ACCOUNT_ID'.dkr.ecr.'$REGION'.amazonaws.com/'$APP_NAME':latest",
      "ImageConfiguration": {
        "Port": "5000",
        "RuntimeEnvironmentVariables": {
          "FLASK_ENV": "production",
          "NODE_OPTIONS": "--max-old-space-size=512"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": false
  }' \
  --region $REGION \
  --output json > apprunner-service.json

# Get the service URL
SERVICE_URL=$(aws apprunner describe-service --service-arn $(cat apprunner-service.json | grep -o '"ServiceArn": "[^"]*' | cut -d'"' -f4) --query 'Service.ServiceUrl' --output text)

echo ""
echo -e "${GREEN}==================== Deployment Complete! ====================${NC}"
echo ""
echo -e "${GREEN}Your application is deploying to:${NC}"
echo -e "${YELLOW}https://$SERVICE_URL${NC}"
echo ""
echo -e "It will take 3-5 minutes to be fully available."
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Set up Supabase and get your API keys"
echo "2. Update App Runner environment variables in AWS Console"
echo "3. Visit your application URL"
echo ""
echo -e "${GREEN}App Runner Dashboard:${NC}"
echo "https://console.aws.amazon.com/apprunner/home#/services"
echo ""