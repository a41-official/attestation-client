import BN from "bn.js";
import { Logger } from "winston";
import { Attestation } from "./Attestation";
import { AttestationData, AttestationType } from "./AttestationData";
import { AttesterClientConfiguration as AttesterClientConfiguration } from "./AttesterClientConfiguration";
import { AttesterEpoch } from "./AttesterEpoch";
import { AttesterWeb3 } from "./AttesterWeb3";
import { ChainManager } from "./ChainManager";
import { EpochSettings } from "./EpochSettings";
import { getTimeMilli } from "./internetTime";
import { ChainType } from "./MCC/MCClientSettings";
import { partBNbe, toBN } from "./utils";

export class Test {}

export class Attester {
  logger: Logger;
  static epochSettings: EpochSettings;
  chainManager!: ChainManager;
  epoch: Map<number, AttesterEpoch> = new Map<number, AttesterEpoch>();
  conf!: AttesterClientConfiguration;
  attesterWeb3: AttesterWeb3;

  constructor(chainManager: ChainManager, conf: AttesterClientConfiguration, logger: Logger, attesterWeb3: AttesterWeb3) {
    this.chainManager = chainManager;
    this.conf = conf;
    this.logger = logger;
    Attester.epochSettings = new EpochSettings(toBN(conf.firstEpochStartTime), toBN(conf.epochPeriod));
    this.attesterWeb3 = attesterWeb3;
  }

  async attestate(tx: AttestationData) {
    const time = tx.timeStamp.toNumber();

    const epochId: number = Attester.epochSettings.getEpochIdForTime(tx.timeStamp.mul(toBN(1000))).toNumber();

    // all times are in milliseconds
    const now = getTimeMilli();
    const epochTimeStart = Attester.epochSettings.getEpochIdTimeStart(epochId);
    const epochCommitTime: number = epochTimeStart + this.conf.epochPeriod * 1000 + 1;
    const epochRevealTime: number = epochCommitTime + this.conf.epochPeriod * 1000 + 2;
    const epochCompleteTime: number = epochRevealTime + this.conf.epochPeriod * 1000 + 3;

    if (now > epochCommitTime) {
      this.logger.error(` ! attestation timestamp too late ${tx.blockNumber} ${tx.dataHash}`);
      return;
    }

    let activeEpoch = this.epoch.get(epochId);

    // check if attester epoch already exists - if not - create a new one and assign callbacks
    if (activeEpoch === undefined) {
      activeEpoch = new AttesterEpoch(epochId, this.logger, this.attesterWeb3);

      // setup commit, reveal and completed callbacks
      this.logger.warning(` * AttestEpoch ${epochId} collect epoch [0]`);

      setTimeout(() => {
        activeEpoch!.startCommitEpoch();
      }, epochCommitTime - now);

      setTimeout(() => {
        activeEpoch!.startRevealEpoch();
      }, epochRevealTime - now);

      setTimeout(() => {
        activeEpoch!.reveal();
      }, epochRevealTime - now + this.conf.revealTime * 1000);

      setTimeout(() => {
        activeEpoch!.completed();
      }, epochCompleteTime - now);

      this.epoch.set(epochId, activeEpoch);
    }

    // todo: clean up old attestations (minor memory leak)

    // create, check and add attestation
    const attestation = await this.createAttestation(epochId, tx);

    if (attestation === undefined) {
      return;
    }

    activeEpoch.addAttestation(attestation);
  }

  async createAttestation(epochId: number, tx: AttestationData): Promise<Attestation | undefined> {
    // create attestation depending on type
    switch (tx.type) {
      case AttestationType.FassetPaymentProof: {
        const chainType: BN = partBNbe(tx.instructions, 16, 32);

        return await this.chainManager.validateTransaction(chainType.toNumber() as ChainType, epochId, tx);
      }
      case AttestationType.BalanceDecreasingProof:
        return undefined; // ???
      default: {
        this.logger.error(`  ! #${tx.type} undefined AttestationType epoch: #${epochId})`);
        return undefined;
      }
    }
  }
}
