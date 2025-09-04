import { AddressLookupTableAccount, Connection, Keypair, PublicKey, SendOptions, Signer, SystemProgram, TransactionConfirmationStrategy, TransactionSignature, VersionedTransaction } from "@solana/web3.js";
// import { Connection } from './connection'
import bs58 from "bs58";
import { TransactionMessage } from "@solana/web3.js";
import axios from "axios";
import { sleep } from ".";
import { DelayDetector } from "./delay_detector";

const JITO_BLOCK_ENGINE_URL = "frankfurt.mainnet.block-engine.jito.wtf";

export interface BundleResult {
  msg: string,
  success: boolean
  bundleId: string
}

const tipAccounts = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT"
].map(address => new PublicKey(address));

export const getRandomTipAccount = () => {
  return tipAccounts[Math.floor(Math.random() * tipAccounts.length)];
}

export const fetchAPI = async (url: string, method: 'GET' | 'POST', data: Record<string, any> = {}): Promise<any | null> => {
  return new Promise(resolve => {
    if (method === "POST") {
      axios.post(url, data, {
        headers: {
          "Content-Type": "application/json",
        },
      }).then(response => {
        let json = response.data;
        resolve(json);
      }).catch(error => {
        console.error('[fetchAPI]', error.response.data.error)
        resolve(null);
      });
    } else {
      axios.get(url).then(response => {
        let json = response.data;
        resolve(json);
      }).catch(error => {
        // console.error('fetchAPI', error);
        resolve(null);
      });
    }
  });
};

export async function createAndSendBundle(
  connection: Connection,
  bundleTransactions: VersionedTransaction,
  feePayer: Keypair,
  signers: Array<Signer>,
  tip: number
): Promise<Array<TransactionSignature>> {
  let signatures: Array<TransactionSignature> = []
  try {
    let delayDetector = new DelayDetector()

    const recentBlockhash = (await connection.getLatestBlockhash())

    signatures = []

    let instructions = SystemProgram.transfer({
      fromPubkey: feePayer.publicKey,
      toPubkey: getRandomTipAccount(),
      lamports: tip,
    })

    const addressLookupTableAccounts = await Promise.all(
      bundleTransactions.message.addressTableLookups.map(async (lookup) => {
        return new AddressLookupTableAccount({
          key: lookup.accountKey,
          state: AddressLookupTableAccount.deserialize(await connection.getAccountInfo(lookup.accountKey).then((res: any) => res.data)),
        })
      }))
    let message = TransactionMessage.decompile(bundleTransactions.message, { addressLookupTableAccounts: addressLookupTableAccounts })
    message.instructions.push(instructions)
    bundleTransactions.message = message.compileToV0Message(addressLookupTableAccounts)

    let newBundleTransactions: VersionedTransaction[] = []
    bundleTransactions.message.recentBlockhash = recentBlockhash.blockhash
    bundleTransactions.sign(signers)
    for (let sg of bundleTransactions.signatures) {
      signatures.push(bs58.encode(sg))
      break
    }

    newBundleTransactions.push(bundleTransactions)

    const rawTransactions = newBundleTransactions.map(item => bs58.encode(item.serialize()));
    const data = await fetchAPI(`https://${JITO_BLOCK_ENGINE_URL}/api/v1/bundles`, 'POST',
      {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [
          rawTransactions
        ],
      },
    );
    if (data) {
      console.log("⌛ Sending bundle ...")
    } else {
      console.log("Jito failed")
      return []
    }

    return new Promise(async (resolve: any, reject: any) => {
      (async () => {
        while (true) {
          await sleep(1000)
          try {
            const result = await connection.getSignatureStatus(signatures[0], {
              searchTransactionHistory: true,
            });

            if (result && result.value && result.value.confirmationStatus) {
              resolve(signatures)
              console.log("Transaction confirmed", signatures[0])
              break
            }

          } catch (error) {
            // console.error("Error confirmation: ", error);
          }

          if (delayDetector.estimate(false) >= 30 * 1000) {
            break
          }
        }
        resolve([])

      })();
    })
  }
  catch (err) {
    // console.log(err);
  }
  return []
}