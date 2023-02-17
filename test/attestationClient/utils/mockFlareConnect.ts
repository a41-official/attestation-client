import { AttestationClientConfig } from "../../../src/attester/configs/AttestationClientConfig";
import { FlareConnection } from "../../../src/attester/FlareConnection";
import { AttLogger } from "../../../src/utils/logging/logger";
import BN from "bn.js";
import { EpochSettings } from "../../../src/utils/data-structures/EpochSettings";
import { toBN } from "web3-utils";

export class MockFlareConnection extends FlareConnection {
  constructor(config: AttestationClientConfig, logger: AttLogger) {
    super(config, logger, false);
  }

  epochSettings = new EpochSettings(toBN(100), toBN(90), toBN(45));

  pastEventsStateConnector: any[] = [];
  pastEventsBitVote: any[] = [];
  defaultSetAddresses: string[] = [];

  async initialize() {}

  protected checkHex64(bnString: string) {
    if (bnString.length != 64 + 2 || bnString[0] !== "0" || bnString[1] !== "x") {
      this.logger.error(`invalid BN formating ${bnString}`);
    }
  }

  public async getAttestorsForAssignors(assignors: string[]): Promise<string[]> {
    return this.defaultSetAddresses;
  }

  public async stateConnectorEvents(fromBlock: number, toBlock: number) {
    return this.pastEventsStateConnector;
  }

  public async bitVotingEvents(fromBlock: number, toBlock: number) {
    return this.pastEventsBitVote;
  }

  async submitAttestation(
    action: string,
    bufferNumber: BN,
    // commit
    commitedMerkleRoot: string,
    commitedMaskedMerkleRoot: string,
    commitedRandom: string,
    // reveal
    revealedMerkleRoot: string,
    revealedRandom: string,

    verbose = true
  ) {
    const roundId = bufferNumber.toNumber() - 1;
    this.checkHex64(commitedMerkleRoot);
    this.checkHex64(commitedMaskedMerkleRoot);
    this.checkHex64(commitedRandom);
    this.checkHex64(revealedMerkleRoot);
    this.checkHex64(revealedRandom);
  }

  public async submitBitVote(
    action: string,
    bufferNumber: BN,
    bitVote: string,
    numberOfAttestations: number,
    numberOfValidatedAttestations: number,
    duplicateCount: number,
    verbose = true
  ) {
    return "valid";
  }

  public addStateConnectorEvents(events) {
    this.pastEventsStateConnector.push(...events);
  }

  public addBitVoteEvents(events) {
    this.pastEventsBitVote.push(...events);
  }

  public addDefaultAddress(addresses: string[]) {
    this.defaultSetAddresses.push(...addresses);
  }
}
