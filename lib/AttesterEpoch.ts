import assert from "assert";
import BN from "bn.js";
import { Logger } from "winston";
import { Attestation, AttestationStatus } from "./Attestation";
import { Attester } from "./Attester";
import { AttesterWeb3 } from "./AttesterWeb3";
import { Hash } from "./Hash";
import { getTimeMilli } from "./internetTime";
import { MerkleTree } from "./MerkleTree";
import { getRandom, toBN } from "./utils";

export enum AttesterEpochStatus {
  collect,
  commit,
  reveal,
  completed,
}

export enum AttestStatus {
  collecting,
  commiting,
  comitted,
  revealed,
  error,
}

export class AttesterEpoch {
  logger: Logger;
  status: AttesterEpochStatus = AttesterEpochStatus.collect;
  epochId: number;
  attestations = new Array<Attestation>();
  merkleTree!: MerkleTree;
  hash!: string;
  random!: BN;
  attestStatus: AttestStatus;
  attesterWeb3: AttesterWeb3;

  transactionsProcessed: number = 0;

  constructor(epochId: number, logger: Logger, attesterWeb3: AttesterWeb3) {
    this.epochId = epochId;
    this.logger = logger;
    this.status = AttesterEpochStatus.collect;
    this.attestStatus = AttestStatus.collecting;
    this.attesterWeb3 = attesterWeb3;
  }

  addAttestation(attestation: Attestation) {
    attestation!.onProcessed = (tx) => {
      this.processed(attestation);
    };
    this.attestations.push(attestation);
  }

  startCommitEpoch() {
    this.logger.debug(` # AttestEpoch #${this.epochId} commit epoch started [1]`);
    this.status = AttesterEpochStatus.commit;

    // if all transactions are proccessed then commit
    if (this.transactionsProcessed === this.attestations.length) {
      if (this.status === AttesterEpochStatus.commit) {
        this.commit();
      }
    }
  }

  startRevealEpoch() {
    this.logger.debug(` # AttestEpoch #${this.epochId} reveal epoch started [2]`);
    this.status = AttesterEpochStatus.reveal;
  }

  completed() {
    this.logger.debug(` # AttestEpoch #${this.epochId} completed`);
    this.status = AttesterEpochStatus.completed;
  }

  processed(tx: Attestation) {
    this.transactionsProcessed++;

    assert(this.transactionsProcessed <= this.attestations.length);

    if (this.transactionsProcessed === this.attestations.length) {
      if (this.status === AttesterEpochStatus.commit) {
        // all transactions were processed and we are in commit epoch
        this.logger.info(`     * AttestEpoch #${this.epochId} all transactions processed ${this.attestations.length} commiting...`);
        this.commit();
      } else {
        // all transactions were processed but we are NOT in commit epoch yet
        this.logger.info(`     * AttestEpoch #${this.epochId} all transactions processed ${this.attestations.length} waiting for commit epoch`);
      }
    } else {
      // not all transactions were processed
      //this.logger.info(`     * AttestEpoch #${this.epochId} transaction processed ${this.transactionsProcessed}/${this.attestations.length}`);
    }
  }

  async commit() {
    if (this.status !== AttesterEpochStatus.commit) {
      this.logger.error(`  ! AttestEpoch #${this.epochId} cannot commit (wrong epoch status ${this.status})`);
      return;
    }
    if (this.attestStatus !== AttestStatus.collecting) {
      this.logger.error(`  ! AttestEpoch #${this.epochId} cannot commit (wrong attest status ${this.attestStatus})`);
      return;
    }

    this.attestStatus = AttestStatus.commiting;

    // collect validat attestations
    const validated = new Array<Attestation>();
    for (const tx of this.attestations.values()) {
      if (tx.status === AttestationStatus.valid) {
        validated.push(tx);
      }
    }

    // check if there is any valid attestation
    if (validated.length === 0) {
      this.logger.error(` ! AttestEpoch #${this.epochId} no valid attestation (${this.attestations.length} attestation(s))`);
      return;
    }

    this.logger.info(` * AttestEpoch #${this.epochId} comitting (${validated.length}/${this.attestations.length} attestation(s))`);

    // sort valid attestations (blockNumber, transactionIndex, signature)
    validated.sort((a: Attestation, b: Attestation) => a.data.comparator(b.data));

    // collect sorted valid attestation ids
    const validatedHashes: string[] = new Array<string>();
    for (const valid of validated) {
      validatedHashes.push(valid.data.id);
    }

    // create merkle tree
    this.merkleTree = new MerkleTree(validatedHashes);

    this.hash = this.merkleTree.root!;
    this.random = await getRandom();

    //
    //   collect   | commit       | reveal
    //   x         | x+1          | x+2
    //

    // calculate remaining time in epoch
    const now = getTimeMilli();
    const epochCommitEndTime = Attester.epochSettings.getEpochIdCommitTimeEnd(this.epochId);
    const commitTimeLeft = epochCommitEndTime - now;

    this.logger.debug(`   # commitAttestation ${this.epochId} time left ${commitTimeLeft}ms`);

    this.attesterWeb3
      .submitAttestation(
        `commitAttestation ${this.epochId}`,
        // commit index (collect+1)
        toBN(this.epochId + 1),
        toBN(this.hash).xor(toBN(this.random)),
        toBN(Hash.create(this.random.toString())),
        toBN(0)
      )
      .then((receit) => {
        if (receit) {
          this.logger.warning(`   * attestation ${this.epochId} commited`);
          this.attestStatus = AttestStatus.comitted;
        } else {
          this.attestStatus = AttestStatus.error;
        }
      });
  }

  async reveal() {
    if (this.status !== AttesterEpochStatus.reveal) {
      this.logger.error(`  ! AttestEpoch #${this.epochId} cannot reveal (not in reveal epoch status ${this.status})`);
      return;
    }
    if (this.attestStatus !== AttestStatus.comitted) {
      this.logger.error(`  ! AttestEpoch #${this.epochId} cannot reveal (not commited ${this.attestStatus})`);
      return;
    }

    this.logger.info(` * AttestEpoch #${this.epochId} reveal`);

    this.attesterWeb3
      .submitAttestation(
        `revealAttestation ${this.epochId}`,
        // commit index (collect+2)
        toBN(this.epochId + 2),
        toBN(0),
        toBN(0),
        this.random
      )
      .then((receit) => {
        if (receit) {
          this.logger.warning(`   * attestation ${this.epochId} revealed`);
          this.attestStatus = AttestStatus.revealed;
        } else {
          this.attestStatus = AttestStatus.error;
        }
      });
  }
}
