# Multi-stage build for Python and Node.js application
FROM python:3.9-slim as python-base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

WORKDIR /app

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Node.js package files and install
COPY package*.json ./
RUN npm ci --only=production

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY *.ts ./
COPY Pumpfun-bundler-20-main ./Pumpfun-bundler-20-main

# Build TypeScript files
RUN npx tsc

# Copy Python application files
COPY app.py .
COPY *.py ./
COPY Modules ./Modules
COPY Templates ./Templates
COPY Static ./Static

# Create necessary directories
RUN mkdir -p Static/downloads Static/instance_states Static/instance_states/features temp

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--threads", "2", "--timeout", "120", "app:app"]