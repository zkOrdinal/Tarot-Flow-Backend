import dotenv from 'dotenv';

dotenv.config();

interface NetworkConfig {
  BASE: {
    name: string;
    rpcUrl: string;
    chainId: number;
    usdcAddress: string;
    explorer: string;
  };
  GOLEMDB: {
    name: string;
    rpcUrl: string;
    projectId: string | undefined;
    apiKey: string | undefined;
  };
}

export const NETWORK_CONFIG: NetworkConfig = {
  BASE: {
    name: "Base Sepolia",
    rpcUrl: process.env.BASE_RPC_URL || "https://sepolia.base.org",
    chainId: 84532,
    usdcAddress: process.env.USDC_CONTRACT_ADDRESS || "0x036CbD53842c5426634e792954Da7Dfd334fF160",
    explorer: "https://base-sepolia.blockscout.com/"
  },
  GOLEMDB: {
    name: "Holesky",
    rpcUrl: process.env.GOLEM_RPC_URL || "https://ethwarsaw.holesky.golemdb.io/rpc",
    projectId: process.env.GOLEM_PROJECT_ID,
    apiKey: process.env.GOLEM_API_KEY
  }
};

export const STORE_WALLET_ADDRESS = process.env.STORE_WALLET_ADDRESS;
export const JWT_SECRET = process.env.JWT_SECRET;
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;