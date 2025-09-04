const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { Program, BN } = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const axios = require('axios');
const FormData = require('form-data');

// Pump.fun Program IDs
const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const PUMP_GLOBAL = new PublicKey('p89evAyzjd9fphjJx7G3RFA48sbZdpGEppRcfRNpump');
const PUMP_EVENT_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');
const PUMP_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');

// Constants
const TOKEN_DECIMALS = 9;
const TRADE_FEE_BPS = 100; // 1%

class PumpFunSDK {
  constructor(provider) {
    this.provider = provider;
    this.connection = provider.connection;
  }

  // Get Global Account
  async getGlobalAccount() {
    const [globalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('global')],
      PUMP_PROGRAM_ID
    );
    return globalPDA;
  }

  // Get Bonding Curve PDA
  getBondingCurvePDA(mint) {
    const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.toBuffer()],
      PUMP_PROGRAM_ID
    );
    return bondingCurvePDA;
  }

  // Get Metadata PDA
  getMetadataPDA(mint) {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
        mint.toBuffer()
      ],
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    );
    return metadataPDA;
  }

  // Upload metadata to IPFS
  async createTokenMetadata(tokenInfo) {
    try {
      // Create metadata object
      const metadata = {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        description: tokenInfo.description,
        image: '', // Will be set after image upload
        showName: tokenInfo.showName || true,
        createdOn: tokenInfo.createOn || 'https://pump.fun',
        twitter: tokenInfo.twitter || '',
        telegram: tokenInfo.telegram || '',
        website: tokenInfo.website || ''
      };

      // For production, implement real IPFS upload
      // For now, return mock data
      const metadataUri = 'https://ipfs.io/ipfs/Qm' + 
        Buffer.from(JSON.stringify(metadata)).toString('base64').substring(0, 44);

      return {
        metadata,
        metadataUri
      };
    } catch (error) {
      console.error('Error creating token metadata:', error);
      throw error;
    }
  }

  // Get Create Token Instructions
  async getCreateInstructions(creator, name, symbol, uri, mintKeypair) {
    const mint = mintKeypair.publicKey;
    const bondingCurve = this.getBondingCurvePDA(mint);
    const metadata = this.getMetadataPDA(mint);
    
    const bondingCurveTokenAccount = getAssociatedTokenAddressSync(
      mint,
      bondingCurve,
      true
    );

    const accounts = {
      global: await this.getGlobalAccount(),
      feeRecipient: PUMP_FEE_RECIPIENT,
      mint: mint,
      bondingCurve: bondingCurve,
      bondingCurveTokenAccount: bondingCurveTokenAccount,
      metadata: metadata,
      user: creator,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      eventAuthority: PUMP_EVENT_AUTHORITY,
      metadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    };

    // Create instruction data
    const discriminator = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]); // create discriminator
    const nameBuffer = Buffer.alloc(32);
    nameBuffer.write(name);
    const symbolBuffer = Buffer.alloc(8);
    symbolBuffer.write(symbol);
    const uriBuffer = Buffer.alloc(200);
    uriBuffer.write(uri);

    const data = Buffer.concat([
      discriminator,
      nameBuffer,
      symbolBuffer,
      uriBuffer
    ]);

    return {
      programId: PUMP_PROGRAM_ID,
      keys: Object.entries(accounts).map(([key, pubkey]) => ({
        pubkey,
        isSigner: key === 'user' || key === 'mint',
        isWritable: key !== 'eventAuthority' && key !== 'metadataProgram' && 
                   key !== 'systemProgram' && key !== 'tokenProgram' && 
                   key !== 'associatedTokenProgram' && key !== 'rent'
      })),
      data
    };
  }

  // Get Buy Instructions
  async getBuyInstructions(buyer, mint, amount, slippage = 0.05) {
    const bondingCurve = this.getBondingCurvePDA(mint);
    const bondingCurveTokenAccount = getAssociatedTokenAddressSync(
      mint,
      bondingCurve,
      true
    );
    const userTokenAccount = getAssociatedTokenAddressSync(mint, buyer);

    // Calculate max amount with slippage
    const maxAmount = Math.floor(amount * (1 + slippage));

    const accounts = {
      global: await this.getGlobalAccount(),
      feeRecipient: PUMP_FEE_RECIPIENT,
      mint: mint,
      bondingCurve: bondingCurve,
      bondingCurveTokenAccount: bondingCurveTokenAccount,
      user: buyer,
      userTokenAccount: userTokenAccount,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      eventAuthority: PUMP_EVENT_AUTHORITY,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
    };

    // Create instruction data
    const discriminator = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]); // buy discriminator
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(amount));
    const maxAmountBuffer = Buffer.alloc(8);
    maxAmountBuffer.writeBigUInt64LE(BigInt(maxAmount));

    const data = Buffer.concat([
      discriminator,
      amountBuffer,
      maxAmountBuffer
    ]);

    return {
      programId: PUMP_PROGRAM_ID,
      keys: Object.entries(accounts).map(([key, pubkey]) => ({
        pubkey,
        isSigner: key === 'user',
        isWritable: key !== 'eventAuthority' && key !== 'systemProgram' && 
                   key !== 'tokenProgram' && key !== 'rent' && 
                   key !== 'associatedTokenProgram'
      })),
      data
    };
  }

  // Get Sell Instructions
  async getSellInstructions(seller, mint, amount, slippage = 0.05) {
    const bondingCurve = this.getBondingCurvePDA(mint);
    const bondingCurveTokenAccount = getAssociatedTokenAddressSync(
      mint,
      bondingCurve,
      true
    );
    const userTokenAccount = getAssociatedTokenAddressSync(mint, seller);

    // Calculate min amount with slippage
    const minAmount = Math.floor(amount * (1 - slippage));

    const accounts = {
      global: await this.getGlobalAccount(),
      feeRecipient: PUMP_FEE_RECIPIENT,
      mint: mint,
      bondingCurve: bondingCurve,
      bondingCurveTokenAccount: bondingCurveTokenAccount,
      user: seller,
      userTokenAccount: userTokenAccount,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      eventAuthority: PUMP_EVENT_AUTHORITY,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
    };

    // Create instruction data
    const discriminator = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]); // sell discriminator
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(amount));
    const minAmountBuffer = Buffer.alloc(8);
    minAmountBuffer.writeBigUInt64LE(BigInt(minAmount));

    const data = Buffer.concat([
      discriminator,
      amountBuffer,
      minAmountBuffer
    ]);

    return {
      programId: PUMP_PROGRAM_ID,
      keys: Object.entries(accounts).map(([key, pubkey]) => ({
        pubkey,
        isSigner: key === 'user',
        isWritable: key !== 'eventAuthority' && key !== 'systemProgram' && 
                   key !== 'tokenProgram' && key !== 'associatedTokenProgram'
      })),
      data
    };
  }

  // Calculate price based on bonding curve
  calculatePrice(tokenSupply, solReserves) {
    // Pump.fun uses a linear bonding curve
    // Price increases linearly as supply increases
    const k = 1; // Constant for price calculation
    return (solReserves * k) / tokenSupply;
  }

  // Get token info
  async getTokenInfo(mint) {
    try {
      const bondingCurve = this.getBondingCurvePDA(mint);
      const bondingCurveAccount = await this.connection.getAccountInfo(bondingCurve);
      
      if (!bondingCurveAccount) {
        throw new Error('Token not found on Pump.fun');
      }

      // Parse bonding curve data
      // This would need the actual IDL to decode properly
      return {
        mint: mint.toBase58(),
        bondingCurve: bondingCurve.toBase58(),
        // Additional fields would be parsed from account data
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      throw error;
    }
  }
}

module.exports = { PumpFunSDK };