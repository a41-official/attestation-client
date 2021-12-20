import { AttestTransactionType, NormalizedTransactionData, TransactionData } from "../MCC/tx-normalize";

export function fullTransactionHash(
    txData: NormalizedTransactionData
) {
    if (txData.attestationType != AttestTransactionType.FULL) throw Error("Not full transaction hash")
    const encoded = web3.eth.abi.encodeParameters(
        [
            'uint32', // type
            'uint64', // chainId
            'uint64', // blockNumber
            'bytes32',  // txId
            'uint16', // utxo
            'string',  // sourceAddress
            'string',  // destinationAddress
            'uint256', // destinationTag
            'uint256', // amount
            'uint32'  // gas
        ],
        [
            txData.attestationType,
            txData.chainId,
            txData.blockNumber,
            txData.txId,
            txData.utxo,
            txData.sourceAddress,
            txData.destinationAddress,
            txData.destinationTag,
            txData.amount,
            txData.gasOrFee
        ]
    );
    return web3.utils.soliditySha3(encoded);
}


