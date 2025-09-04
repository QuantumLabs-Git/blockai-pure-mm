import { AddressLookupTableAccount, clusterApiUrl, ComputeBudgetProgram, Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BUY_AMOUNT, TIME_PERIOD, TOKEN_LIST, WALLETS } from "./config";
import { buildSwapTrx, getSwapInfo, getTokenPrice } from "./jupiter_api";
import { PRIORITY_FEE, WSOL_ADDRESS, WSOL_DECIMALS } from "./uniconst";
import dotenv from 'dotenv';
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import { createAndSendBundle } from "./jito";
dotenv.config();
console.log("ENV loaded:", process.env.MAINNET_RPC_URL);
console.log("DEVNET_MODE:", process.env.DEVNET_MODE);

const DEVNET_MODE = process.env.DEVNET_MODE === "true";

const TIMER = TIME_PERIOD * 1000;

const connection = new Connection(DEVNET_MODE ? clusterApiUrl("devnet") : process.env.MAINNET_RPC_URL as string, "confirmed");

console.log("==================== Start Script =======================");
console.log("Chain Mode: ", DEVNET_MODE ? "devnet" : "mainnet");
console.log("=========================================================");

export const getWalletTokenAccount = async (connection: Connection, wallet: PublicKey) => {
    const filters = [
        {
            dataSize: 165,    //size of account (bytes)
        },
        {
            memcmp: {
                offset: 32,     //location of our query in the account (bytes)
                bytes: wallet.toString(),  //our search criteria, a base58 encoded string
            },
        }];
    const accounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        { filters: filters }
    );
    accounts.forEach((account: any, i: number) => {
        //Parse the account data
        const parsedAccountInfo = account.account.data;
        const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
        const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        //Log results
    });
    return accounts
};

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const buyToken = async (pk: string, solAmount: number, tokenAddress: string) => {
    try {
        console.log(pk, tokenAddress)
        const key = bs58.decode(pk)
        const buyerOrSeller = Keypair.fromSecretKey(key);
        const walletTokenAccounts = await getWalletTokenAccount(connection, buyerOrSeller.publicKey);

        let tokenBalance = 0;
        if (walletTokenAccounts && walletTokenAccounts.length > 0) {
            for (let walletTokenAccount of walletTokenAccounts) {
                const parsedAccountInfo: any = walletTokenAccount.account.data;
                const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
                const balance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
                if (mintAddress === tokenAddress) {
                    tokenBalance = balance;
                    break;
                }
            }
        }

        let solBalance = await connection.getBalance(buyerOrSeller.publicKey);
        solBalance = solBalance / 10 ** 9;

        if (solBalance < 0.005) {
            console.log('Insufficient funds!');
            return false;
        }
        console.log("=========================================================");
        console.log("Buying tokens...");
        console.log("Token Address: " + tokenAddress);
        console.log(('SOL Wallet Balance: ' + solBalance.toString() + ' SOL'));
        console.log("Buy Sol Amount: " + solAmount.toString());
        console.log(('Token Wallet Balance: ' + tokenBalance));
        const quoteResponse: any = await getSwapInfo(WSOL_ADDRESS, tokenAddress, solAmount, WSOL_DECIMALS)
        if (!quoteResponse || quoteResponse.error) {
            return null
        }
        let swapTransaction = await buildSwapTrx(buyerOrSeller.publicKey.toString(), quoteResponse)
        if (swapTransaction) {
            let ret = await createAndSendBundle(connection, swapTransaction, buyerOrSeller, [buyerOrSeller], PRIORITY_FEE);
            // let ret = await sendAndConfirmTransactions(connection, buyerOrSeller, swapTransaction)

            if (ret.length > 0) {
                console.log("BuyToken function is success!!!");
            }
            return ret;
        }
    } catch (error) {
        console.log("Error: ", error);
        return false
    }
}

const sellToken = async (pk: string, tokenAddress: string) => {
    try {
        const key = bs58.decode(pk)
        const buyerOrSeller = Keypair.fromSecretKey(key);
        const mint = new PublicKey(tokenAddress);
        const mintInfo = await getMint(connection, mint);
        const walletTokenAccounts = await getWalletTokenAccount(connection, buyerOrSeller.publicKey);
        let tokenBalance = 0;
        if (walletTokenAccounts && walletTokenAccounts.length > 0) {
            for (let walletTokenAccount of walletTokenAccounts) {
                const parsedAccountInfo: any = walletTokenAccount.account.data;
                const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
                const balance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
                if (mintAddress === tokenAddress) {
                    tokenBalance = balance;
                    break;
                }
            }

        }
        let tokenAmount = tokenBalance;
        let solBalance = await connection.getBalance(buyerOrSeller.publicKey);
        solBalance = solBalance / 10 ** 9;
        if (solBalance < 0.005) {
            console.log('Insufficient funds!');
            return false;
        }

        let tokenAmountToSell = tokenBalance * 0.999;

        console.log("=========================================================");
        console.log("Selling tokens...");
        console.log("Token Address: " + tokenAddress);
        console.log(('SOL Wallet Balance: ' + solBalance.toString() + ' SOL'));
        console.log("Sell Token Amount: " + tokenAmount.toString());

        if (tokenAmount == 0) {
            return true;
        }
        const quoteResponse: any = await getSwapInfo(tokenAddress, WSOL_ADDRESS, tokenAmountToSell, mintInfo.decimals)
        if (!quoteResponse || quoteResponse.error) {
            return null
        }
        let swapTransaction = await buildSwapTrx(buyerOrSeller.publicKey.toString(), quoteResponse)
        if (swapTransaction) {
            let ret = await createAndSendBundle(connection, swapTransaction, buyerOrSeller, [buyerOrSeller], PRIORITY_FEE);
            // let ret = await sendAndConfirmTransactions(connection, buyerOrSeller, swapTransaction)

            if (ret.length > 0) {
                console.log("SellToken function is success!!!");
            }
            return ret;
        }
    } catch (error) {
        console.log("Error", error)
        return false
    }
}

let mode = "buy"
let cycleCount = 0; // Initialize a counter to track cycles

const swapLoop = async () => {
    for (let pk of WALLETS) {
        for (let tokenAddress of TOKEN_LIST) {
            let price = await getTokenPrice(tokenAddress, WSOL_ADDRESS)
            if (price === 0) {
                console.log("This token is not supported", tokenAddress)
            }
            if (mode === "buy") {
                const randomBuyAmount = Math.random() * (0.029 - 0.012) + 0.012;
                await buyToken(pk, randomBuyAmount, tokenAddress);
                await sleep(8000);
            } else {
                await sellToken(pk, tokenAddress);
                await sleep(9000);
            }
        }
    }
}
const doEvent = async () => {
    await swapLoop();

    // Increment the cycle count after each loop
    cycleCount += 1;

    // Switch between buy and sell mode
    if (mode === "buy") {
        mode = "sell"; // After buy mode, switch to sell
    } else if (mode === "sell") {
        mode = "buy"; // After sell mode, switch to buy
    }

    // Stop the script after completing two cycles (buy + sell)
    if (cycleCount < 2) {
        // Continue to the next cycle (buy or sell)
        setTimeout(() => {
            doEvent();
        }, TIMER); // Use your defined TIMER for the delay between cycles
    } else {
        console.log("==================== Script has completed two cycles ======================");
    }
};

// Start the event
doEvent();
