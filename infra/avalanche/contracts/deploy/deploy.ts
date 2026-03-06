import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. IdentityRegistry
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddr = await identityRegistry.getAddress();
  console.log("IdentityRegistry:", identityRegistryAddr);

  // 2. GuardianRegistry
  const GuardianRegistry = await ethers.getContractFactory("GuardianRegistry");
  const guardianRegistry = await GuardianRegistry.deploy(identityRegistryAddr);
  await guardianRegistry.waitForDeployment();
  const guardianRegistryAddr = await guardianRegistry.getAddress();
  console.log("GuardianRegistry:", guardianRegistryAddr);

  // 3. PermissionManager
  const PermissionManager = await ethers.getContractFactory("PermissionManager");
  const permissionManager = await PermissionManager.deploy(
    identityRegistryAddr,
    guardianRegistryAddr
  );
  await permissionManager.waitForDeployment();
  const permissionManagerAddr = await permissionManager.getAddress();
  console.log("PermissionManager:", permissionManagerAddr);

  // 4. AuditTrail
  const AuditTrail = await ethers.getContractFactory("AuditTrail");
  const auditTrail = await AuditTrail.deploy();
  await auditTrail.waitForDeployment();
  const auditTrailAddr = await auditTrail.getAddress();
  console.log("AuditTrail:", auditTrailAddr);

  // 5. MedicalDocumentRegistry
  const MedicalDocumentRegistry = await ethers.getContractFactory("MedicalDocumentRegistry");
  const medicalDocumentRegistry = await MedicalDocumentRegistry.deploy(identityRegistryAddr);
  await medicalDocumentRegistry.waitForDeployment();
  const docRegistryAddr = await medicalDocumentRegistry.getAddress();
  console.log("MedicalDocumentRegistry:", docRegistryAddr);

  // 6. ClinicalEpisodeRegistry
  const ClinicalEpisodeRegistry = await ethers.getContractFactory("ClinicalEpisodeRegistry");
  const clinicalEpisodeRegistry = await ClinicalEpisodeRegistry.deploy(identityRegistryAddr);
  await clinicalEpisodeRegistry.waitForDeployment();
  const episodeRegistryAddr = await clinicalEpisodeRegistry.getAddress();
  console.log("ClinicalEpisodeRegistry:", episodeRegistryAddr);

  // 7. MedicalOrderRegistry
  const MedicalOrderRegistry = await ethers.getContractFactory("MedicalOrderRegistry");
  const medicalOrderRegistry = await MedicalOrderRegistry.deploy(identityRegistryAddr);
  await medicalOrderRegistry.waitForDeployment();
  const orderRegistryAddr = await medicalOrderRegistry.getAddress();
  console.log("MedicalOrderRegistry:", orderRegistryAddr);

  // 8. HealthcareNetworkRegistry
  const HealthcareNetworkRegistry = await ethers.getContractFactory("HealthcareNetworkRegistry");
  const healthcareNetworkRegistry = await HealthcareNetworkRegistry.deploy();
  await healthcareNetworkRegistry.waitForDeployment();
  const networkRegistryAddr = await healthcareNetworkRegistry.getAddress();
  console.log("HealthcareNetworkRegistry:", networkRegistryAddr);

  // 9. HealthProofProtocol
  const HealthProofProtocol = await ethers.getContractFactory("HealthProofProtocol");
  const healthProofProtocol = await HealthProofProtocol.deploy(
    permissionManagerAddr,
    docRegistryAddr,
    auditTrailAddr
  );
  await healthProofProtocol.waitForDeployment();
  const protocolAddr = await healthProofProtocol.getAddress();
  console.log("HealthProofProtocol:", protocolAddr);

  // 10. HealthProofKernel
  const HealthProofKernel = await ethers.getContractFactory("HealthProofKernel");
  const healthProofKernel = await HealthProofKernel.deploy(
    deployer.address,
    deployer.address,
    deployer.address
  );
  await healthProofKernel.waitForDeployment();
  const kernelAddr = await healthProofKernel.getAddress();
  console.log("HealthProofKernel:", kernelAddr);

  // 11. Register modules in Kernel
  const EPISODE_MODULE = ethers.keccak256(ethers.toUtf8Bytes("EPISODE_MODULE"));
  const ORDER_MODULE = ethers.keccak256(ethers.toUtf8Bytes("ORDER_MODULE"));
  const DOCUMENT_MODULE = ethers.keccak256(ethers.toUtf8Bytes("DOCUMENT_MODULE"));
  const PERMISSION_MODULE = ethers.keccak256(ethers.toUtf8Bytes("PERMISSION_MODULE"));

  await healthProofKernel.registerModule(EPISODE_MODULE, episodeRegistryAddr);
  await healthProofKernel.registerModule(ORDER_MODULE, orderRegistryAddr);
  await healthProofKernel.registerModule(DOCUMENT_MODULE, docRegistryAddr);
  await healthProofKernel.registerModule(PERMISSION_MODULE, permissionManagerAddr);

  // 12. HealthProofGateway
  const HealthProofGateway = await ethers.getContractFactory("HealthProofGateway");
  const healthProofGateway = await HealthProofGateway.deploy(kernelAddr);
  await healthProofGateway.waitForDeployment();
  const gatewayAddr = await healthProofGateway.getAddress();
  console.log("HealthProofGateway:", gatewayAddr);

  // 13. Verify deployer
  await identityRegistry.registerEntity(
    deployer.address,
    1, // DOCTOR
    "",
    ethers.ZeroAddress
  );
  await identityRegistry.verifyEntity(deployer.address);

  console.log("\n--- Deployment Summary ---");
  console.log("IdentityRegistry:", identityRegistryAddr);
  console.log("GuardianRegistry:", guardianRegistryAddr);
  console.log("PermissionManager:", permissionManagerAddr);
  console.log("AuditTrail:", auditTrailAddr);
  console.log("MedicalDocumentRegistry:", docRegistryAddr);
  console.log("ClinicalEpisodeRegistry:", episodeRegistryAddr);
  console.log("MedicalOrderRegistry:", orderRegistryAddr);
  console.log("HealthcareNetworkRegistry:", networkRegistryAddr);
  console.log("HealthProofProtocol:", protocolAddr);
  console.log("HealthProofKernel:", kernelAddr);
  console.log("HealthProofGateway:", gatewayAddr);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
