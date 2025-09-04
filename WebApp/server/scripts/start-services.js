const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Checking and starting required services...\n');

// Check if a command exists
function commandExists(cmd) {
  return new Promise((resolve) => {
    exec(`which ${cmd}`, (error) => {
      resolve(!error);
    });
  });
}

// Check if a service is running
function isServiceRunning(processName) {
  return new Promise((resolve) => {
    exec(`ps aux | grep -v grep | grep -q "${processName}"`, (error) => {
      resolve(!error);
    });
  });
}

// Start MongoDB
async function startMongoDB() {
  console.log('📦 Checking MongoDB...');
  
  if (!await commandExists('mongod')) {
    console.error('❌ MongoDB is not installed. Please install it first:');
    console.error('   brew install mongodb-community');
    return false;
  }

  if (await isServiceRunning('mongod')) {
    console.log('✅ MongoDB is already running');
    return true;
  }

  console.log('Starting MongoDB...');
  
  // Try to start via brew services first
  return new Promise((resolve) => {
    exec('brew services start mongodb-community', (error) => {
      if (error) {
        console.log('Could not start MongoDB via brew services, trying direct start...');
        
        // Create data directory if it doesn't exist
        const dataDir = '/tmp/mongodb';
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Start MongoDB directly
        const mongod = spawn('mongod', ['--dbpath', dataDir, '--fork', '--logpath', '/tmp/mongodb.log'], {
          stdio: 'inherit'
        });
        
        mongod.on('close', (code) => {
          if (code === 0) {
            console.log('✅ MongoDB started successfully');
            resolve(true);
          } else {
            console.error('❌ Failed to start MongoDB');
            resolve(false);
          }
        });
      } else {
        console.log('✅ MongoDB started via brew services');
        resolve(true);
      }
    });
  });
}

// Start Redis
async function startRedis() {
  console.log('\n📦 Checking Redis...');
  
  if (!await commandExists('redis-server')) {
    console.error('❌ Redis is not installed. Please install it first:');
    console.error('   brew install redis');
    return false;
  }

  if (await isServiceRunning('redis-server')) {
    console.log('✅ Redis is already running');
    return true;
  }

  console.log('Starting Redis...');
  
  // Try to start via brew services first
  return new Promise((resolve) => {
    exec('brew services start redis', (error) => {
      if (error) {
        console.log('Could not start Redis via brew services, trying direct start...');
        
        // Start Redis directly in background
        exec('redis-server --daemonize yes', (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Failed to start Redis:', error.message);
            resolve(false);
          } else {
            console.log('✅ Redis started successfully');
            resolve(true);
          }
        });
      } else {
        console.log('✅ Redis started via brew services');
        resolve(true);
      }
    });
  });
}

// Test MongoDB connection
function testMongoDB() {
  return new Promise((resolve) => {
    const { MongoClient } = require('mongodb');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    
    MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 })
      .then(client => {
        console.log('✅ MongoDB connection test successful');
        client.close();
        resolve(true);
      })
      .catch(err => {
        console.error('❌ MongoDB connection test failed:', err.message);
        resolve(false);
      });
  });
}

// Test Redis connection
function testRedis() {
  return new Promise((resolve) => {
    const redis = require('redis');
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000
      }
    });
    
    client.on('error', (err) => {
      console.error('❌ Redis connection test failed:', err.message);
      resolve(false);
    });
    
    client.connect()
      .then(() => {
        console.log('✅ Redis connection test successful');
        client.quit();
        resolve(true);
      })
      .catch(err => {
        console.error('❌ Redis connection test failed:', err.message);
        resolve(false);
      });
  });
}

// Main function
async function main() {
  let allGood = true;

  // Start services
  const mongoStarted = await startMongoDB();
  const redisStarted = await startRedis();

  if (!mongoStarted || !redisStarted) {
    console.error('\n❌ Failed to start required services');
    process.exit(1);
  }

  // Wait a moment for services to fully initialize
  console.log('\n⏳ Waiting for services to initialize...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test connections
  console.log('\n🔍 Testing connections...\n');
  const mongoConnected = await testMongoDB();
  const redisConnected = await testRedis();

  if (!mongoConnected || !redisConnected) {
    console.error('\n❌ Service connection tests failed');
    process.exit(1);
  }

  console.log('\n✅ All services are ready!\n');
  console.log('📡 Service URLs:');
  console.log('   MongoDB: mongodb://localhost:27017');
  console.log('   Redis:   redis://localhost:6379');
  console.log('   API:     http://localhost:5001');
  console.log('\n🚀 Starting the server...\n');
}

// Run the main function
main().catch(console.error);