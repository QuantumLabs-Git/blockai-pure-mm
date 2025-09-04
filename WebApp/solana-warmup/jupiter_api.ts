import { VersionedTransaction } from "@solana/web3.js";
import axios from "axios";

export const fetchAPI = async (url: string, method: string, data: any = {}) => {
    return new Promise(resolve => {
        if (method === "POST") {
            axios.post(url, data).then(response => {
                let json = response.data;
                resolve(json);
            }).catch(error => {
                console.error('[fetchAPI] GET Error:', error.message)
                if (error.response) {
                    console.error('[fetchAPI] Response status:', error.response.status)
                    console.error('[fetchAPI] Response data:', error.response.data)
                }
                resolve(null);
            });
        } else {
            axios.get(url).then(response => {
                let json = response.data;
                resolve(json);
            }).catch(error => {
                console.error('[fetchAPI] GET Error:', error.message)
                if (error.response) {
                    console.error('[fetchAPI] Response status:', error.response.status)
                    console.error('[fetchAPI] Response data:', error.response.data)
                }
                resolve(null);
            });
        }
    });
};

export const getSwapInfo = async (tokenFrom: string, tokenTo: string, amount: number, decimal: number, slippage: number = 5) => {
	try {

		amount = Math.floor(amount * (10 ** decimal))
		slippage = Math.floor(slippage * (10 ** 2))

        const url = `https://quote-api.jup.ag/v6/quote?inputMint=${tokenFrom}&outputMint=${tokenTo}&amount=${amount}&slippageBps=${slippage}`
        const resp = await fetchAPI(url, 'GET')
		return resp
		
	} catch (error) {
		console.log("getSwapInfo", error)
	}

	return null
}
	  
export const buildSwapTrx = async (walletAddress: string, swapInfoResp: any) => {

	try {

		const resp: any = await fetchAPI('https://quote-api.jup.ag/v6/swap', 'POST', {
			quoteResponse: swapInfoResp,
			userPublicKey: walletAddress,
			wrapAndUnwrapSol: true,
			// prioritizationFeeLamports: Math.floor(TRX_PRIORITY_AMOUNT * LAMPORTS_PER_SOL)
		})

		if (!resp) {
			return null
		}

		const { swapTransaction } = resp;

		const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
		const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

		return transaction;
		
    } catch (error) {

        console.error("buildBuySwapTrx: ", error);
    }

	return null
}

export const getTokenPrice = async (tokenAddress: string, quoteTokenAddress: any) => {

	try {

        const url = `https://price.jup.ag/v4/price?ids=${tokenAddress}&vsToken=${quoteTokenAddress}`
        console.log(`[Price API] Requesting price for ${tokenAddress}...`)
        const resp: any = await fetchAPI(url, 'GET')

		if (resp && resp.data && resp.data[tokenAddress]) {
			const price = resp.data[tokenAddress].price
			console.log(`[Price API] Success: ${tokenAddress} price = ${price}`)
			return price
		} else {
			console.log(`[Price API] No price data for ${tokenAddress}. Response:`, JSON.stringify(resp).substring(0, 200))
		}
		
	} catch (error) {
		console.log("[Price API] Error getting price:", error)
	}
	console.log(`[Price API] Returning 0 for ${tokenAddress} (no price found)`)
	return 0
}