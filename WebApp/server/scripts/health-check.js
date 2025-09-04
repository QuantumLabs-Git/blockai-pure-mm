const http = require('http');

const checkHealth = () => {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Backend server is healthy');
      process.exit(0);
    } else {
      console.error('❌ Backend server returned status:', res.statusCode);
      process.exit(1);
    }
  });

  req.on('error', (err) => {
    console.error('❌ Backend server is not responding:', err.message);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Backend server health check timed out');
    req.destroy();
    process.exit(1);
  });

  req.end();
};

// Check immediately
checkHealth();