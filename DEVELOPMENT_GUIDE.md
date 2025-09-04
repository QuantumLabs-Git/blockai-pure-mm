# BlockAI Pure MM - Long-term Development & Deployment Guide

## 🏗️ Production Architecture

### Infrastructure Stack
- **AWS ECS Fargate**: Serverless containers for auto-scaling
- **Application Load Balancer**: High availability across multiple AZs
- **RDS PostgreSQL**: Production database with automated backups
- **S3**: Persistent file storage
- **CloudWatch**: Monitoring and logging
- **GitHub Actions**: CI/CD pipeline

### Why This Architecture?

1. **Scalability**: Auto-scales from 1 to 100+ containers based on load
2. **Cost-Effective**: Pay only for what you use (Fargate Spot saves 70%)
3. **Zero Maintenance**: No servers to manage
4. **High Availability**: Multi-AZ deployment
5. **Easy Updates**: Git push triggers automatic deployment
6. **Rollback**: Automatic rollback on failures

## 🚀 Initial Setup (One-Time)

### 1. Deploy Infrastructure

```bash
# Deploy the simplified CloudFormation stack
aws cloudformation create-stack \
  --stack-name blockai-infrastructure \
  --template-body file://aws-infrastructure-simple.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Wait for completion (10-15 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name blockai-infrastructure

# Get outputs
aws cloudformation describe-stacks \
  --stack-name blockai-infrastructure \
  --query 'Stacks[0].Outputs' \
  --output table
```

### 2. Create ECS Service

```bash
# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster blockai-cluster \
  --service-name blockai-mm-service \
  --task-definition blockai-mm-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxx,subnet-yyy],
    securityGroups=[sg-xxx],
    assignPublicIp=ENABLED
  }" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=blockai-app,containerPort=5000"
```

### 3. Configure GitHub Secrets

In your GitHub repository settings, add:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## 📝 Development Workflow

### Branch Strategy

```
main (production)
  ├── develop (staging)
  ├── feature/user-auth
  ├── feature/new-trading-algo
  └── hotfix/critical-bug
```

### Daily Development

1. **Create Feature Branch**
```bash
git checkout -b feature/your-feature
```

2. **Make Changes & Test Locally**
```bash
# Run locally
python app.py

# Or use Docker
docker-compose up
```

3. **Push to GitHub**
```bash
git add .
git commit -m "feat: add new trading algorithm"
git push origin feature/your-feature
```

4. **Create Pull Request**
- GitHub Actions runs tests automatically
- Code review by team
- Merge to main

5. **Automatic Deployment**
- Merge to main triggers deployment
- Takes 3-5 minutes
- Zero downtime deployment

## 🔄 Continuous Updates

### Adding New Features

1. **Backend Changes** (Python/Flask)
```python
# app.py or new module
@app.route('/api/new-feature')
def new_feature():
    # Your code here
    pass
```

2. **Frontend Changes** (Templates/Static)
```html
<!-- Templates/new_feature.html -->
{% extends "base.html" %}
{% block content %}
  <!-- Your UI here -->
{% endblock %}
```

3. **Database Changes**
```sql
-- migrations/001_add_new_table.sql
CREATE TABLE new_feature (
  id SERIAL PRIMARY KEY,
  data JSONB
);
```

### Environment Variables

Add new configs in multiple places:

1. **Local Development** (.env)
```bash
NEW_API_KEY=your-key-here
```

2. **GitHub Secrets** (for CI/CD)
```bash
gh secret set NEW_API_KEY
```

3. **AWS Systems Manager**
```bash
aws ssm put-parameter \
  --name /blockai/new_api_key \
  --value "your-key" \
  --type SecureString
```

## 🔍 Monitoring & Debugging

### View Logs
```bash
# Real-time logs
aws logs tail /ecs/blockai-mm --follow

# Search logs
aws logs filter-log-events \
  --log-group-name /ecs/blockai-mm \
  --filter-pattern "ERROR"
```

### Monitor Performance
```bash
# View metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=blockai-mm-service \
  --statistics Average \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600
```

### SSH into Container (for debugging)
```bash
# Use ECS Exec
aws ecs execute-command \
  --cluster blockai-cluster \
  --task <task-id> \
  --container blockai-app \
  --interactive \
  --command "/bin/bash"
```

## 📈 Scaling

### Auto-Scaling Configuration
```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/blockai-cluster/blockai-mm-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10

# Add scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/blockai-cluster/blockai-mm-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

## 🔐 Security Best Practices

1. **Secrets Management**
   - Never commit secrets
   - Use AWS Secrets Manager
   - Rotate keys regularly

2. **Container Security**
   - Scan images for vulnerabilities
   - Use minimal base images
   - Run as non-root user

3. **Network Security**
   - Use private subnets for containers
   - Restrict security groups
   - Enable VPC Flow Logs

## 🚨 Disaster Recovery

### Backup Strategy
- **Database**: Automated daily backups (7-day retention)
- **Code**: Git repository
- **Files**: S3 versioning enabled
- **Infrastructure**: CloudFormation templates

### Recovery Procedures
```bash
# Restore database from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier blockai-db-restored \
  --db-snapshot-identifier <snapshot-id>

# Rollback deployment
aws ecs update-service \
  --cluster blockai-cluster \
  --service blockai-mm-service \
  --task-definition blockai-mm-task:previous-version \
  --force-new-deployment
```

## 💰 Cost Optimization

### Current Estimated Costs (Monthly)
- ECS Fargate (2 containers): ~$20
- ALB: ~$20
- RDS (t3.micro): ~$15
- S3: ~$5
- CloudWatch: ~$10
- **Total**: ~$70/month

### Cost Saving Tips
1. Use Fargate Spot for non-critical tasks (70% savings)
2. Schedule dev environments to shut down at night
3. Use S3 lifecycle policies for old files
4. Reserved capacity for predictable workloads

## 📚 Additional Resources

### Useful Commands
```bash
# Update service with new image
./scripts/deploy.sh

# View all running tasks
aws ecs list-tasks --cluster blockai-cluster

# Force new deployment
aws ecs update-service \
  --cluster blockai-cluster \
  --service blockai-mm-service \
  --force-new-deployment

# Scale manually
aws ecs update-service \
  --cluster blockai-cluster \
  --service blockai-mm-service \
  --desired-count 5
```

### Documentation
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Flask Production](https://flask.palletsprojects.com/deploying/)

## 🎯 Next Steps for Your Team

1. **Week 1**: Deploy infrastructure, test basic functionality
2. **Week 2**: Set up monitoring dashboards, alerts
3. **Week 3**: Implement auto-scaling, performance testing
4. **Week 4**: Security audit, penetration testing
5. **Ongoing**: Feature development using CI/CD pipeline

## Support

For issues:
1. Check CloudWatch logs
2. Review GitHub Actions logs
3. Open issue on GitHub
4. Contact AWS support (if needed)