const { spawn } = require('child_process');
const path = require('path');

let backendProcess = null;
let retryCount = 0;
const MAX_RETRIES = 3;

const startBackend = () => {
  console.log('🚀 Starting backend server...');
  
  backendProcess = spawn('npm', ['run', 'dev:no-services'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  backendProcess.on('error', (err) => {
    console.error('❌ Failed to start backend:', err);
    handleBackendFailure();
  });

  backendProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Backend exited with code ${code}`);
      handleBackendFailure();
    }
  });

  // Check health after 5 seconds
  setTimeout(() => {
    checkBackendHealth();
  }, 5000);
};

const checkBackendHealth = () => {
  const healthCheck = spawn('node', [path.join(__dirname, 'health-check.js')], {
    stdio: 'inherit'
  });

  healthCheck.on('exit', (code) => {
    if (code !== 0) {
      console.error('❌ Backend health check failed');
      handleBackendFailure();
    } else {
      console.log('✅ Backend is running successfully');
      retryCount = 0; // Reset retry count on success
    }
  });
};

const handleBackendFailure = () => {
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    console.log(`🔄 Retrying... (${retryCount}/${MAX_RETRIES})`);
    
    // Kill existing process
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
    }
    
    // Wait 2 seconds before retry
    setTimeout(startBackend, 2000);
  } else {
    console.error('❌ Failed to start backend after maximum retries');
    console.error('Please check the error logs and fix any issues');
    process.exit(1);
  }
};

// Start the backend
startBackend();

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  if (backendProcess) {
    backendProcess.kill();
  }
  process.exit(0);
});