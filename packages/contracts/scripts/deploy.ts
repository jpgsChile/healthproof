import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy IssuerRegistry
  const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistry.deploy();
  await issuerRegistry.waitForDeployment();
  const issuerRegistryAddress = await issuerRegistry.getAddress();
  console.log("IssuerRegistry deployed to:", issuerRegistryAddress);

  // 2. Deploy DocumentRegistry (requires IssuerRegistry address)
  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const documentRegistry = await DocumentRegistry.deploy(issuerRegistryAddress);
  await documentRegistry.waitForDeployment();
  const documentRegistryAddress = await documentRegistry.getAddress();
  console.log("DocumentRegistry deployed to:", documentRegistryAddress);

  // 3. Registrar deployer como issuer en IssuerRegistry
  await issuerRegistry.registerIssuer(
    deployer.address,
    `did:ethr:${deployer.address}`,
    "HealthProof Test Issuer"
  );

  console.log("\n--- Deployment Summary ---");
  console.log("IssuerRegistry:", issuerRegistryAddress);
  console.log("DocumentRegistry:", documentRegistryAddress);
  console.log("Deployer registered as issuer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
