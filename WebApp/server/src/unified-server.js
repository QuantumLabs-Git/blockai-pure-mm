require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.UNIFIED_PORT || 8080;

// Proxy /health endpoint to backend
app.use('/health', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  logLevel: 'info'
}));

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  logLevel: 'info'
}));

// Proxy WebSocket connections
app.use('/socket.io', createProxyMiddleware({
  target: 'http://localhost:5001',
  ws: true,
  changeOrigin: true,
  logLevel: 'info'
}));

// Proxy everything else to Vite dev server (frontend)
app.use('/', createProxyMiddleware({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true,
  logLevel: 'info'
}));

app.listen(PORT, () => {
  console.log(`
✅ Unified server running on port ${PORT}

🌐 Access the application at:
   http://localhost:${PORT}

🚀 For ngrok:
   ngrok http ${PORT}
   
This unified server properly proxies both frontend and backend.
All requests go through port ${PORT}.
  `);
});