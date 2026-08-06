import fs from "fs";
import path from "path";

export interface DeploymentAddresses {
  deployer: string;
  relayer?: string;
  l1Owner?: string;
  trustedForwarder?: string;
  identityRegistry?: string;
  identityRegistryImpl?: string;
  guardianRegistry?: string;
  guardianRegistryImpl?: string;
  permissionManager?: string;
  permissionManagerImpl?: string;
  clinicalEpisodeRegistry?: string;
  clinicalEpisodeRegistryImpl?: string;
  medicalOrderRegistry?: string;
  medicalOrderRegistryImpl?: string;
  medicalDocumentRegistry?: string;
  medicalDocumentRegistryImpl?: string;
  healthcareNetworkRegistry?: string;
  auditTrail?: string;
  healthProofKernel?: string;
  healthProofGateway?: string;
  healthProofProtocol?: string;
}

export interface DeploymentPayload {
  network: string;
  chainName: string;
  evmChainId: number;
  tokenSymbol: string;
  subnetId: string;
  blockchainId: string;
  validatorManagerAddress: string;
  rpcUrl: string;
  nodeId: string;
  deployedAt: string;
  genesisSha256?: string;
  validators: number;
  addresses: DeploymentAddresses;
}

export type DeploymentMetadata = Omit<DeploymentPayload, "addresses" | "deployedAt">;

/**
 * Serializa el resultado de un deploy a network/deployments/<chainId>.json.
 * Ese archivo es la fuente de verdad para el frontend/backend.
 */
export function writeDeployment(
  metadata: DeploymentMetadata,
  addresses: DeploymentAddresses,
): DeploymentPayload {
  const repoRoot = path.resolve(__dirname, "../../.."); // contracts/scripts/lib -> infra/avalanche/contracts -> infra/avalanche
  const networkDir = path.join(repoRoot, "network");
  const deploymentsDir = path.join(networkDir, "deployments");

  fs.mkdirSync(deploymentsDir, { recursive: true });

  const payload: DeploymentPayload = {
    ...metadata,
    deployedAt: new Date().toISOString(),
    addresses,
  };

  const artifactPath = path.join(deploymentsDir, `${metadata.evmChainId}.json`);
  const summaryPath = path.join(networkDir, "deployment.json");

  // Fichero canónico por chainId
  fs.writeFileSync(artifactPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Deployment artifact written: ${artifactPath}`);

  // Resumen en deployment.json (pointer a la fuente de verdad)
  const summary = {
    _comment: `Fuente de verdad: network/deployments/${metadata.evmChainId}.json`,
    chainId: metadata.evmChainId,
    artifact: `network/deployments/${metadata.evmChainId}.json`,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  console.log(`Deployment summary written: ${summaryPath}`);

  return payload;
}
