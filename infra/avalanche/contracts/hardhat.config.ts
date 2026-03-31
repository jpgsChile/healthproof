import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    hygieia: {
      url:
        process.env.HYGIEIA_RPC_URL ||
        "http://18.223.252.59:9650/ext/bc/kZYSkYiknAeZJbwtz4M6tN9YmbriGiLQwLKR4Pr7S2UEXQQuW/rpc",
      chainId: 21668,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;

