/**
 * Fixture de deployment para tests del protocolo HealthProof.
 * Despliega todos los contratos y configura el Kernel.
 */
import { ethers } from "hardhat";

export interface HealthProofFixture {
  identityRegistry: Awaited<ReturnType<typeof ethers.getContractAt>>;
  guardianRegistry: Awaited<ReturnType<typeof ethers.getContractAt>>;
  permissionManager: Awaited<ReturnType<typeof ethers.getContractAt>>;
  clinicalEpisodeRegistry: Awaited<ReturnType<typeof ethers.getContractAt>>;
  medicalOrderRegistry: Awaited<ReturnType<typeof ethers.getContractAt>>;
  medicalDocumentRegistry: Awaited<ReturnType<typeof ethers.getContractAt>>;
  healthcareNetworkRegistry: Awaited<ReturnType<typeof ethers.getContractAt>>;
  auditTrail: Awaited<ReturnType<typeof ethers.getContractAt>>;
  healthProofKernel: Awaited<ReturnType<typeof ethers.getContractAt>>;
  healthProofGateway: Awaited<ReturnType<typeof ethers.getContractAt>>;
  healthProofProtocol: Awaited<ReturnType<typeof ethers.getContractAt>>;
  deployer: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  doctor: Awaited<ReturnType<typeof ethers.getSigners>>[1];
  patient: Awaited<ReturnType<typeof ethers.getSigners>>[2];
  certifier: Awaited<ReturnType<typeof ethers.getSigners>>[3];
  EPISODE_MODULE: string;
  ORDER_MODULE: string;
  DOCUMENT_MODULE: string;
  PERMISSION_MODULE: string;
}

export async function deployHealthProofFixture(): Promise<HealthProofFixture> {
  const [deployer, doctor, patient, certifier] = await ethers.getSigners();

  // 1. IdentityRegistry
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityAddr = await identityRegistry.getAddress();

  // 2. GuardianRegistry
  const GuardianRegistry = await ethers.getContractFactory("GuardianRegistry");
  const guardianRegistry = await GuardianRegistry.deploy(identityAddr);
  await guardianRegistry.waitForDeployment();
  const guardianAddr = await guardianRegistry.getAddress();

  // 3. PermissionManager
  const PermissionManager = await ethers.getContractFactory("PermissionManager");
  const permissionManager = await PermissionManager.deploy(identityAddr, guardianAddr);
  await permissionManager.waitForDeployment();
  const permissionAddr = await permissionManager.getAddress();

  // 4. Clinical registries
  const ClinicalEpisodeRegistry = await ethers.getContractFactory("ClinicalEpisodeRegistry");
  const clinicalEpisodeRegistry = await ClinicalEpisodeRegistry.deploy(identityAddr);
  await clinicalEpisodeRegistry.waitForDeployment();
  const episodeAddr = await clinicalEpisodeRegistry.getAddress();

  const MedicalOrderRegistry = await ethers.getContractFactory("MedicalOrderRegistry");
  const medicalOrderRegistry = await MedicalOrderRegistry.deploy(identityAddr);
  await medicalOrderRegistry.waitForDeployment();
  const orderAddr = await medicalOrderRegistry.getAddress();

  const MedicalDocumentRegistry = await ethers.getContractFactory("MedicalDocumentRegistry");
  const medicalDocumentRegistry = await MedicalDocumentRegistry.deploy(identityAddr);
  await medicalDocumentRegistry.waitForDeployment();
  const docAddr = await medicalDocumentRegistry.getAddress();

  // 5. HealthcareNetworkRegistry
  const HealthcareNetworkRegistry = await ethers.getContractFactory("HealthcareNetworkRegistry");
  const healthcareNetworkRegistry = await HealthcareNetworkRegistry.deploy();
  await healthcareNetworkRegistry.waitForDeployment();

  // 6. AuditTrail
  const AuditTrail = await ethers.getContractFactory("AuditTrail");
  const auditTrail = await AuditTrail.deploy();
  await auditTrail.waitForDeployment();
  const auditAddr = await auditTrail.getAddress();

  // 7. HealthProofKernel
  const HealthProofKernel = await ethers.getContractFactory("HealthProofKernel");
  const healthProofKernel = await HealthProofKernel.deploy(
    deployer.address,
    deployer.address,
    deployer.address
  );
  await healthProofKernel.waitForDeployment();
  const kernelAddr = await healthProofKernel.getAddress();

  // 8. HealthProofGateway
  const HealthProofGateway = await ethers.getContractFactory("HealthProofGateway");
  const healthProofGateway = await HealthProofGateway.deploy(kernelAddr);
  await healthProofGateway.waitForDeployment();

  // 9. HealthProofProtocol
  const HealthProofProtocol = await ethers.getContractFactory("HealthProofProtocol");
  const healthProofProtocol = await HealthProofProtocol.deploy(
    permissionAddr,
    docAddr,
    auditAddr
  );
  await healthProofProtocol.waitForDeployment();

  // 10. Registrar módulos en Kernel
  const EPISODE_MODULE = ethers.keccak256(ethers.toUtf8Bytes("EPISODE_MODULE"));
  const ORDER_MODULE = ethers.keccak256(ethers.toUtf8Bytes("ORDER_MODULE"));
  const DOCUMENT_MODULE = ethers.keccak256(ethers.toUtf8Bytes("DOCUMENT_MODULE"));
  const PERMISSION_MODULE = ethers.keccak256(ethers.toUtf8Bytes("PERMISSION_MODULE"));

  await healthProofKernel.registerModule(EPISODE_MODULE, episodeAddr);
  await healthProofKernel.registerModule(ORDER_MODULE, orderAddr);
  await healthProofKernel.registerModule(DOCUMENT_MODULE, docAddr);
  await healthProofKernel.registerModule(PERMISSION_MODULE, permissionAddr);

  // 11. Registrar y verificar entidades (deployer=admin, doctor, patient, certifier)
  await identityRegistry.registerEntity(deployer.address, 5, "", ethers.ZeroAddress); // ADMIN
  await identityRegistry.verifyEntity(deployer.address);

  await identityRegistry.registerEntity(doctor.address, 1, "Cardiología", ethers.ZeroAddress); // DOCTOR
  await identityRegistry.verifyEntity(doctor.address);

  await identityRegistry.registerEntity(patient.address, 0, "", ethers.ZeroAddress); // PATIENT
  await identityRegistry.verifyEntity(patient.address);

  await identityRegistry.registerEntity(certifier.address, 4, "", ethers.ZeroAddress); // CERTIFIER
  await identityRegistry.verifyEntity(certifier.address);

  // 12. Registrar Gateway como entidad verificada y DOCTOR (módulos reciben msg.sender=Gateway)
  const gatewayAddr = await healthProofGateway.getAddress();
  await identityRegistry.registerEntity(gatewayAddr, 1, "", ethers.ZeroAddress); // DOCTOR
  await identityRegistry.verifyEntity(gatewayAddr);

  return {
    identityRegistry,
    guardianRegistry,
    permissionManager,
    clinicalEpisodeRegistry,
    medicalOrderRegistry,
    medicalDocumentRegistry,
    healthcareNetworkRegistry,
    auditTrail,
    healthProofKernel,
    healthProofGateway,
    healthProofProtocol,
    deployer,
    doctor,
    patient,
    certifier,
    EPISODE_MODULE,
    ORDER_MODULE,
    DOCUMENT_MODULE,
    PERMISSION_MODULE,
  };
}
