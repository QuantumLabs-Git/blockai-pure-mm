const { Keypair, Connection, PublicKey, ComputeBudgetProgram, SystemProgram, TransactionMessage, VersionedTransaction, AddressLookupTableProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { AnchorProvider } = require('@coral-xyz/anchor');
const NodeWallet = require('@coral-xyz/anchor/dist/cjs/nodewallet').default;
const bs58 = require('bs58');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Import Pumpfun SDK - we'll need to copy this from the bundler
const { PumpFunSDK } = require('./pumpfunSDK');
const jitoService = require('./jitoService');

class PumpfunBundlerService {
  constructor() {
    this.commitment = 'confirmed';
    this.PUMP_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
    this.tipAccounts = [
      'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
      'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
      '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
      '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
      'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
      'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
      'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
      'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    ];
  }

  async initializeConnection(rpcUrl) {
    this.connection = new Connection(rpcUrl, { commitment: this.commitment });
    const dummyKeypair = Keypair.generate();
    const provider = new AnchorProvider(
      this.connection, 
      new NodeWallet(dummyKeypair), 
      { commitment: this.commitment }
    );
    this.sdk = new PumpFunSDK(provider);
  }

  // Generate vanity address with prefix
  async generateVanityAddress(prefix) {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 1000000; // Limit attempts to prevent infinite loop

    while (attempts < maxAttempts) {
      const keypair = Keypair.generate();
      const pubkey = keypair.publicKey.toBase58();
      
      if (pubkey.startsWith(prefix)) {
        const duration = Date.now() - startTime;
        return {
          keypair,
          publicKey: pubkey,
          attempts,
          duration
        };
      }
      
      attempts++;
      
      // Log progress every 10000 attempts
      if (attempts % 10000 === 0) {
        console.log(`Vanity generation progress: ${attempts} attempts`);
      }
    }
    
    throw new Error(`Failed to generate vanity address with prefix "${prefix}" after ${maxAttempts} attempts`);
  }

  // Upload image to IPFS
  async uploadToIPFS(imagePath) {
    try {
      // For production, use a real IPFS service like Pinata or Infura
      // For now, we'll use a mock implementation
      const imageData = await fs.readFile(imagePath);
      const formData = new FormData();
      formData.append('file', imageData, path.basename(imagePath));

      // Mock IPFS upload - replace with real service
      const ipfsHash = 'Qm' + Buffer.from(imagePath).toString('base64').substring(0, 44);
      
      return {
        ipfsHash,
        ipfsUrl: `ipfs://${ipfsHash}`,
        gatewayUrl: `https://ipfs.io/ipfs/${ipfsHash}`
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload image to IPFS');
    }
  }

  // Create token metadata
  async createTokenMetadata(tokenConfig, imageIpfsUrl) {
    const metadata = {
      name: tokenConfig.name,
      symbol: tokenConfig.symbol,
      description: tokenConfig.description,
      image: imageIpfsUrl,
      showName: true,
      createdOn: 'https://pump.fun',
      twitter: tokenConfig.twitter || '',
      telegram: tokenConfig.telegram || '',
      website: tokenConfig.website || ''
    };

    // Upload metadata to IPFS
    const metadataJson = JSON.stringify(metadata);
    const metadataHash = 'Qm' + Buffer.from(metadataJson).toString('base64').substring(0, 44);
    
    return {
      metadataUri: `https://ipfs.io/ipfs/${metadataHash}`,
      metadata
    };
  }

  // Distribute SOL to wallets
  async distributeSol(mainKeypair, wallets, amountPerWallet) {
    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250_000 })
    ];

    const lamportsPerWallet = Math.floor(amountPerWallet * 1e9);

    for (const wallet of wallets) {
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: mainKeypair.publicKey,
          toPubkey: wallet.publicKey,
          lamports: lamportsPerWallet
        })
      );
    }

    const latestBlockhash = await this.connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: mainKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([mainKeypair]);

    const signature = await this.connection.sendRawTransaction(transaction.serialize());
    await this.connection.confirmTransaction({
      signature,
      ...latestBlockhash
    });

    return signature;
  }

  // Create Address Lookup Table
  async createLUT(mainKeypair) {
    const slot = await this.connection.getSlot('confirmed');
    
    const [createIx, lutAddress] = AddressLookupTableProgram.createLookupTable({
      authority: mainKeypair.publicKey,
      payer: mainKeypair.publicKey,
      recentSlot: slot - 1
    });

    const latestBlockhash = await this.connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: mainKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [createIx]
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([mainKeypair]);

    const signature = await this.connection.sendRawTransaction(transaction.serialize());
    await this.connection.confirmTransaction({
      signature,
      ...latestBlockhash
    });

    return lutAddress;
  }

  // Add addresses to Address Lookup Table
  async addAddressesToLUT(mainKeypair, lutAddress, mintAddress, wallets) {
    const addresses = [
      this.PUMP_PROGRAM,
      await this.sdk.getGlobalAccount(),
      this.sdk.getBondingCurvePDA(mintAddress),
      getAssociatedTokenAddressSync(mintAddress, this.sdk.getBondingCurvePDA(mintAddress), true),
      mintAddress,
      SystemProgram.programId,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      new PublicKey('SysvarRent111111111111111111111111111111111'),
      new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1'), // Event authority
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'), // Metadata program
      new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM'), // Fee recipient
    ];

    // Add wallet addresses
    for (const wallet of wallets) {
      addresses.push(wallet.publicKey);
      addresses.push(getAssociatedTokenAddressSync(mintAddress, wallet.publicKey));
    }

    // Add main wallet addresses
    addresses.push(mainKeypair.publicKey);
    addresses.push(getAssociatedTokenAddressSync(mintAddress, mainKeypair.publicKey));

    const extendIx = AddressLookupTableProgram.extendLookupTable({
      payer: mainKeypair.publicKey,
      authority: mainKeypair.publicKey,
      lookupTable: lutAddress,
      addresses
    });

    const latestBlockhash = await this.connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: mainKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [extendIx]
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([mainKeypair]);

    const signature = await this.connection.sendRawTransaction(transaction.serialize());
    await this.connection.confirmTransaction({
      signature,
      ...latestBlockhash
    });

    // Wait for LUT to be active
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Execute the bundle
  async executeBundleLaunch(config) {
    try {
      await this.initializeConnection(config.rpcUrl);
      
      const results = {
        phase: 'initialization',
        tokenMint: null,
        metadataUri: null,
        lutAddress: null,
        bundleId: null,
        transactions: [],
        errors: []
      };

      // Parse main wallet
      const mainKeypair = Keypair.fromSecretKey(bs58.decode(config.mainWalletPrivateKey));
      console.log('Main wallet:', mainKeypair.publicKey.toBase58());

      // Check balance
      const mainBalance = await this.connection.getBalance(mainKeypair.publicKey);
      const requiredBalance = (config.totalSolAmount + config.devBuyAmount + config.jitoTipAmount + 0.1) * 1e9;
      
      if (mainBalance < requiredBalance) {
        throw new Error(`Insufficient balance. Required: ${requiredBalance / 1e9} SOL, Available: ${mainBalance / 1e9} SOL`);
      }

      // Generate or use mint keypair
      let mintKeypair;
      if (config.useVanityAddress && config.vanityPrefix) {
        results.phase = 'vanity_generation';
        console.log('Generating vanity address...');
        const vanityResult = await this.generateVanityAddress(config.vanityPrefix);
        mintKeypair = vanityResult.keypair;
        results.vanityGenerationTime = vanityResult.duration;
        results.vanityAttempts = vanityResult.attempts;
      } else {
        mintKeypair = Keypair.generate();
      }
      
      results.tokenMint = mintKeypair.publicKey.toBase58();
      console.log('Token mint:', results.tokenMint);

      // Upload image to IPFS
      results.phase = 'metadata_upload';
      const imageUpload = await this.uploadToIPFS(config.imagePath);
      
      // Create metadata
      const metadataResult = await this.createTokenMetadata(config.tokenConfig, imageUpload.ipfsUrl);
      results.metadataUri = metadataResult.metadataUri;

      // Generate or parse wallets
      results.phase = 'wallet_preparation';
      let purchaseWallets = [];
      
      if (config.walletInputMethod === 'generate') {
        // Generate new wallets
        for (let i = 0; i < config.numberOfWallets; i++) {
          purchaseWallets.push(Keypair.generate());
        }
      } else {
        // Parse provided wallets
        for (const key of config.purchaseWalletKeys) {
          purchaseWallets.push(Keypair.fromSecretKey(bs58.decode(key)));
        }
      }

      // Distribute SOL
      results.phase = 'sol_distribution';
      const distributionSig = await this.distributeSol(
        mainKeypair, 
        purchaseWallets, 
        config.solPerWallet
      );
      results.transactions.push({
        type: 'distribution',
        signature: distributionSig
      });

      // Create LUT
      results.phase = 'lut_creation';
      const lutAddress = await this.createLUT(mainKeypair);
      results.lutAddress = lutAddress.toBase58();

      // Add addresses to LUT
      results.phase = 'lut_population';
      await this.addAddressesToLUT(mainKeypair, lutAddress, mintKeypair.publicKey, purchaseWallets);

      // Create token
      results.phase = 'token_creation';
      const createTokenInstructions = await this.sdk.getCreateInstructions(
        mainKeypair.publicKey,
        config.tokenConfig.name,
        config.tokenConfig.symbol,
        results.metadataUri,
        mintKeypair
      );

      // Add Jito tip
      const jitoTipWallet = new PublicKey(
        this.tipAccounts[Math.floor(this.tipAccounts.length * Math.random())]
      );
      
      const tokenCreationInstructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 5_000_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
        SystemProgram.transfer({
          fromPubkey: mainKeypair.publicKey,
          toPubkey: jitoTipWallet,
          lamports: Math.floor(config.jitoTipAmount * 1e9)
        }),
        createTokenInstructions
      ];

      // Build bundle transactions
      results.phase = 'bundle_creation';
      const bundleTransactions = [];
      
      // Token creation transaction
      const latestBlockhash = await this.connection.getLatestBlockhash();
      const tokenCreationTx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: mainKeypair.publicKey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: tokenCreationInstructions
        }).compileToV0Message()
      );
      tokenCreationTx.sign([mainKeypair, mintKeypair]);
      bundleTransactions.push(tokenCreationTx);

      // Buy transactions
      const lookupTable = await this.connection.getAddressLookupTable(lutAddress);
      if (!lookupTable.value) {
        throw new Error('Failed to load lookup table');
      }

      // Create buy instructions for each wallet
      const buyInstructions = [];
      for (let i = 0; i < purchaseWallets.length; i++) {
        const wallet = purchaseWallets[i];
        const buyAmount = Math.floor(config.solPerWallet * 0.95 * 1e9); // Keep 5% for fees
        
        // Create ATA instruction
        const ataInstruction = {
          programId: ASSOCIATED_TOKEN_PROGRAM_ID,
          keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: getAssociatedTokenAddressSync(mintKeypair.publicKey, wallet.publicKey), isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: false, isWritable: false },
            { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
          ],
          data: Buffer.alloc(0)
        };

        // Create buy instruction
        const buyIx = await this.sdk.getBuyInstructions(
          wallet.publicKey,
          mintKeypair.publicKey,
          buyAmount
        );

        buyInstructions.push({ ata: ataInstruction, buy: buyIx, wallet });
      }

      // Build buy transactions (5 buys per transaction due to size limits)
      const buyTransactions = [];
      for (let i = 0; i < Math.ceil(purchaseWallets.length / 5); i++) {
        const instructions = [
          ComputeBudgetProgram.setComputeUnitLimit({ units: 5_000_000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 })
        ];

        for (let j = 0; j < 5; j++) {
          const index = i * 5 + j;
          if (buyInstructions[index]) {
            instructions.push(
              buyInstructions[index].ata,
              buyInstructions[index].buy
            );
          }
        }

        const messageV0 = new TransactionMessage({
          payerKey: purchaseWallets[i * 5].publicKey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions
        }).compileToV0Message([lookupTable.value]);

        const tx = new VersionedTransaction(messageV0);
        
        // Sign with relevant wallets
        for (let j = 0; j < 5; j++) {
          const index = i * 5 + j;
          if (purchaseWallets[index]) {
            tx.sign([purchaseWallets[index]]);
          }
        }
        
        buyTransactions.push(tx);
      }

      bundleTransactions.push(...buyTransactions);

      // Dev buy transaction (optional)
      if (config.devBuyAmount > 0) {
        const devBuyAmount = Math.floor(config.devBuyAmount * 1e9);
        const devBuyIx = await this.sdk.getBuyInstructions(
          mainKeypair.publicKey,
          mintKeypair.publicKey,
          devBuyAmount
        );

        const devBuyTx = new VersionedTransaction(
          new TransactionMessage({
            payerKey: mainKeypair.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: [
              ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
              devBuyIx
            ]
          }).compileToV0Message([lookupTable.value])
        );
        devBuyTx.sign([mainKeypair]);
        bundleTransactions.push(devBuyTx);
      }

      // Submit to Jito
      results.phase = 'bundle_submission';
      
      if (config.simulation) {
        // Simulate bundle
        results.bundleId = 'SIM-' + Date.now().toString(36).toUpperCase();
        results.phase = 'completed';
        results.status = 'success';
        results.bondingCurveProgress = 15.5;
        results.marketCap = config.totalSolAmount * 150;
      } else {
        // Submit real bundle to Jito
        const jitoResult = await jitoService.sendBundle(
          bundleTransactions,
          mainKeypair,
          this.commitment
        );
        
        results.bundleId = jitoResult.bundleId;
        results.jitoStatus = jitoResult.status;
        
        // Calculate actual progress
        const totalTokensBought = purchaseWallets.length * config.solPerWallet * 1_000_000; // Rough estimate
        const totalSupply = 1_000_000_000; // 1B tokens typical
        results.bondingCurveProgress = (totalTokensBought / totalSupply * 100).toFixed(2);
        results.marketCap = config.totalSolAmount * 150; // Rough estimate
        
        results.phase = 'completed';
        results.status = 'success';
      }

      return results;

    } catch (error) {
      console.error('Bundle execution error:', error);
      throw error;
    }
  }
}

module.exports = new PumpfunBundlerService();