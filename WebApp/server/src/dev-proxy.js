const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PROXY_PORT || 3000;

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
}));

// Proxy WebSocket connections
app.use('/socket.io', createProxyMiddleware({
  target: 'http://localhost:5001',
  ws: true,
  changeOrigin: true,
}));

// Proxy everything else to frontend
app.use('/', createProxyMiddleware({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true,
}));

app.listen(PORT, () => {
  console.log(`
✅ Development proxy server running on port ${PORT}

🌐 Access the application at:
   http://localhost:${PORT}

🚀 For remote access with ngrok:
   ngrok http ${PORT}
   
   This will tunnel both frontend and backend through a single URL.
  `);
});