# BlockAI Pure MM - Deployment Guide

## Overview
This guide will walk you through deploying BlockAI Pure MM to AWS using GitHub Actions for CI/CD and Supabase for the database backend.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub Account** for version control and CI/CD
3. **Supabase Account** for database and authentication
4. **Domain Name** (optional, for custom domain)
5. **Local Development Tools**:
   - Git
   - AWS CLI
   - Docker
   - Node.js 18+
   - Python 3.9+

## Step-by-Step Deployment

### 1. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Navigate to SQL Editor and run the schema from `supabase_schema.sql`
3. Note down your credentials:
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_ANON_KEY`: Your anon/public key
   - `SUPABASE_SERVICE_KEY`: Your service role key

### 2. Prepare GitHub Repository

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: BlockAI Pure MM"

# Create repository on GitHub (via GitHub CLI or web interface)
gh repo create blockai-pure-mm --public

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/blockai-pure-mm.git
git branch -M main
git push -u origin main
```

### 3. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_KEY`: Your Supabase service key
- `FLASK_SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
- `MAINNET_RPC_URL`: Your Solana RPC URL (e.g., from Helius or QuickNode)

### 4. Deploy AWS Infrastructure

```bash
# Configure AWS CLI
aws configure

# Create CloudFormation stack
aws cloudformation create-stack \
  --stack-name blockai-infrastructure \
  --template-body file://aws-infrastructure.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Wait for stack creation
aws cloudformation wait stack-create-complete \
  --stack-name blockai-infrastructure \
  --region us-east-1

# Get outputs
aws cloudformation describe-stacks \
  --stack-name blockai-infrastructure \
  --query 'Stacks[0].Outputs' \
  --region us-east-1
```

### 5. Create AWS Secrets Manager Secrets

```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name blockai/supabase_url \
  --secret-string "YOUR_SUPABASE_URL" \
  --region us-east-1

aws secretsmanager create-secret \
  --name blockai/supabase_anon_key \
  --secret-string "YOUR_SUPABASE_ANON_KEY" \
  --region us-east-1

aws secretsmanager create-secret \
  --name blockai/supabase_service_key \
  --secret-string "YOUR_SUPABASE_SERVICE_KEY" \
  --region us-east-1

aws secretsmanager create-secret \
  --name blockai/flask_secret_key \
  --secret-string "YOUR_FLASK_SECRET_KEY" \
  --region us-east-1

aws secretsmanager create-secret \
  --name blockai/mainnet_rpc_url \
  --secret-string "YOUR_MAINNET_RPC_URL" \
  --region us-east-1

aws secretsmanager create-secret \
  --name blockai/redis_url \
  --secret-string "redis://YOUR_REDIS_ENDPOINT:6379" \
  --region us-east-1
```

### 6. Update Task Definition

1. Get your AWS Account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

2. Update `task-definition.json`:
   - Replace `YOUR_ACCOUNT` with your AWS account ID
   - Replace `fs-PLACEHOLDER` with the EFS filesystem ID from CloudFormation outputs

### 7. Create Initial ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name blockai-pure-mm \
  --region us-east-1

# Get login token and login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
```

### 8. Build and Push Initial Image

```bash
# Build Docker image
docker build -t blockai-pure-mm .

# Tag image
docker tag blockai-pure-mm:latest \
  YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/blockai-pure-mm:latest

# Push image
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/blockai-pure-mm:latest
```

### 9. Create ECS Task Definition

```bash
# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region us-east-1
```

### 10. Deploy Application

Push any change to the main branch to trigger the GitHub Actions workflow:

```bash
echo "# Deployment" >> README.md
git add README.md
git commit -m "Trigger deployment"
git push origin main
```

## Post-Deployment

### 1. Verify Deployment

1. Check ECS Service:
```bash
aws ecs describe-services \
  --cluster blockai-cluster \
  --services blockai-mm-service \
  --region us-east-1
```

2. Get Load Balancer URL:
```bash
aws cloudformation describe-stacks \
  --stack-name blockai-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
  --output text \
  --region us-east-1
```

3. Visit the URL in your browser

### 2. Set Up Domain (Optional)

1. Create a Route 53 hosted zone
2. Create an A record pointing to the load balancer
3. Update load balancer with SSL certificate from AWS Certificate Manager

### 3. Enable Auto-Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/blockai-cluster/blockai-mm-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/blockai-cluster/blockai-mm-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### 4. Set Up Monitoring

1. CloudWatch Dashboards:
   - Create dashboard for ECS metrics
   - Add widgets for CPU, memory, request count

2. CloudWatch Alarms:
   - High CPU usage
   - High memory usage
   - Unhealthy targets
   - Application errors

3. Log Analysis:
   - Use CloudWatch Insights for log queries
   - Set up log metric filters for errors

## Maintenance

### Update Application

```bash
# Make changes to code
git add .
git commit -m "Update: description"
git push origin main
# GitHub Actions will automatically deploy
```

### View Logs

```bash
# View recent logs
aws logs tail /ecs/blockai-mm --follow --region us-east-1
```

### Scale Manually

```bash
# Scale to 3 instances
aws ecs update-service \
  --cluster blockai-cluster \
  --service blockai-mm-service \
  --desired-count 3 \
  --region us-east-1
```

### Database Backup

Supabase automatically handles backups, but you can also:
1. Use Supabase dashboard to download backups
2. Set up additional backup automation using Supabase API

## Security Considerations

1. **Secrets Management**: All sensitive data in AWS Secrets Manager
2. **Network Security**: Private subnets for containers
3. **Data Encryption**: EFS encryption at rest, TLS in transit
4. **Access Control**: IAM roles with least privilege
5. **Monitoring**: CloudWatch for security events
6. **Updates**: Regular dependency updates via Dependabot

## Troubleshooting

### Common Issues

1. **Container fails to start**:
   - Check CloudWatch logs
   - Verify environment variables
   - Check task definition memory/CPU

2. **Database connection issues**:
   - Verify Supabase credentials
   - Check network connectivity
   - Review RLS policies

3. **High memory usage**:
   - Review Node.js memory settings
   - Check for memory leaks
   - Scale up task definition

### Support

For issues, please:
1. Check CloudWatch logs
2. Review ECS task status
3. Verify all secrets are correctly set
4. Open an issue on GitHub with details

## Cost Optimization

1. Use Fargate Spot for non-critical tasks
2. Set up auto-scaling based on metrics
3. Use CloudWatch to identify unused resources
4. Regular review of AWS Cost Explorer

## Next Steps

1. Set up staging environment
2. Implement blue-green deployments
3. Add comprehensive monitoring
4. Set up disaster recovery plan
5. Implement rate limiting and DDoS protection