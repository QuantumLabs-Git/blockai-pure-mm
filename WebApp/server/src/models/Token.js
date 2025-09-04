const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  totalSupply: {
    type: String, // Store as string to handle large numbers
    required: true
  },
  decimals: {
    type: Number,
    required: true
  },
  contractAddress: {
    type: String,
    required: true,
    unique: true
  },
  transactionHash: {
    type: String,
    required: true
  },
  blockchain: {
    type: String,
    required: true,
    enum: ['ethereum', 'bsc', 'base', 'solana']
  },
  metadata: {
    description: String,
    website: String,
    twitter: String,
    telegram: String,
    logoUrl: String
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'burned'],
    default: 'active'
  },
  stats: {
    holders: { type: Number, default: 0 },
    transfers: { type: Number, default: 0 },
    volume24h: { type: String, default: '0' },
    marketCap: { type: String, default: '0' }
  }
}, {
  timestamps: true
});

// Indexes
tokenSchema.index({ userId: 1, blockchain: 1 });
tokenSchema.index({ contractAddress: 1, blockchain: 1 });
tokenSchema.index({ symbol: 1 });

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;