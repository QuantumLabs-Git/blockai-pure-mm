# Deployment Guide - BlockAI Pure MM Web Application

## Overview

This guide covers deployment options for the BlockAI Pure MM web application, from local hosting to production deployment.

## Local Hosting (Team Access)

### Quick Start for Local Network Access

1. **Install Dependencies**
```bash
# Install server dependencies
cd WebApp/server
npm install

# Install client dependencies
cd ../client
npm install
```

2. **Configure Environment**
```bash
# Server configuration
cd WebApp/server
cp .env.example .env
# Edit .env with your settings
```

3. **Start the Application**
```bash
# Terminal 1 - Start MongoDB
mongod

# Terminal 2 - Start Redis
redis-server

# Terminal 3 - Start Backend
cd WebApp/server
npm run dev

# Terminal 4 - Start Frontend
cd WebApp/client
npm run dev
```

4. **Access from Team Computers**
- Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Team members access: `http://YOUR_LOCAL_IP:5173`

### Secure Local Network Setup

1. **Configure Firewall**
```bash
# Allow ports (Mac example)
sudo pfctl -e
echo "pass in proto tcp from any to any port 3000" | sudo pfctl -f -
echo "pass in proto tcp from any to any port 5173" | sudo pfctl -f -
```

2. **Use HTTPS Locally**
```bash
# Generate self-signed certificate
cd WebApp
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

3. **Configure Vite for HTTPS**
```javascript
// client/vite.config.js
export default {
  server: {
    https: {
      key: fs.readFileSync('../key.pem'),
      cert: fs.readFileSync('../cert.pem'),
    },
    host: '0.0.0.0',
    port: 5173
  }
}
```

## Production Deployment

### Option 1: Single Server Deployment

1. **Server Requirements**
- Ubuntu 20.04+ or similar
- 4GB RAM minimum
- 20GB storage
- Node.js 18+
- MongoDB 5.0+
- Redis 6.0+
- Nginx

2. **Setup Script**
```bash
#!/bin/bash
# save as setup.sh

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt update
sudo apt install -y mongodb-org

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Setup firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

3. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/your-repo/blockai-pure-mm.git
cd blockai-pure-mm/WebApp

# Install dependencies
cd server && npm install --production
cd ../client && npm install && npm run build

# Setup PM2
cd ../server
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

4. **Nginx Configuration**
```nginx
# /etc/nginx/sites-available/blockai
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/blockai/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Option 2: Docker Deployment

1. **Docker Compose Configuration**
```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    restart: always
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

  redis:
    image: redis:6-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}

  backend:
    build: ./server
    restart: always
    depends_on:
      - mongodb
      - redis
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/blockai
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    ports:
      - "3000:3000"

  frontend:
    build: ./client
    restart: always
    depends_on:
      - backend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl

volumes:
  mongo_data:
```

2. **Deploy with Docker**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Update
docker-compose pull
docker-compose up -d
```

### Option 3: Cloud Deployment (AWS)

1. **Infrastructure Setup**
```bash
# Use AWS CDK or Terraform
npm install -g aws-cdk
cdk init app --language typescript
```

2. **AWS Architecture**
- EC2 or ECS for application
- RDS or DocumentDB for database
- ElastiCache for Redis
- CloudFront for CDN
- Route 53 for DNS
- ACM for SSL certificates

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables properly set
- [ ] Database authentication enabled
- [ ] Redis password configured
- [ ] Firewall rules configured
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting setup
- [ ] Rate limiting configured
- [ ] CORS properly configured

## Monitoring

1. **Application Monitoring**
```bash
# PM2 monitoring
pm2 monit

# Custom health endpoint
curl https://your-domain.com/api/health
```

2. **Log Management**
```bash
# Application logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Backup Strategy

1. **Database Backup**
```bash
# MongoDB backup script
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://localhost:27017/blockai" --out="/backups/mongo_$TIMESTAMP"

# Compress and upload to S3
tar -czf "/backups/mongo_$TIMESTAMP.tar.gz" "/backups/mongo_$TIMESTAMP"
aws s3 cp "/backups/mongo_$TIMESTAMP.tar.gz" s3://your-backup-bucket/
```

2. **Automated Backups**
```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

## Scaling Considerations

1. **Horizontal Scaling**
- Use load balancer (Nginx, HAProxy)
- Multiple backend instances
- Redis Sentinel for HA
- MongoDB Replica Set

2. **Performance Optimization**
- Enable gzip compression
- Implement caching strategy
- Use CDN for static assets
- Database indexing

## Support

For deployment support, contact the BlockAI Pure MM team.