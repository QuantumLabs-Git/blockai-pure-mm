require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blockai-mm');
    console.log('Connected to MongoDB');
    
    // Find all users
    const users = await User.find({}).select('email name emailVerified');
    console.log('All users in database:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Email Verified: ${user.emailVerified}`);
    });
    
    // Check specific user
    const james = await User.findOne({ email: 'james@gmail.com' });
    if (james) {
      console.log('\nFound james@gmail.com:', {
        id: james._id,
        email: james.email,
        name: james.name,
        emailVerified: james.emailVerified,
        isLocked: james.isLocked
      });
    } else {
      console.log('\njames@gmail.com not found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();