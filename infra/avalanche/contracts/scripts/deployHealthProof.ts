import { ethers, network } from "hardhat";

async function main() {

  console.log("--------------------------------------------------");
  console.log("HealthProof Protocol Deployment");
  console.log("Network:", network.name);
  console.log("--------------------------------------------------");

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account found. Configure PRIVATE_KEY in .env for the selected network."
    );
  }

  console.log("Deployer:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "HVE");

  console.log("\nStarting deployment...\n");

  /*
  --------------------------------------------------
  IdentityRegistry
  --------------------------------------------------
  */

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();

  const identityAddress = await identityRegistry.getAddress();

  console.log("IdentityRegistry:", identityAddress);

  /*
  --------------------------------------------------
  GuardianRegistry
  --------------------------------------------------
  */

  const GuardianRegistry = await ethers.getContractFactory("GuardianRegistry");

  const guardianRegistry = await GuardianRegistry.deploy(identityAddress);

  await guardianRegistry.waitForDeployment();

  const guardianAddress = await guardianRegistry.getAddress();

  console.log("GuardianRegistry:", guardianAddress);

  /*
  --------------------------------------------------
  PermissionManager
  --------------------------------------------------
  */

  const PermissionManager = await ethers.getContractFactory("PermissionManager");

  const permissionManager = await PermissionManager.deploy(
    identityAddress,
    guardianAddress
  );

  await permissionManager.waitForDeployment();

  const permissionAddress = await permissionManager.getAddress();

  console.log("PermissionManager:", permissionAddress);

  /*
  --------------------------------------------------
  ClinicalEpisodeRegistry
  --------------------------------------------------
  */

  const ClinicalEpisodeRegistry = await ethers.getContractFactory(
    "ClinicalEpisodeRegistry"
  );

  const clinicalEpisodeRegistry = await ClinicalEpisodeRegistry.deploy(
    identityAddress
  );

  await clinicalEpisodeRegistry.waitForDeployment();

  const episodeAddress = await clinicalEpisodeRegistry.getAddress();

  console.log("ClinicalEpisodeRegistry:", episodeAddress);

  /*
  --------------------------------------------------
  MedicalOrderRegistry
  --------------------------------------------------
  */

  const MedicalOrderRegistry = await ethers.getContractFactory(
    "MedicalOrderRegistry"
  );

  const medicalOrderRegistry = await MedicalOrderRegistry.deploy(identityAddress);

  await medicalOrderRegistry.waitForDeployment();

  const orderAddress = await medicalOrderRegistry.getAddress();

  console.log("MedicalOrderRegistry:", orderAddress);

  /*
  --------------------------------------------------
  MedicalDocumentRegistry
  --------------------------------------------------
  */

  const MedicalDocumentRegistry = await ethers.getContractFactory(
    "MedicalDocumentRegistry"
  );

  const medicalDocumentRegistry = await MedicalDocumentRegistry.deploy(
    identityAddress
  );

  await medicalDocumentRegistry.waitForDeployment();

  const documentAddress = await medicalDocumentRegistry.getAddress();

  console.log("MedicalDocumentRegistry:", documentAddress);

  /*
  --------------------------------------------------
  HealthcareNetworkRegistry
  --------------------------------------------------
  */

  const HealthcareNetworkRegistry = await ethers.getContractFactory(
    "HealthcareNetworkRegistry"
  );

  const healthcareNetworkRegistry = await HealthcareNetworkRegistry.deploy();

  await healthcareNetworkRegistry.waitForDeployment();

  const networkRegistryAddress = await healthcareNetworkRegistry.getAddress();

  console.log("HealthcareNetworkRegistry:", networkRegistryAddress);

  /*
  --------------------------------------------------
  AuditTrail
  --------------------------------------------------
  */

  const AuditTrail = await ethers.getContractFactory("AuditTrail");

  const auditTrail = await AuditTrail.deploy();

  await auditTrail.waitForDeployment();

  const auditAddress = await auditTrail.getAddress();

  console.log("AuditTrail:", auditAddress);

  /*
  --------------------------------------------------
  HealthProofKernel
  --------------------------------------------------
  */

  const HealthProofKernel = await ethers.getContractFactory("HealthProofKernel");

  const kernel = await HealthProofKernel.deploy(
    deployer.address,
    deployer.address,
    deployer.address
  );

  await kernel.waitForDeployment();

  const kernelAddress = await kernel.getAddress();

  console.log("HealthProofKernel:", kernelAddress);

  /*
  --------------------------------------------------
  HealthProofGateway
  --------------------------------------------------
  */

  const HealthProofGateway = await ethers.getContractFactory("HealthProofGateway");

  const gateway = await HealthProofGateway.deploy(kernelAddress);

  await gateway.waitForDeployment();

  const gatewayAddress = await gateway.getAddress();

  console.log("HealthProofGateway:", gatewayAddress);

  /*
  --------------------------------------------------
  HealthProofProtocol
  --------------------------------------------------
  */

  const HealthProofProtocol = await ethers.getContractFactory(
    "HealthProofProtocol"
  );

  const protocol = await HealthProofProtocol.deploy(
    permissionAddress,
    documentAddress,
    auditAddress
  );

  await protocol.waitForDeployment();

  const protocolAddress = await protocol.getAddress();

  console.log("HealthProofProtocol:", protocolAddress);

  /*
  --------------------------------------------------
  Register Modules in Kernel
  --------------------------------------------------
  */

  console.log("\nRegistering Kernel Modules...\n");

  const EPISODE_MODULE = ethers.keccak256(
    ethers.toUtf8Bytes("EPISODE_MODULE")
  );

  const ORDER_MODULE = ethers.keccak256(
    ethers.toUtf8Bytes("ORDER_MODULE")
  );

  const DOCUMENT_MODULE = ethers.keccak256(
    ethers.toUtf8Bytes("DOCUMENT_MODULE")
  );

  const PERMISSION_MODULE = ethers.keccak256(
    ethers.toUtf8Bytes("PERMISSION_MODULE")
  );

  let tx;

  tx = await kernel.registerModule(EPISODE_MODULE, episodeAddress);
  await tx.wait();

  tx = await kernel.registerModule(ORDER_MODULE, orderAddress);
  await tx.wait();

  tx = await kernel.registerModule(DOCUMENT_MODULE, documentAddress);
  await tx.wait();

  tx = await kernel.registerModule(PERMISSION_MODULE, permissionAddress);
  await tx.wait();

  console.log("Kernel modules registered.");

  /*
  --------------------------------------------------
  Bootstrap: Registrar deployer y Gateway en IdentityRegistry
  --------------------------------------------------
  */

  console.log("\nBootstrap: Registrando deployer y Gateway...");

  await identityRegistry.registerEntity(
    deployer.address,
    5, // Role.ADMIN
    "",
    ethers.ZeroAddress
  );
  await identityRegistry.verifyEntity(deployer.address);
  console.log("  -> Deployer registrado como ADMIN y verificado");

  await identityRegistry.registerEntity(gatewayAddress, 1, "", ethers.ZeroAddress); // DOCTOR
  await identityRegistry.verifyEntity(gatewayAddress);
  console.log("  -> Gateway registrado como DOCTOR y verificado");

  /*
  --------------------------------------------------
  Deployment Summary
  --------------------------------------------------
  */

  console.log("\n--------------------------------------------------");
  console.log("HealthProof Deployment Summary");
  console.log("--------------------------------------------------");

  console.log("IdentityRegistry:", identityAddress);
  console.log("GuardianRegistry:", guardianAddress);
  console.log("PermissionManager:", permissionAddress);
  console.log("ClinicalEpisodeRegistry:", episodeAddress);
  console.log("MedicalOrderRegistry:", orderAddress);
  console.log("MedicalDocumentRegistry:", documentAddress);
  console.log("HealthcareNetworkRegistry:", networkRegistryAddress);
  console.log("AuditTrail:", auditAddress);
  console.log("HealthProofKernel:", kernelAddress);
  console.log("HealthProofGateway:", gatewayAddress);
  console.log("HealthProofProtocol:", protocolAddress);

  console.log("\nDeployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});