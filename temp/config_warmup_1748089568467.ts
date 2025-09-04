import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Default values (as fallback if CSV reading fails)
const DEFAULT_TOKEN_LIST = [
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
];

const DEFAULT_WALLETS = [
  // Replace with your default wallet private key
  'yourPrivateKeyHere'
];

// Function to read tokens from CSV
function readTokensFromCSV(): string[] {
  try {
    const csvFilePath = path.resolve(__dirname, 'temp/tokens_warmup_1748089568467.csv');
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('tokens.csv not found, using default token list');
      return DEFAULT_TOKEN_LIST;
    }
    
    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    const tokens = records.map((record: any) => record.token_address.trim());
    
    if (tokens.length === 0) {
      console.log('No tokens found in CSV, using default token list');
      return DEFAULT_TOKEN_LIST;
    }
    
    console.log(`Loaded ${tokens.length} tokens from CSV`);
    return tokens;
  } catch (error) {
    console.error('Error reading tokens CSV:', error);
    return DEFAULT_TOKEN_LIST;
  }
}

// Function to read wallets from CSV
function readWalletsFromCSV(): string[] {
  try {
    const csvFilePath = path.resolve(__dirname, 'temp/wallets_warmup_1748089568467.csv');
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('wallets.csv not found, using default wallet list');
      return DEFAULT_WALLETS;
    }
    
    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    const wallets = records.map((record: any) => record.private_key.trim());
    
    if (wallets.length === 0) {
      console.log('No wallets found in CSV, using default wallet list');
      return DEFAULT_WALLETS;
    }
    
    console.log(`Loaded ${wallets.length} wallets from CSV`);
    return wallets;
  } catch (error) {
    console.error('Error reading wallets CSV:', error);
    return DEFAULT_WALLETS;
  }
}

// Export the token list and wallets (read from CSV files)
export const TOKEN_LIST = readTokensFromCSV();
export const WALLETS = readWalletsFromCSV();

// Other configuration values
export const BUY_AMOUNT = 0.05 // Reduced from 0.1313
export const TIME_PERIOD = 60 // Generate Tx per TIME_PERIOD seconds