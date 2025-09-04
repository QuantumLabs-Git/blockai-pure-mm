#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    BlockAI Pure MM                           ║
║              Unified Development Server                      ║
╚══════════════════════════════════════════════════════════════╝
`);

console.log('🚀 Starting unified development server...\n');

// Start backend server first
console.log('📡 Starting backend server...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' }
});

// Wait for backend to start, then start frontend
setTimeout(() => {
  console.log('\n🎨 Starting frontend with Vite...');
  const frontend = spawn('npm', ['run', 'dev', '--', '--host'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'inherit',
    shell: true
  });
  
  setTimeout(() => {
    console.log(`
✅ Application is ready!

🌐 Access the application at:
   http://localhost:5173

🚀 For remote access with ngrok:
   ngrok http 5173
   
   Then share the ngrok URL with your team.
   Everything works through port 5173 (Vite proxies to backend).

🔐 Security Note:
   - Private keys are NEVER sent to the server
   - All cryptographic operations happen in your browser
   - Keys are encrypted and stored locally on your device

Press Ctrl+C to stop the application
`);
  }, 5000);
}, 5000);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down BlockAI Pure MM...');
  process.exit(0);
});