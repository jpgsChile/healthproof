import "dotenv/config";
import { ethers, formatEther } from "ethers";
import { Preflight__factory } from "../typechain-types";

const RPC = process.env.HYGIEIA_RPC_URL;
const DEPLOYER_ADDRESS = "0xe81461cB96b1503977E6a88b6509A47615c5bD00";

async function main() {
  if (!RPC) {
    throw new Error("HYGIEIA_RPC_URL is not set");
  }

  console.log("RPC:", RPC);
  const provider = new ethers.JsonRpcProvider(RPC);

  // 1. chainId
  const network = await provider.getNetwork();
  console.log("chainId:", Number(network.chainId));
  if (Number(network.chainId) !== 21668) {
    throw new Error(`chainId invalid: ${network.chainId}`);
  }

  // 2. balance
  const balance = await provider.getBalance(DEPLOYER_ADDRESS);
  console.log("deployer:", DEPLOYER_ADDRESS);
  console.log("balance:", balance.toString(), "=", formatEther(balance), "HVE");
  if (balance === BigInt(0)) {
    throw new Error("Deployer has no native token balance");
  }

  // 3. private key -> address match
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    throw new Error("PRIVATE_KEY is not set in .env");
  }
  const wallet = new ethers.Wallet(pk, provider);
  console.log("derived address:", wallet.address);
  if (wallet.address.toLowerCase() !== DEPLOYER_ADDRESS.toLowerCase()) {
    throw new Error(
      `PRIVATE_KEY derives ${wallet.address}, expected ${DEPLOYER_ADDRESS}`,
    );
  }

  // 4. deploy tiny contract
  const factory = new Preflight__factory(wallet);

  console.log("sending deployment tx...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("deployed contract:", address);

  const tx = contract.deploymentTransaction();
  if (!tx) {
    throw new Error("Deployment transaction not found");
  }
  const receipt = await tx.wait();
  console.log("gas used:", receipt?.gasUsed.toString());
  console.log("block:", receipt?.blockNumber);

  // sanity check: write/read
  const setTx = await contract.set(21668);
  await setTx.wait();
  const read = await contract.value();
  console.log("stored value:", read.toString());
  if (read !== BigInt(21668)) {
    throw new Error("Contract read/write failed");
  }
}

main().catch((err) => {
  console.error("PREFLIGHT FAILED:", err.message);
  process.exit(1);
});
