#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    BlockAI Pure MM                           ║
║              Unified Application Launcher                    ║
╚══════════════════════════════════════════════════════════════╝
`);

// Check if Redis is running
function checkRedis() {
  return new Promise((resolve) => {
    exec('redis-cli ping', (error, stdout) => {
      resolve(!error && stdout.trim() === 'PONG');
    });
  });
}

// Start Redis
async function startRedis() {
  const isRunning = await checkRedis();
  if (!isRunning) {
    console.log('🔴 Starting Redis...');
    exec('redis-server --daemonize yes', (error) => {
      if (error) {
        console.error('❌ Failed to start Redis. Please install it with: brew install redis');
        process.exit(1);
      }
    });
    // Wait for Redis to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  console.log('✅ Redis is running');
}

// Build frontend
function buildFrontend() {
  console.log('🔨 Building frontend...');
  return new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, 'client'),
      stdio: 'inherit',
      shell: true
    });
    
    build.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend built successfully');
        resolve();
      } else {
        reject(new Error(`Frontend build failed with code ${code}`));
      }
    });
  });
}

// Start unified server
async function startUnifiedServer() {
  // Start Redis first
  await startRedis();
  
  // Build frontend if not in development
  if (process.env.NODE_ENV !== 'development') {
    await buildFrontend();
  }
  
  console.log('\n🚀 Starting unified server...\n');
  
  // Set production environment
  const env = { ...process.env, NODE_ENV: 'production' };
  
  const server = spawn('node', ['src/index.js'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit',
    shell: true,
    env
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Give server time to start
  setTimeout(() => {
    console.log(`
✅ Application is ready!

🌐 Access the application at:
   http://localhost:5001

🚀 For remote access with ngrok:
   ngrok http 5001
   
   Then share the ngrok URL with your team.
   Everything (frontend + backend) is served from port 5001.

🔐 Security Note:
   - Private keys are NEVER sent to the server
   - All cryptographic operations happen in your browser
   - Keys are encrypted and stored locally on your device

Press Ctrl+C to stop the application
`);
  }, 3000);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down BlockAI Pure MM...');
  process.exit(0);
});

// Start the application
startUnifiedServer().catch(console.error);