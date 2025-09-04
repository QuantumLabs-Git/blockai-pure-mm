const httpProxy = require('http-proxy');
const http = require('http');
const url = require('url');

const PORT = process.env.UNIFIED_PORT || 8080;

// Create proxy instances
const apiProxy = httpProxy.createProxyServer({
  target: 'http://localhost:5001',
  changeOrigin: true
});

const frontendProxy = httpProxy.createProxyServer({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true
});

// Handle proxy errors
apiProxy.on('error', (err, req, res) => {
  console.error('API Proxy error:', err);
  res.writeHead(502, { 'Content-Type': 'text/plain' });
  res.end('API Backend not available');
});

frontendProxy.on('error', (err, req, res) => {
  console.error('Frontend Proxy error:', err);
  res.writeHead(502, { 'Content-Type': 'text/plain' });
  res.end('Frontend not available');
});

// Create the server
const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  
  // Log all requests for debugging
  console.log(`${req.method} ${req.url} -> ${pathname}`);
  
  // Route to appropriate proxy
  if (pathname.startsWith('/api') || pathname.startsWith('/health') || pathname.startsWith('/socket.io')) {
    // Backend routes
    console.log('  -> Routing to backend (5001)');
    apiProxy.web(req, res);
  } else {
    // Frontend routes
    console.log('  -> Routing to frontend (5173)');
    frontendProxy.web(req, res);
  }
});

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
  const pathname = url.parse(req.url).pathname;
  
  if (pathname.startsWith('/socket.io')) {
    apiProxy.ws(req, socket, head);
  } else {
    frontendProxy.ws(req, socket, head);
  }
});

server.listen(PORT, () => {
  console.log(`
✅ Unified proxy server running on port ${PORT}

🌐 Access the application at:
   http://localhost:${PORT}

🚀 For ngrok:
   ngrok http ${PORT}
   
This unified proxy properly routes:
- /api/* -> Backend (port 5001)
- /health -> Backend (port 5001)
- /socket.io/* -> Backend WebSocket (port 5001)
- Everything else -> Frontend (port 5173)

All requests are logged to help debug issues.
  `);
});