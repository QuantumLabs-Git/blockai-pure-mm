const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} = require('@solana/spl-token');
const bs58 = require('bs58');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'solana-transfers.log' })
  ]
});

class SolanaTransferService {
  constructor() {
    // Use Helius RPC endpoint
    this.RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 'https://mainnet.helius-rpc.com/?api-key=7e5bbc4c-02f5-46ca-b781-468b275b5758';
    this.connection = new Connection(this.RPC_ENDPOINT, 'confirmed');
    this.MIN_BALANCE_TO_KEEP = 0.001 * LAMPORTS_PER_SOL; // Keep 0.001 SOL for fees
  }

  /**
   * Get balance for a public key
   */
  async getBalance(publicKey) {
    try {
      const balance = await this.connection.getBalance(new PublicKey(publicKey));
      return balance;
    } catch (error) {
      logger.error(`Error getting balance for ${publicKey}:`, error);
      return 0;
    }
  }

  /**
   * Get token balance for a public key
   */
  async getTokenBalance(publicKey, mintAddress) {
    try {
      const mint = new PublicKey(mintAddress);
      const owner = new PublicKey(publicKey);
      const tokenAccount = await getAssociatedTokenAddress(mint, owner);
      
      const accountInfo = await getAccount(this.connection, tokenAccount);
      return accountInfo.amount;
    } catch (error) {
      logger.error(`Error getting token balance:`, error);
      return BigInt(0);
    }
  }

  /**
   * Create keypair from private key
   */
  createKeypairFromPrivateKey(privateKey) {
    try {
      const decoded = bs58.decode(privateKey);
      if (decoded.length === 64) {
        // Full keypair, use only first 32 bytes
        return Keypair.fromSecretKey(decoded.slice(0, 64));
      } else if (decoded.length === 32) {
        // Need to construct full keypair
        const keypair = Keypair.fromSeed(decoded);
        return keypair;
      } else {
        throw new Error('Invalid private key length');
      }
    } catch (error) {
      logger.error('Error creating keypair:', error);
      throw error;
    }
  }

  /**
   * Transfer SOL from one wallet to another
   */
  async transferSOL(senderPrivateKey, recipientAddress, amountSOL) {
    try {
      // Create keypair from private key
      const senderKeypair = this.createKeypairFromPrivateKey(senderPrivateKey);
      const senderPublicKey = senderKeypair.publicKey;
      
      // Get current balance
      const balance = await this.getBalance(senderPublicKey.toString());
      const lamportsToTransfer = Math.floor(amountSOL * LAMPORTS_PER_SOL);
      
      // Check if we have enough balance
      if (balance < lamportsToTransfer + this.MIN_BALANCE_TO_KEEP) {
        throw new Error(`Insufficient balance. Have: ${balance / LAMPORTS_PER_SOL} SOL, Need: ${(lamportsToTransfer + this.MIN_BALANCE_TO_KEEP) / LAMPORTS_PER_SOL} SOL`);
      }

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: new PublicKey(recipientAddress),
          lamports: lamportsToTransfer,
        })
      );

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [senderKeypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );

      logger.info(`Transfer successful: ${signature}`);
      return {
        success: true,
        signature,
        amount: amountSOL,
        from: senderPublicKey.toString(),
        to: recipientAddress
      };

    } catch (error) {
      logger.error('Error transferring SOL:', error);
      return {
        success: false,
        error: error.message,
        from: senderPrivateKey.substring(0, 8) + '...',
        to: recipientAddress
      };
    }
  }

  /**
   * Transfer SPL tokens from one wallet to another
   */
  async transferToken(senderPrivateKey, recipientAddress, amount, tokenMintAddress, decimals) {
    try {
      const senderKeypair = this.createKeypairFromPrivateKey(senderPrivateKey);
      const senderPublicKey = senderKeypair.publicKey;
      const recipientPublicKey = new PublicKey(recipientAddress);
      const mintPublicKey = new PublicKey(tokenMintAddress);

      // Get associated token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        senderPublicKey
      );
      
      const recipientTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        recipientPublicKey
      );

      // Check if recipient token account exists
      const recipientAccountInfo = await this.connection.getAccountInfo(recipientTokenAccount);
      
      const transaction = new Transaction();

      // Create recipient token account if it doesn't exist
      if (!recipientAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderPublicKey,
            recipientTokenAccount,
            recipientPublicKey,
            mintPublicKey
          )
        );
      }

      // Add transfer instruction
      const transferAmount = Math.floor(amount * Math.pow(10, decimals));
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          senderPublicKey,
          transferAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [senderKeypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );

      logger.info(`Token transfer successful: ${signature}`);
      return {
        success: true,
        signature,
        amount,
        token: tokenMintAddress,
        from: senderPublicKey.toString(),
        to: recipientAddress
      };

    } catch (error) {
      logger.error('Error transferring token:', error);
      return {
        success: false,
        error: error.message,
        from: senderPrivateKey.substring(0, 8) + '...',
        to: recipientAddress
      };
    }
  }

  /**
   * Process many-to-many transfers
   */
  async processManyToMany(transfers, tokenAddress = null) {
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const transfer of transfers) {
      try {
        let result;
        
        if (!tokenAddress) {
          // SOL transfer
          result = await this.transferSOL(
            transfer.senderPrivateKey,
            transfer.recipientAddress,
            transfer.amount
          );
        } else {
          // SPL token transfer
          // You would need to fetch token decimals here
          const decimals = 9; // Default, should be fetched from token metadata
          result = await this.transferToken(
            transfer.senderPrivateKey,
            transfer.recipientAddress,
            transfer.amount,
            tokenAddress,
            decimals
          );
        }

        results.push({
          ...result,
          id: transfer.id
        });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Add small delay between transfers to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error('Error processing transfer:', error);
        results.push({
          id: transfer.id,
          success: false,
          error: error.message,
          amount: transfer.amount,
          recipient: transfer.recipientAddress
        });
        failureCount++;
      }
    }

    return {
      results,
      successCount,
      failureCount,
      total: transfers.length
    };
  }

  /**
   * Validate a Solana address
   */
  isValidAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate a private key
   */
  isValidPrivateKey(privateKey) {
    try {
      this.createKeypairFromPrivateKey(privateKey);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new SolanaTransferService();