import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  encryptPrivateKeys, 
  decryptPrivateKeys, 
  readKeysFromXLS,
  saveEncryptedKeysToXLS,
  validatePrivateKey,
  keyStore,
  clearClipboard,
  secureErase
} from '../crypto/keyManager';

const WalletContext = createContext({});

export const WalletProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [selectedChain, setSelectedChain] = useState('solana');
  const [encryptedData, setEncryptedData] = useState(null);

  // Load encrypted keys from XLS file or direct input
  const loadKeysFromFile = async (file, password) => {
    try {
      let keys;
      
      // Check if it's a mock file (for quick import)
      if (file.text && typeof file.text === 'function') {
        // Direct import from form
        const text = await file.text();
        const data = JSON.parse(text);
        keys = data.map(item => item.private_key);
      } else {
        // Real file upload
        keys = await readKeysFromXLS(file);
      }
      
      if (!keys || keys.length === 0) {
        throw new Error('No private keys found in file');
      }

      // Validate keys
      const validKeys = keys.filter(key => validatePrivateKey(key, selectedChain));
      
      if (validKeys.length === 0) {
        throw new Error('No valid private keys found for selected blockchain');
      }

      // Encrypt and store
      const encrypted = encryptPrivateKeys(validKeys, password);
      setEncryptedData(encrypted);
      
      // Store in memory for current session
      validKeys.forEach((key, index) => {
        keyStore.setKey(`wallet_${index}`, key);
      });

      const walletList = validKeys.map((key, index) => ({
        id: `wallet_${index}`,
        address: deriveAddress(key, selectedChain),
        chain: selectedChain
      }));
      
      setWallets(walletList);
      setIsUnlocked(true);
      toast.success(`Loaded ${validKeys.length} wallets successfully`);
      
      return { success: true, count: validKeys.length };
    } catch (error) {
      toast.error(error.message);
      return { success: false, message: error.message };
    }
  };

  // Unlock wallets with password
  const unlockWallets = async (password) => {
    if (!encryptedData) {
      toast.error('No encrypted wallet data found');
      return { success: false };
    }

    try {
      const decryptedKeys = decryptPrivateKeys(
        encryptedData.encrypted,
        password,
        encryptedData.salt
      );

      // Store in memory for current session
      decryptedKeys.forEach((key, index) => {
        keyStore.setKey(`wallet_${index}`, key);
      });

      setWallets(decryptedKeys.map((key, index) => ({
        id: `wallet_${index}`,
        address: deriveAddress(key, selectedChain),
        chain: selectedChain
      })));

      setIsUnlocked(true);
      toast.success('Wallets unlocked successfully');
      
      return { success: true };
    } catch (error) {
      toast.error('Invalid password');
      return { success: false };
    }
  };

  // Lock wallets and clear memory
  const lockWallets = useCallback(() => {
    keyStore.clearAll();
    setWallets([]);
    setIsUnlocked(false);
    clearClipboard();
    toast.info('Wallets locked');
  }, []);

  // Save encrypted keys to file
  const saveKeysToFile = () => {
    if (!encryptedData) {
      toast.error('No encrypted data to save');
      return;
    }

    const filename = `encrypted_${selectedChain}_wallets_${Date.now()}.xlsx`;
    saveEncryptedKeysToXLS(encryptedData, filename);
    toast.success('Encrypted keys saved to file');
  };

  // Get private key for signing (temporary access)
  const getPrivateKeyForSigning = (walletId) => {
    if (!isUnlocked) {
      throw new Error('Wallets are locked');
    }

    const key = keyStore.getKey(walletId);
    if (!key) {
      throw new Error('Private key not found or expired');
    }

    // Return key with automatic cleanup
    return {
      key,
      cleanup: () => {
        // Best effort to clear from memory
        secureErase(key);
      }
    };
  };

  // Sign transaction
  const signTransaction = async (walletId, transaction) => {
    try {
      const { key, cleanup } = getPrivateKeyForSigning(walletId);
      
      // Sign based on blockchain
      let signedTx;
      switch (selectedChain) {
        case 'solana':
          signedTx = await signSolanaTransaction(transaction, key);
          break;
        case 'ethereum':
        case 'bsc':
        case 'base':
          signedTx = await signEVMTransaction(transaction, key);
          break;
        default:
          throw new Error('Unsupported blockchain');
      }

      // Clean up
      cleanup();

      return signedTx;
    } catch (error) {
      toast.error('Failed to sign transaction: ' + error.message);
      throw error;
    }
  };

  // Switch blockchain
  const switchChain = (chain) => {
    if (isUnlocked) {
      toast.warning('Please lock wallets before switching chains');
      return;
    }
    setSelectedChain(chain);
  };

  // Auto-lock after inactivity
  useEffect(() => {
    let timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isUnlocked) {
          lockWallets();
          toast.warning('Wallets locked due to inactivity');
        }
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimeout);
    });

    resetTimeout();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout);
      });
    };
  }, [isUnlocked, lockWallets]);

  const value = {
    wallets,
    isUnlocked,
    selectedChain,
    loadKeysFromFile,
    unlockWallets,
    lockWallets,
    saveKeysToFile,
    signTransaction,
    switchChain,
    hasEncryptedData: !!encryptedData
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// Helper functions
function deriveAddress(privateKey, chain) {
  // This would be implemented based on the blockchain
  // For now, return a placeholder
  return `${chain}_address_${privateKey.substring(0, 8)}...`;
}

async function signSolanaTransaction(transaction, privateKey) {
  // Implement Solana transaction signing
  // This would use @solana/web3.js
  throw new Error('Solana signing not implemented yet');
}

async function signEVMTransaction(transaction, privateKey) {
  // Implement EVM transaction signing
  // This would use web3.js
  throw new Error('EVM signing not implemented yet');
}