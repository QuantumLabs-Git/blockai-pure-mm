#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    BlockAI Pure MM                           ║
║                 Application Launcher                         ║
╚══════════════════════════════════════════════════════════════╝
`);

const args = process.argv.slice(2);
const mode = args[0] || 'dev';

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

// Development mode with proxy
async function startDevWithProxy() {
  await startRedis();
  
  console.log('\n🚀 Starting development mode with unified proxy...\n');
  
  // Start backend
  console.log('📡 Starting backend server...');
  const backend = spawn('npm', ['run', 'dev:no-services'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'pipe',
    shell: true
  });

  backend.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Server running on port')) {
      console.log('✅ Backend started');
    }
  });

  // Start frontend
  setTimeout(() => {
    console.log('🎨 Starting frontend...');
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'client'),
      stdio: 'pipe',
      shell: true
    });

    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:')) {
        console.log('✅ Frontend started');
        
        // Start proxy after both are ready
        setTimeout(() => {
          console.log('🔀 Starting proxy server...');
          const proxy = spawn('node', ['src/dev-proxy.js'], {
            cwd: path.join(__dirname, 'server'),
            stdio: 'inherit',
            shell: true
          });
        }, 2000);
      }
    });
  }, 5000);
}

// Production mode
async function startProduction() {
  await startRedis();
  
  // Build frontend
  console.log('🔨 Building frontend...');
  await new Promise((resolve, reject) => {
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
  
  console.log('\n🚀 Starting production server...\n');
  
  const env = { ...process.env, NODE_ENV: 'production' };
  const server = spawn('node', ['src/index.js'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit',
    shell: true,
    env
  });
  
  setTimeout(() => {
    console.log(`
✅ Application is ready in production mode!

🌐 Access the application at:
   http://localhost:5001

🚀 For remote access with ngrok:
   ngrok http 5001
   
   Then share the ngrok URL with your team.
   Everything is served from a single port (5001).
`);
  }, 3000);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down BlockAI Pure MM...');
  process.exit(0);
});

// Main
async function main() {
  if (mode === 'dev') {
    console.log('Starting in development mode with proxy...');
    console.log('This allows you to use a single ngrok tunnel on port 3000');
    await startDevWithProxy();
  } else if (mode === 'production' || mode === 'prod') {
    console.log('Starting in production mode...');
    await startProduction();
  } else {
    console.log(`
Usage: node start.js [mode]

Modes:
  dev        - Development mode with proxy (recommended for ngrok)
              Frontend and backend run separately with a proxy on port 3000
              Use: ngrok http 3000
              
  production - Production mode
              Frontend is built and served by backend on port 5001
              Use: ngrok http 5001

Default: dev
`);
    process.exit(0);
  }
}

main().catch(console.error);