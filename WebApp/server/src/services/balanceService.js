const { Connection, PublicKey } = require('@solana/web3.js');
const { Web3 } = require('web3');
const axios = require('axios');

// Initialize blockchain connections
const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

const web3Providers = {
  ethereum: new Web3(process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo'),
  bsc: new Web3(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'),
  base: new Web3(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
};

// ERC-20 ABI for balanceOf function
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  }
];

// Native token information
const NATIVE_TOKENS = {
  ethereum: { symbol: 'ETH', decimals: 18, wrapped: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' }, // WETH
  bsc: { symbol: 'BNB', decimals: 18, wrapped: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' }, // WBNB
  base: { symbol: 'ETH', decimals: 18, wrapped: '0x4200000000000000000000000000000000000006' }, // WETH on Base
  solana: { symbol: 'SOL', decimals: 9, wrapped: 'So11111111111111111111111111111111111111112' }, // Wrapped SOL
  sui: { symbol: 'SUI', decimals: 9, wrapped: '0x2::sui::SUI' } // SUI native token
};

// Get Solana token balance
async function getSolanaTokenBalance(walletAddress, tokenMint) {
  try {
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(tokenMint);

    // For native SOL
    if (tokenMint === 'native' || tokenMint === 'SOL') {
      const balance = await solanaConnection.getBalance(wallet);
      return balance / Math.pow(10, 9); // Convert lamports to SOL
    }

    // For SPL tokens
    const response = await solanaConnection.getParsedTokenAccountsByOwner(wallet, {
      mint: mint
    });

    if (response.value.length === 0) {
      return 0;
    }

    const tokenAccount = response.value[0];
    const amount = tokenAccount.account.data.parsed.info.tokenAmount;
    return parseFloat(amount.uiAmount);
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    return 0;
  }
}

// Get EVM token balance
async function getEVMTokenBalance(chain, walletAddress, tokenAddress) {
  try {
    const web3 = web3Providers[chain];
    
    // For native token (ETH/BNB)
    if (tokenAddress === 'native' || tokenAddress === NATIVE_TOKENS[chain].symbol) {
      const balance = await web3.eth.getBalance(walletAddress);
      return parseFloat(web3.utils.fromWei(balance, 'ether'));
    }

    // For ERC-20 tokens
    const contract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    const balance = await contract.methods.balanceOf(walletAddress).call();
    const decimals = await contract.methods.decimals().call();
    
    return parseFloat(balance) / Math.pow(10, parseInt(decimals));
  } catch (error) {
    console.error(`Error fetching ${chain} balance:`, error);
    return 0;
  }
}

// Get Sui balance (placeholder - needs Sui SDK)
async function getSuiBalance(walletAddress, tokenType) {
  try {
    // This is a placeholder implementation
    // In production, you would use the Sui SDK
    console.log(`Fetching Sui balance for ${walletAddress}, token: ${tokenType}`);
    return 0;
  } catch (error) {
    console.error('Error fetching Sui balance:', error);
    return 0;
  }
}

// Get balances for all wallets
async function getWalletBalances(chain, wallets, tokenAddress) {
  const balances = [];
  const nativeToken = NATIVE_TOKENS[chain];
  
  for (const wallet of wallets) {
    const result = {
      address: wallet,
      balances: {}
    };

    try {
      if (chain === 'solana') {
        // Get native SOL balance
        result.balances.native = await getSolanaTokenBalance(wallet, 'native');
        
        // Get wrapped SOL balance
        result.balances.wrapped = await getSolanaTokenBalance(wallet, nativeToken.wrapped);
        
        // Get token balance if specified
        if (tokenAddress && tokenAddress !== 'native') {
          result.balances.token = await getSolanaTokenBalance(wallet, tokenAddress);
        }
      } else if (chain === 'sui') {
        // Get native SUI balance
        result.balances.native = await getSuiBalance(wallet, 'native');
        
        // Get wrapped SUI balance (if applicable)
        result.balances.wrapped = await getSuiBalance(wallet, nativeToken.wrapped);
        
        // Get token balance if specified
        if (tokenAddress && tokenAddress !== 'native') {
          result.balances.token = await getSuiBalance(wallet, tokenAddress);
        }
      } else {
        // Get native balance (ETH/BNB)
        result.balances.native = await getEVMTokenBalance(chain, wallet, 'native');
        
        // Get wrapped native token balance
        result.balances.wrapped = await getEVMTokenBalance(chain, wallet, nativeToken.wrapped);
        
        // Get token balance if specified
        if (tokenAddress && tokenAddress !== 'native') {
          result.balances.token = await getEVMTokenBalance(chain, wallet, tokenAddress);
        }
      }
    } catch (error) {
      console.error(`Error fetching balances for wallet ${wallet}:`, error);
      result.error = error.message;
    }

    balances.push(result);
  }

  return balances;
}

// Get token information
async function getTokenInfo(chain, tokenAddress) {
  try {
    if (chain === 'solana') {
      // For Solana, we would need to fetch token metadata
      // This is a simplified version
      return {
        address: tokenAddress,
        symbol: 'Unknown',
        decimals: 9
      };
    } else {
      const web3 = web3Providers[chain];
      const contract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
      
      // Some tokens might not have these methods, so we wrap in try-catch
      let symbol = 'Unknown';
      let decimals = 18;
      
      try {
        const symbolCall = await contract.methods.symbol().call();
        symbol = symbolCall;
      } catch (e) {}
      
      try {
        const decimalsCall = await contract.methods.decimals().call();
        decimals = parseInt(decimalsCall);
      } catch (e) {}
      
      return {
        address: tokenAddress,
        symbol,
        decimals
      };
    }
  } catch (error) {
    console.error('Error fetching token info:', error);
    return null;
  }
}

module.exports = {
  getWalletBalances,
  getTokenInfo,
  getSolanaTokenBalance,
  getEVMTokenBalance,
  NATIVE_TOKENS
};