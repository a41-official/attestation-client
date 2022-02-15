/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { ContractOptions } from "web3-eth-contract";
import { EventLog } from "web3-core";
import { EventEmitter } from "events";
import {
  Callback,
  PayableTransactionObject,
  NonPayableTransactionObject,
  BlockType,
  ContractEventLog,
  BaseContract,
} from "./types";

interface EventOptions {
  filter?: object;
  fromBlock?: BlockType;
  topics?: string[];
}

export interface HashTest extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): HashTest;
  clone(): HashTest;
  methods: {
<<<<<<< HEAD
    hashTestBalanceDecreasingPayment(
      _data: string | number[],
      _hashToProve: string | number[]
    ): NonPayableTransactionObject<boolean>;

    hashTestBlockHeightExistence(
      _data: string | number[],
      _hashToProve: string | number[]
    ): NonPayableTransactionObject<boolean>;

    hashTestPayment(
      _data: string | number[],
      _hashToProve: string | number[]
    ): NonPayableTransactionObject<boolean>;

    hashTestReferencedPaymentNonExistence(
      _data: string | number[],
      _hashToProve: string | number[]
=======
    testDecreaseBalanceProof(
      typ: number | string | BN,
      chainId: number | string | BN,
      blockNumber: number | string | BN,
      txId: string | number[],
      sourceAddress: string | number[],
      spent: number | string | BN,
      hashToProve: string | number[]
    ): NonPayableTransactionObject<boolean>;

    testFassetProof(
      typ: number | string | BN,
      chainId: number | string | BN,
      blockNumber: number | string | BN,
      txId: string | number[],
      inUtxo: number | string | BN,
      sourceAddress: string | number[],
      destinationAddress: string | number[],
      destinationTag: number | string | BN,
      spent: number | string | BN,
      received: number | string | BN,
      fee: number | string | BN,
      status: number | string | BN,
      hashToProve: string | number[]
>>>>>>> main
    ): NonPayableTransactionObject<boolean>;

    verifyMerkleProof(
      proof: (string | number[])[],
      merkleRoot: string | number[],
      leaf: string | number[]
    ): NonPayableTransactionObject<boolean>;
  };
  events: {
    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };
}
