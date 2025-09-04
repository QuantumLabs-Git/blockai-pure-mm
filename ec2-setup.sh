#!/bin/bash

# EC2 Setup Script for BlockAI Pure MM
# This creates a production-ready EC2 instance with Docker and auto-deployment

set -e

echo "=========================================="
echo "  Setting up EC2 for BlockAI Pure MM"
echo "=========================================="

# Variables
REGION="us-east-1"
INSTANCE_NAME="blockai-production"
KEY_NAME="blockai-key"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Creating security group...${NC}"
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
  --group-name blockai-sg \
  --description "Security group for BlockAI Pure MM" \
  --query 'GroupId' \
  --output text \
  --region $REGION 2>/dev/null || \
  aws ec2 describe-security-groups \
  --group-names blockai-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text \
  --region $REGION)

echo "Security Group ID: $SECURITY_GROUP_ID"

# Add inbound rules
echo -e "${YELLOW}Step 2: Configuring security rules...${NC}"
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 5000 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || true

echo -e "${YELLOW}Step 3: Creating key pair...${NC}"
aws ec2 create-key-pair \
  --key-name $KEY_NAME \
  --query 'KeyMaterial' \
  --output text \
  --region $REGION > blockai-key.pem 2>/dev/null || echo "Key already exists"

if [ -f blockai-key.pem ]; then
  chmod 400 blockai-key.pem
  echo "Key saved to blockai-key.pem"
fi

echo -e "${YELLOW}Step 4: Creating EC2 user data script...${NC}"
cat > user-data.sh << 'EOF'
#!/bin/bash
# Update system
yum update -y

# Install Docker
amazon-linux-extras install docker -y
service docker start
usermod -a -G docker ec2-user
chkconfig docker on

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
yum install git -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install nodejs -y

# Clone the repository
cd /home/ec2-user
git clone https://github.com/QuantumLabs-Git/blockai-pure-mm.git
cd blockai-pure-mm

# Create .env file
cat > .env << 'ENVFILE'
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
NODE_OPTIONS=--max-old-space-size=512
MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=c3ccc39d-a8c8-40ec-880d-40ac14e92533
DEVNET_MODE=false
ENVFILE

# Build and run with Docker Compose
docker-compose up -d

# Set up auto-restart on reboot
echo "@reboot cd /home/ec2-user/blockai-pure-mm && docker-compose up -d" | crontab -u ec2-user -

# Install nginx for reverse proxy
amazon-linux-extras install nginx1 -y

# Configure nginx
cat > /etc/nginx/conf.d/blockai.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# Start nginx
systemctl enable nginx
systemctl start nginx

echo "Setup complete!"
EOF

echo -e "${YELLOW}Step 5: Launching EC2 instance...${NC}"
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id ami-0c02fb55731490381 \
  --instance-type t2.micro \
  --key-name $KEY_NAME \
  --security-group-ids $SECURITY_GROUP_ID \
  --user-data file://user-data.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
  --query 'Instances[0].InstanceId' \
  --output text \
  --region $REGION)

echo "Instance ID: $INSTANCE_ID"

echo -e "${YELLOW}Step 6: Waiting for instance to be running...${NC}"
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text \
  --region $REGION)

echo ""
echo -e "${GREEN}=========================================="
echo -e "  EC2 Instance Created Successfully!"
echo -e "==========================================${NC}"
echo ""
echo -e "${GREEN}Instance Details:${NC}"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo ""
echo -e "${GREEN}Your Application URL:${NC}"
echo "http://$PUBLIC_IP"
echo ""
echo -e "${YELLOW}Note: The application will be ready in 3-5 minutes${NC}"
echo ""
echo -e "${GREEN}SSH Access:${NC}"
echo "ssh -i blockai-key.pem ec2-user@$PUBLIC_IP"
echo ""
echo -e "${GREEN}To check logs after SSH:${NC}"
echo "docker-compose logs -f"
echo ""
echo -e "${GREEN}To update the application:${NC}"
echo "ssh -i blockai-key.pem ec2-user@$PUBLIC_IP"
echo "cd blockai-pure-mm"
echo "git pull"
echo "docker-compose restart"
echo ""