import { VersionedTransaction, Keypair, Connection, ComputeBudgetProgram, TransactionInstruction, TransactionMessage } from "@solana/web3.js"
import base58 from "bs58"

import { DISTRIBUTION_WALLETNUM, PRIVATE_KEY,  RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, SWAP_AMOUNT, VANITY_MODE } from "./constants"
import { generateVanityAddress, saveDataToFile, sleep } from "./utils"
import { createTokenTx, distributeSol, addAddressesToTable, createLUT, makeBuyIx } from "./src/main";
import { executeJitoTx } from "./executor/jito";

const commitment = "confirmed"

const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})
const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
console.log(mainKp.publicKey.toBase58())
let kps: Keypair[] = []
const transactions: VersionedTransaction[] = []

let mintKp = Keypair.generate()
if (VANITY_MODE) {
  const { keypair, pubkey } = generateVanityAddress("pump")
  mintKp = keypair
  console.log(`Keypair generated with "pump" ending: ${pubkey}`);
}
const mintAddress = mintKp.publicKey

const main = async () => {

  const mainBal = await connection.getBalance(mainKp.publicKey)
  console.log((mainBal / 10 ** 9).toFixed(3), "SOL in main keypair")

  console.log("Mint address of token ", mintAddress.toBase58())
  saveDataToFile([base58.encode(mintKp.secretKey)], "mint.json")

  const tokenCreationIxs = await createTokenTx(mainKp, mintKp)
  const minimumSolAmount = (SWAP_AMOUNT + 0.01) * 20 + 0.05

  if (mainBal / 10 ** 9 < minimumSolAmount) {
    console.log("Main wallet balance is not enough to run the bundler")
    console.log(`Plz charge the wallet more than ${minimumSolAmount}SOL`)
    return
  }

  console.log("Distributing SOL to wallets...")
  let result = await distributeSol(connection, mainKp, DISTRIBUTION_WALLETNUM)
  if (!result) {
    console.log("Distribution failed")
    return
  } else {
    kps = result
  }
  console.log("Creating LUT started")
  const lutAddress = await createLUT(mainKp)
  if (!lutAddress) {
    console.log("Lut creation failed")
    return
  }
  console.log("LUT Address:", lutAddress.toBase58())
  saveDataToFile([lutAddress.toBase58()], "lut.json")
  await addAddressesToTable(lutAddress, mintAddress, kps, mainKp)
  const buyIxs: TransactionInstruction[] = []

  for (let i = 0; i < DISTRIBUTION_WALLETNUM; i++) {
    const ix = await makeBuyIx(kps[i], Math.floor(SWAP_AMOUNT * 10 ** 9), i, mainKp.publicKey, mintAddress)
    buyIxs.push(...ix)
  }

  const lookupTable = (await connection.getAddressLookupTable(lutAddress)).value;
  if (!lookupTable) {
    console.log("Lookup table not ready")
    return
  }
  const latestBlockhash = await connection.getLatestBlockhash()

  const tokenCreationTx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: mainKp.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: tokenCreationIxs
    }).compileToV0Message()
  )

  tokenCreationTx.sign([mainKp, mintKp])

  transactions.push(tokenCreationTx)
  for (let i = 0; i < Math.ceil(DISTRIBUTION_WALLETNUM / 5); i++) {
    const latestBlockhash = await connection.getLatestBlockhash()
    const instructions: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 5_000_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
    ]

    for (let j = 0; j < 5; j++) {
      const index = i * 5 + j
      if (kps[index])
        instructions.push(buyIxs[index * 2], buyIxs[index * 2 + 1])
    }
    const msg = new TransactionMessage({
      payerKey: kps[i * 5].publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions
    }).compileToV0Message([lookupTable])

    const tx = new VersionedTransaction(msg)
    for (let j = 0; j < 5; j++) {
      const index = i * 5 + j
      if (kps[index])
        tx.sign([kps[index]])
    }
    transactions.push(tx)
  }

  transactions.map(async (tx, i) => console.log(i, " | ", tx.serialize().length, "bytes | \n", (await connection.simulateTransaction(tx, { sigVerify: true }))))
  await executeJitoTx(transactions, mainKp, commitment)
  await sleep(10000)
}

main()
