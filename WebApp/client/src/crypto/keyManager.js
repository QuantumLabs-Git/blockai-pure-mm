import CryptoJS from 'crypto-js';
import * as XLSX from 'xlsx';

/**
 * Secure key management utilities
 * All private keys are handled client-side only
 */

// Generate a secure encryption key from password
export const deriveKeyFromPassword = async (password, salt) => {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  return key;
};

// Encrypt private keys
export const encryptPrivateKeys = (privateKeys, password) => {
  const salt = CryptoJS.lib.WordArray.random(128/8).toString();
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(privateKeys),
    password + salt,
    { mode: CryptoJS.mode.GCM }
  ).toString();
  
  return {
    encrypted,
    salt
  };
};

// Decrypt private keys
export const decryptPrivateKeys = (encryptedData, password, salt) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(
      encryptedData,
      password + salt,
      { mode: CryptoJS.mode.GCM }
    );
    
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    throw new Error('Invalid password or corrupted data');
  }
};

// Read keys from XLS file
export const readKeysFromXLS = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Extract private keys based on the column name
        const privateKeys = jsonData.map(row => {
          return row['Private Key'] || row['private_key'] || row['privateKey'];
        }).filter(key => key);
        
        resolve(privateKeys);
      } catch (error) {
        reject(new Error('Failed to read XLS file: ' + error.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Save encrypted keys to XLS
export const saveEncryptedKeysToXLS = (encryptedData, filename = 'encrypted_keys.xlsx') => {
  const data = [{
    'Encrypted Data': encryptedData.encrypted,
    'Salt': encryptedData.salt,
    'Created': new Date().toISOString()
  }];
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Encrypted Keys');
  
  // Save file
  XLSX.writeFile(workbook, filename);
};

// In-memory key storage (cleared on page refresh)
class MemoryKeyStore {
  constructor() {
    this.keys = new Map();
    this.sessionId = crypto.randomUUID();
  }
  
  setKey(id, key) {
    this.keys.set(id, {
      key,
      timestamp: Date.now()
    });
  }
  
  getKey(id) {
    const entry = this.keys.get(id);
    if (!entry) return null;
    
    // Keys expire after 30 minutes
    if (Date.now() - entry.timestamp > 30 * 60 * 1000) {
      this.keys.delete(id);
      return null;
    }
    
    return entry.key;
  }
  
  clearKey(id) {
    this.keys.delete(id);
  }
  
  clearAll() {
    this.keys.clear();
  }
}

export const keyStore = new MemoryKeyStore();

// Validate private key format
export const validatePrivateKey = (key, blockchain) => {
  switch (blockchain) {
    case 'ethereum':
    case 'bsc':
    case 'base':
      // EVM private keys are 64 hex characters (32 bytes)
      return /^[0-9a-fA-F]{64}$/.test(key.replace(/^0x/, ''));
    
    case 'solana':
      // Solana private keys are base58 encoded
      // Basic validation - actual validation would use base58 decode
      return key.length >= 87 && key.length <= 88;
    
    default:
      return false;
  }
};

// Sign transaction (to be implemented for each blockchain)
export const signTransaction = async (transaction, privateKey, blockchain) => {
  // This will be implemented based on the blockchain
  // For now, return a placeholder
  throw new Error(`Transaction signing for ${blockchain} not yet implemented`);
};

// Security utilities
export const clearClipboard = () => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText('');
  }
};

export const secureErase = (str) => {
  // Overwrite string in memory (best effort in JavaScript)
  if (typeof str === 'string') {
    const arr = new Uint8Array(str.length);
    crypto.getRandomValues(arr);
    return String.fromCharCode.apply(null, arr);
  }
  return '';
};