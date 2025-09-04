#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    BlockAI Pure MM                           ║
║            Ngrok-Ready Development Server                    ║
╚══════════════════════════════════════════════════════════════╝
`);

console.log('🚀 Starting ngrok-ready development server...\n');

// Start backend server
console.log('📡 Starting backend server on port 5001...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'pipe',
  shell: true
});

backend.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Server running on port 5001')) {
    console.log('✅ Backend server started');
  }
});

backend.stderr.on('data', (data) => {
  console.error(`[Backend Error] ${data}`);
});

// Start frontend after backend
setTimeout(() => {
  console.log('\n🎨 Starting frontend on port 5173...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'pipe',
    shell: true
  });

  frontend.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('ready in')) {
      console.log('✅ Frontend started');
      
      // Start unified proxy server
      setTimeout(() => {
        console.log('\n🔀 Starting unified proxy server...');
        const proxy = spawn('node', ['src/unified-proxy.js'], {
          cwd: path.join(__dirname, 'server'),
          stdio: 'inherit',
          shell: true
        });
      }, 3000);
    }
  });

  frontend.stderr.on('data', (data) => {
    // Ignore Vite warnings
    const output = data.toString();
    if (!output.includes('deprecation')) {
      console.error(`[Frontend Error] ${output}`);
    }
  });
}, 5000);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down BlockAI Pure MM...');
  process.exit(0);
});