const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tokens: {
    ethereum: {
      address: String,
      symbol: String,
      decimals: Number,
      poolAddresses: [String]
    },
    solana: {
      address: String,
      symbol: String,
      decimals: Number,
      poolAddresses: [String]
    },
    bsc: {
      address: String,
      symbol: String,
      decimals: Number,
      poolAddresses: [String]
    },
    base: {
      address: String,
      symbol: String,
      decimals: Number,
      poolAddresses: [String]
    },
    sui: {
      address: String,
      symbol: String,
      decimals: Number,
      poolAddresses: [String]
    }
  },
  settings: {
    defaultChain: {
      type: String,
      enum: ['ethereum', 'solana', 'bsc', 'base', 'sui'],
      default: 'solana'
    },
    trading: {
      defaultSlippage: {
        type: Number,
        default: 1
      },
      defaultGasPrice: String,
      maxPositionSize: Number,
      stopLossPercentage: Number,
      takeProfitPercentage: Number
    },
    notifications: {
      onTrade: { type: Boolean, default: true },
      onPriceAlert: { type: Boolean, default: true },
      onError: { type: Boolean, default: true }
    }
  },
  wallets: {
    ethereum: [String],
    solana: [String],
    bsc: [String],
    base: [String],
    sui: [String]
  },
  tradingHistory: [{
    chain: String,
    txHash: String,
    type: { type: String, enum: ['buy', 'sell', 'add_liquidity', 'remove_liquidity'] },
    tokenAddress: String,
    amount: String,
    price: String,
    totalValue: String,
    gas: String,
    timestamp: Date,
    status: { type: String, enum: ['pending', 'success', 'failed'] },
    wallet: String
  }],
  logs: [{
    level: { type: String, enum: ['info', 'warning', 'error'] },
    message: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  stats: {
    totalVolume: {
      type: Map,
      of: String, // chain -> volume
      default: new Map()
    },
    totalTrades: {
      type: Number,
      default: 0
    },
    profitLoss: {
      type: Map,
      of: String, // chain -> P&L
      default: new Map()
    },
    lastActivity: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
projectSchema.index({ owner: 1, isActive: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ name: 'text', description: 'text' });

// Update timestamps
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isModified('tradingHistory') || this.isModified('logs')) {
    this.stats.lastActivity = Date.now();
  }
  next();
});

// Methods
projectSchema.methods.addLog = function(level, message, details = {}) {
  this.logs.push({
    level,
    message,
    details,
    timestamp: new Date()
  });
  
  // Keep only last 1000 logs
  if (this.logs.length > 1000) {
    this.logs = this.logs.slice(-1000);
  }
  
  return this.save();
};

projectSchema.methods.addTrade = function(tradeData) {
  this.tradingHistory.push({
    ...tradeData,
    timestamp: new Date()
  });
  
  // Update stats
  this.stats.totalTrades += 1;
  const currentVolume = this.stats.totalVolume.get(tradeData.chain) || '0';
  this.stats.totalVolume.set(
    tradeData.chain, 
    (parseFloat(currentVolume) + parseFloat(tradeData.totalValue)).toString()
  );
  
  return this.save();
};

projectSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  if (this.owner.toString() === userId.toString()) return true;
  
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return false;
  
  const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 };
  return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;