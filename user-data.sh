#!/bin/bash
# EC2 User Data Script - Auto-setup for BlockAI Pure MM

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
cat > .env << 'EOF'
FLASK_ENV=production
SECRET_KEY=change-this-to-random-secret-key-$(openssl rand -hex 16)
NODE_OPTIONS=--max-old-space-size=512
MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=c3ccc39d-a8c8-40ec-880d-40ac14e92533
DEVNET_MODE=false
REDIS_URL=redis://redis:6379
EOF

# Build and run with Docker Compose
docker-compose up -d

# Set up auto-restart on reboot
(crontab -l 2>/dev/null; echo "@reboot cd /home/ec2-user/blockai-pure-mm && docker-compose up -d") | crontab -u ec2-user -

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
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX

# Remove default nginx config
rm -f /etc/nginx/conf.d/default.conf

# Start nginx
systemctl enable nginx
systemctl start nginx

# Set permissions
chown -R ec2-user:ec2-user /home/ec2-user/blockai-pure-mm

echo "Setup complete! Application starting..."