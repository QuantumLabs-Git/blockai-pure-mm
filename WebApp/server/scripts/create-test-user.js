require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blockai-mm');
    console.log('Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@test.com' });
    if (existingUser) {
      console.log('Test user already exists');
      process.exit(0);
    }

    // Create test user
    const testUser = new User({
      email: 'test@test.com',
      password: 'test123',
      name: 'Test User',
      emailVerified: true, // Skip email verification for test
      role: 'user'
    });

    await testUser.save();
    console.log('Test user created successfully!');
    console.log('Email: test@test.com');
    console.log('Password: test123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();