import BN from 'bn.js';
import { BigNumber, ethers } from 'ethers';
import * as fs from 'fs';
import glob from 'glob';
import Web3 from 'web3';
import * as winston from 'winston';

export const DECIMALS = 5;

export function makeBN(value: string | number): BigNumber {
  try {
    return BigNumber.from(value);
  } catch {
    return BigNumber.from(0);
  }
}

export function arrayRemoveElement(array: Array<any>, element: any) {
  const index = array.indexOf(element, 0);
  if (index > -1) {
    array.splice(index, 1);
  }
}

export function getProvider(rpcLink: string): ethers.providers.Provider {
  return new ethers.providers.JsonRpcProvider(rpcLink);
}

export function getWeb3(rpcLink: string, logger?: any) {
  const web3 = new Web3();
  if (rpcLink.startsWith("http")) {
    web3.setProvider(new Web3.providers.HttpProvider(rpcLink));
  } else if (rpcLink.startsWith("ws")) {
    const provider = new Web3.providers.WebsocketProvider(rpcLink, {
      // @ts-ignore
      clientConfig: {
        keepalive: true,
        keepaliveInterval: 60000, // milliseconds
      },
      reconnect: {
        auto: true,
        delay: 2500,
        onTimeout: true,
      },
    });
    provider.on("close", () => {
      if (logger) {
        logger.error(` ! Network WS connection closed.`);
      }
    });
    web3.setProvider(provider);
  }
  web3.eth.handleRevert = true;
  // web3.eth.defaultCommon = { customChain: { name: 'coston', chainId: 20210413, networkId: 20210413 }, baseChain: 'ropsten', hardfork: 'petersburg' };
  //    }
  return web3;
}

export function getAbi(abiPath: string) {
  let abi = JSON.parse(fs.readFileSync(abiPath).toString());
  if (abi.abi) {
    abi = abi.abi;
  }
  return abi;
}

export async function getWeb3Contract(web3: any, address: string, name: string) {
    let abiPath = ""
    try {
        abiPath = await relativeContractABIPathForContractName(name, "artifacts");
        return new web3.eth.Contract(getAbi(`artifacts/${abiPath}`), address);
    } catch(e: any) {
        abiPath = await relativeContractABIPathForContractName(name, "data/artifacts");
        return new web3.eth.Contract(getAbi(`data/artifacts/${abiPath}`), address);
    }    
};

export async function getContract(provider: any, address: string, name: string) {
    let abiPath = ""
        try {
        abiPath = await relativeContractABIPathForContractName(name, "artifacts");
        return new ethers.Contract(address, getAbi(`artifacts/${abiPath}`), provider);
    } catch(e: any) {
        abiPath = await relativeContractABIPathForContractName(name, "data/artifacts");
        return new ethers.Contract(address, getAbi(`data/artifacts/${abiPath}`), provider);
    }    
};

export function getWeb3Wallet(web3: any, privateKey: string) {
  if (privateKey.indexOf("0x") !== 0) {
    privateKey = "0x" + privateKey;
  }
  return web3.eth.accounts.privateKeyToAccount(privateKey);
}

export function getWallet(privateKey: string, provider: any): ethers.Wallet {
  return new ethers.Wallet(privateKey, provider);
}

export function waitFinalize3Factory(web3: any) {
  return async (address: string, func: () => any, delay: number = 1000) => {
    const nonce = await web3.eth.getTransactionCount(address);
    const res = await func();
    const backoff = 1.5;
    let cnt = 0;
    while ((await web3.eth.getTransactionCount(address)) === nonce) {
      await new Promise((resolve: any) => {
        setTimeout(() => {
          resolve();
        }, delay);
      });
      if (cnt < 8) {
        delay = Math.floor(delay * backoff);
        cnt++;
      } else {
        throw new Error("Response timeout");
      }
      console.log(`Delay backoff ${delay} (${cnt})`);
    }
    return res;
  };
}

export function getLogger(label?: string) {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.label({
        label,
      }),
      winston.format.printf((json: any) => {
        if (json.label) {
          return `${json.timestamp}  - ${json.label}:[${json.level}]: ${json.message}`;
        } else {
          return `${json.timestamp}[${json.level}]: ${json.message}`;
        }
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        level: "info",
        filename: "./logs/flare-price-provider.log",
      }),
    ],
  });
}

export function bigNumberToMillis(num: number) {
  return BigNumber.from(num * 1000);
}

export function priceHash(price: number | BN | BigNumber, random: number | BN | BigNumber, address: string): string {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [price.toString(), random.toString(), address]));
}

export async function relativeContractABIPathForContractName(name: string, artifactsRoot = "artifacts"): Promise<string> {
  return new Promise((resolve, reject) => {
    glob(`contracts/**/${name}.sol/${name}.json`, { cwd: artifactsRoot }, (er: any, files: string[] | null) => {
      if (er) {
        reject(er);
      } else {
        if (files && files.length === 1) {
          resolve(files[0]);
        } else {
          reject(files);
        }
      }
    });
  });
}

export async function getRandom(minnum: number = 0, maxnum: number = 10 ** 5) {
  const randomNumber = require("random-number-csprng");
  return await randomNumber(minnum, maxnum);
}

export function getTestStateConnectorAddress() {
    return fs.readFileSync(".stateconnector-address").toString()
}