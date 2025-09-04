const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const { validateRegister, validateLogin } = require('../utils/validation');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-jwt-secret',
    { expiresIn: '7d' }
  );
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validate input
    const { error } = validateRegister(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Create new user
    const user = new User({
      email,
      password,
      name,
      verificationToken,
      emailVerified: process.env.NODE_ENV === 'development' // Auto-verify in development
    });
    
    await user.save();
    
    // Send verification email
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: email,
      subject: 'Verify your BlockAI Pure MM account',
      html: `
        <h1>Welcome to BlockAI Pure MM!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
      `
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    // Validate input
    const { error } = validateLogin(req.body);
    if (error) {
      console.log('Validation error:', error.details[0].message);
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked due to too many failed login attempts'
      });
    }
    
    // Check password
    console.log('Checking password for user:', user.email);
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if email is verified (skip in development)
    if (!user.emailVerified && process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }
    
    // Reset login attempts
    await user.resetLoginAttempts();
    
    // Generate token
    const token = generateToken(user._id);
    
    // Set session
    req.session.userId = user._id;
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }
    
    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a password reset email has been sent'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // Send reset email
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'Reset your BlockAI Pure MM password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `
    });
    
    res.json({
      success: true,
      message: 'If an account exists, a password reset email has been sent'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    // Check for token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    
    // Get user
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        settings: user.settings
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Update profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    const { name, email, profilePhoto } = req.body;

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (profilePhoto) user.profilePhoto = profilePhoto;
    
    // If email is changed, require verification
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already in use' 
        });
      }
      user.email = email;
      user.emailVerified = false;
      
      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationToken = verificationToken;
      
      // Send verification email
      const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
      await sendEmail({
        to: email,
        subject: 'Verify your new email address',
        html: `
          <h1>Email Verification Required</h1>
          <p>You have updated your email address. Please click the link below to verify:</p>
          <a href="${verificationUrl}">Verify Email</a>
        `
      });
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        settings: user.settings,
        profilePhoto: user.profilePhoto,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Change password
router.put('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

module.exports = router;