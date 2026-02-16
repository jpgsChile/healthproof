import { Wallet } from 'ethers';
import type { DidMethod } from './types';

/**
 * Crea DID did:ethr para Avalanche/EVM
 * Formato: did:ethr:<chainId>:<address> o did:ethr:<address>
 */
export function createDidEthr(address: string, chainId?: number): string {
  const addr = address.toLowerCase().replace(/^0x/, '');
  return chainId ? `did:ethr:${chainId}:0x${addr}` : `did:ethr:0x${addr}`;
}

/**
 * Crea DID desde wallet (did:ethr)
 */
export function createDidFromWallet(wallet: Wallet, chainId?: number): string {
  return createDidEthr(wallet.address, chainId);
}

/**
 * Crea DID desde private key
 */
export function createDidFromPrivateKey(
  privateKey: string,
  chainId?: number,
): string {
  const wallet = new Wallet(privateKey);
  return createDidFromWallet(wallet, chainId);
}

/**
 * Extrae address de did:ethr
 */
export function didToAddress(did: string): string {
  const match = did.match(/^did:ethr:(?::\d+)?(0x[a-fA-F0-9]{40})$/);
  if (!match) {
    throw new Error(`Invalid did:ethr format: ${did}`);
  }
  return match[1];
}

/**
 * Factory principal - crea DID por método
 */
export function createDid(
  method: DidMethod,
  identifier: string | Wallet,
  chainId?: number,
): string {
  if (method === 'ethr') {
    const address =
      typeof identifier === 'string'
        ? identifier
        : (identifier as Wallet).address;
    return createDidEthr(address, chainId);
  }
  if (method === 'key') {
    // did:key requiere encoding de clave pública - placeholder para futuro
    throw new Error('did:key not yet implemented - use did:ethr for Avalanche');
  }
  throw new Error(`Unsupported DID method: ${method}`);
}
