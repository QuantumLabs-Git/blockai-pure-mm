#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    BlockAI Pure MM                           ║
║            Development Server (Ngrok-Ready)                  ║
╚══════════════════════════════════════════════════════════════╝
`);

console.log('🚀 Starting development servers...\n');

// Start backend server
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
  
  // Start unified proxy after both are running
  setTimeout(() => {
    console.log('\n🔀 Starting unified proxy server on port 8080...');
    const proxy = spawn('node', ['server/src/unified-server.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });
    
    console.log(`
✅ All servers started!

🌐 Access the application at:
   Local:  http://localhost:8080
   Ngrok:  ngrok http 8080

📝 Use your custom domain:
   ngrok http --domain=blockaipuremm.ngrok.dev 8080
    `);
  }, 5000);
}, 5000);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down BlockAI Pure MM...');
  process.exit(0);
});