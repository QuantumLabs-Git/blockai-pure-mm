#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const os = require('os');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    BlockAI Pure MM                           ║
║              Web Application Launcher                        ║
╚══════════════════════════════════════════════════════════════╝
`);

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Check if Redis is installed
function checkRedis() {
  return new Promise((resolve) => {
    exec('which redis-server', (error) => {
      resolve(!error);
    });
  });
}

// Install Redis if needed
async function installRedisIfNeeded() {
  if (!await checkRedis()) {
    console.log('📦 Redis not found. Installing Redis...');
    return new Promise((resolve) => {
      exec('brew install redis', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Failed to install Redis. Please install manually:');
          console.error('   brew install redis');
          resolve(false);
        } else {
          console.log('✅ Redis installed successfully');
          resolve(true);
        }
      });
    });
  }
  return true;
}

// Start the application
async function startApp() {
  // Check and install Redis if needed
  const redisReady = await installRedisIfNeeded();
  if (!redisReady) {
    process.exit(1);
  }

  console.log('\n🚀 Starting BlockAI Pure MM...\n');

  // Start backend
  console.log('📡 Starting backend server...');
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'pipe',
    shell: true
  });

  let backendReady = false;

  backend.stdout.on('data', (data) => {
    const output = data.toString();
    // Show backend output
    if (output.trim()) {
      console.log(`[Backend] ${output.trim()}`);
    }
    
    // Check for server ready message - updated to match winston logger output
    if ((output.includes('Server running on port') || output.includes('"message":"Server running on port')) && !backendReady) {
      backendReady = true;
      console.log('✅ Backend server started\n');
      
      // Wait a moment then start frontend
      setTimeout(() => {
        startFrontend();
      }, 2000);
    }
  });

  backend.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data}`);
  });

  backend.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    process.exit(code);
  });
}

function startFrontend() {
  console.log('🎨 Starting frontend...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'pipe',
    shell: true
  });

  let frontendReady = false;

  frontend.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Local:') && !frontendReady) {
      frontendReady = true;
      
      // Show access information
      const localIP = getLocalIP();
      console.log(`
✅ Application is ready!

🌐 Access the application at:
   Local:   http://localhost:5173
   Network: http://${localIP}:5173

📱 Team members can access from their devices using:
   http://${localIP}:5173

🔐 Security Note:
   - Private keys are NEVER sent to the server
   - All cryptographic operations happen in your browser
   - Keys are encrypted and stored locally on your device

Press Ctrl+C to stop the application
`);
    }
    // Show frontend output
    if (output.trim() && !output.includes('VITE')) {
      console.log(`[Frontend] ${output.trim()}`);
    }
  });

  frontend.stderr.on('data', (data) => {
    // Filter out non-error messages from Vite
    const output = data.toString();
    if (!output.includes('deprecation') && output.trim()) {
      console.error(`[Frontend] ${output}`);
    }
  });

  frontend.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
    process.exit(code);
  });
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down BlockAI Pure MM...');
  
  // The child processes will be killed automatically
  process.exit(0);
});

// Start the application
startApp().catch(console.error);