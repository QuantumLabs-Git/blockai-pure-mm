#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    BlockAI Pure MM                           ║
║            Simple Development Server                         ║
╚══════════════════════════════════════════════════════════════╝
`);

// First, start the backend server
console.log('📡 Starting backend server on port 5001...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true
});

// Give backend time to start
setTimeout(() => {
  console.log('\n🎨 Starting frontend on port 5173...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'client'), 
    stdio: 'inherit',
    shell: true
  });

  // After both are running, start a simple express proxy
  setTimeout(() => {
    const app = express();
    const PORT = 8080;

    // Log all requests
    app.use((req, res, next) => {
      console.log(`[Proxy] ${req.method} ${req.url}`);
      next();
    });

    // API and backend routes
    app.use(['/api', '/health', '/socket.io'], createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      ws: true,
      onError: (err, req, res) => {
        console.error('[Proxy Error]', err);
        res.status(502).send('Backend not available');
      }
    }));

    // Everything else goes to frontend
    app.use('/', createProxyMiddleware({
      target: 'http://localhost:5173',
      changeOrigin: true,
      ws: true,
      onError: (err, req, res) => {
        console.error('[Proxy Error]', err);
        res.status(502).send('Frontend not available');
      }
    }));

    app.listen(PORT, () => {
      console.log(`
✅ Simple proxy server running on port ${PORT}

🌐 Access at: http://localhost:${PORT}
🚀 For ngrok: ngrok http ${PORT}

All /api requests will be proxied to backend on port 5001
All other requests will be proxied to frontend on port 5173
      `);
    });
  }, 5000);
}, 5000);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});