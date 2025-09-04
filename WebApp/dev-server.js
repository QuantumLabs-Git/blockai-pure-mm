#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Change to server directory to access its dependencies
process.chdir(path.join(__dirname, 'server'));

require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8080;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    BlockAI Pure MM                           ║
║              Unified Development Server                      ║
╚══════════════════════════════════════════════════════════════╝
`);

// Start backend server
console.log('📡 Starting backend server on port 5001...');
const backend = spawn('node', ['src/index.js'], {
  cwd: __dirname,  // We're already in server directory
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: 5001 }
});

// Start frontend server
setTimeout(() => {
  console.log('\n🎨 Starting frontend on port 5173...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(path.dirname(__dirname), 'client'),  // Go up one level to WebApp, then to client
    stdio: 'inherit',
    shell: true
  });
}, 3000);

// Wait for services to start
setTimeout(() => {
  // Setup proxy middleware with specific order
  
  // 1. API routes - MUST come first
  const apiProxy = createProxyMiddleware(['/api/**', '/health', '/socket.io/**'], {
    target: 'http://localhost:5001',
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[API Proxy] ${req.method} ${req.url} -> http://localhost:5001${req.url}`);
    },
    onError: (err, req, res) => {
      console.error('[API Proxy Error]', err);
      res.status(502).json({ error: 'Backend server error' });
    }
  });

  // 2. Frontend routes - everything else
  const frontendProxy = createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true,
    logLevel: 'silent',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Frontend Proxy] ${req.method} ${req.url} -> http://localhost:5173${req.url}`);
    },
    onError: (err, req, res) => {
      console.error('[Frontend Proxy Error]', err);
      res.status(502).send('Frontend server error');
    }
  });

  // Apply middleware in correct order
  app.use(apiProxy);
  app.use(frontendProxy);

  app.listen(PORT, () => {
    console.log(`
✅ Unified development server running on port ${PORT}

🌐 Access the application at:
   http://localhost:${PORT}

🚀 For ngrok:
   ngrok http --domain=blockaipuremm.ngrok.dev ${PORT}

📍 Routing:
   /api/**     -> Backend (5001)
   /health     -> Backend (5001)
   /socket.io  -> Backend (5001)
   /**         -> Frontend (5173)
    `);
  });
}, 8000);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down BlockAI Pure MM...');
  backend.kill();
  process.exit(0);
});