# HealthProof — Verifiable Health Data Infrastructure on Avalanche

HealthProof is a **Web3 medical verification infrastructure** that enables patients, laboratories, and healthcare providers to securely exchange medical documents while preserving privacy and patient sovereignty.

The protocol combines **client-side encryption, off-chain storage, and blockchain verification** to ensure that medical records remain private while being cryptographically verifiable.

The MVP currently runs on **Avalanche C-Chain**, with the long-term vision of evolving into a **dedicated Avalanche Layer 1 optimized for healthcare verification infrastructure**.


# Vision

Healthcare systems today suffer from critical structural problems:

- Fragmented medical records
- Lack of interoperability between institutions
- Limited patient control over medical data

HealthProof introduces a new paradigm:

**Patients become the sovereign controllers of their medical records while healthcare providers can verify medical documents without relying on centralized intermediaries.**


# Key Features

- Patient-controlled medical records
- Cryptographic verification of medical documents
- On-chain permission management
- Encrypted medical document storage
- Verifiable medical orders
- Immutable audit trail of document access


# Protocol Architecture

HealthProof follows a **multi-layer protocol architecture**, separating clinical interaction, cryptographic security, and blockchain verification.

## Architecture Layers

### Client Layer

The **HealthProof Clinical Client** provides the interface used by:

- Doctors
- Patients
- Laboratories

Users can:

- Issue medical orders
- Upload medical results
- Grant or revoke access permissions
- Verify medical documents


### Protocol Layer

This layer contains the core modules of the HealthProof system:

- Identity Module
- Permission Module
- Medical Orders Module
- Document Verification Module
- Audit Module

These modules coordinate the logic between users, storage, and blockchain verification.


### Security Layer

The security layer handles:

- Client-side encryption
- Key management
- Secure document processing

Sensitive medical data is encrypted **before leaving the user device**.


### Storage Layer

Medical documents are stored **off-chain** in encrypted form.

Only the **hash of the encrypted document** is stored on blockchain.

This guarantees:

- Privacy
- Scalability
- Tamper-proof verification


### Blockchain Layer

Smart contracts deployed on **Avalanche C-Chain** handle:

- Document verification hashes
- Permission records
- Medical order registration
- Audit logs

This layer acts as the **trust and verification engine of the system**.


# Architecture Diagram

*(Diagram to be inserted)*
<img width="1230" height="1156" alt="Diagrama de arquitectura" src="https://github.com/user-attachments/assets/2858f8a2-fc39-4fcc-a6f5-a1bc42c134cb" />



# User Flow

HealthProof replicates the real-world healthcare workflow between doctors, patients, and laboratories.

## Step 1 — Doctor Issues Medical Order

During a consultation, a doctor creates a medical order linked to the patient identity.

The order metadata is recorded on blockchain.


## Step 2 — Patient Receives Order

The patient receives the medical order in their HealthProof dashboard.

The patient controls who can access this order.


## Step 3 — Patient Grants Laboratory Access

The patient authorizes a laboratory to access the order by granting permission through a blockchain transaction.


## Step 4 — Laboratory Performs Examination

The laboratory performs the exam and generates a digital medical report.


## Step 5 — Laboratory Uploads Results

Before leaving the browser:

1. The document is encrypted locally
2. The encrypted file is uploaded to storage
3. A document hash is generated
4. The hash is anchored on blockchain


## Step 6 — Patient Receives Verified Results

The patient receives the exam results in their HealthProof vault.

The document can now be shared with other doctors or institutions.


# User Flow Diagram

<img width="2262" height="1278" alt="Diagrama de flujo de usuario" src="https://github.com/user-attachments/assets/009de3a4-6c65-4f30-aade-d1c8d80bcaff" />


# Smart Contract Overview

HealthProof smart contracts manage **verification, permissions, and auditability**.

## MedicalOrderRegistry

Registers medical orders issued by physicians.

Stores:

- Order ID
- Physician identity
- Patient address
- Timestamp
- Verification hash


## PermissionRegistry

Manages patient-controlled permissions.

Allows patients to:

- Grant document access
- Revoke permissions
- Define scope of access


## DocumentRegistry

Stores hashes of uploaded medical documents.

Provides:

- Tamper detection
- Document authenticity verification


## AuditRegistry

Maintains immutable records of:

- Order creation
- Document uploads
- Permission grants
- Document verification events


# Smart Contract Interaction Diagram

<img width="3066" height="1174" alt="Diagrama de interacción de contratos" src="https://github.com/user-attachments/assets/4bfa9ecb-f1c5-4cbb-ade8-e068b4083b4b" />


# Data Encryption Flow

HealthProof uses **client-side encryption** to ensure medical documents remain private before leaving the user's device.

## Encryption Workflow

1. A medical document is generated by a laboratory or doctor.
2. The document is encrypted locally in the browser.
3. The encrypted file is uploaded to storage.
4. A cryptographic hash of the encrypted file is generated.
5. The hash is stored on blockchain.
6. Any authorized party can verify the document against the blockchain hash.


# Encryption Flow Diagram

<img width="3046" height="327" alt="Diagrama de encriptación de datos" src="https://github.com/user-attachments/assets/c769c6ef-5908-4997-950b-27c5342b02ac" />


# Technology Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript
- TailwindCSS
- GSAP
- Zustand
- React Query


## Web3

- Wagmi
- Ethers
- Avalanche C-Chain


## Infrastructure

- Client-side encryption
- Secure off-chain storage
- Smart contracts for verification and permissions


# Repository Structure
src/

app/
Routing and layout structure

components/
Reusable UI components

features/
Domain modules
(auth, documents, identity, permissions)

services/
Blockchain interaction
Encryption
Storage

state/
Global state management using Zustand

types/
Domain models and API types

lib/
Utilities and environment configuration


# Security Model

HealthProof follows a **privacy-first architecture**.

Medical data is never stored directly on blockchain.

Instead:

1. Documents are encrypted locally
2. Encrypted files are stored off-chain
3. Document hashes are recorded on blockchain

This guarantees:

- Privacy
- Integrity
- Patient-controlled access


# Quick Start (Run Locally)

## Requirements

- Node.js 18+
- npm or pnpm
- MetaMask or compatible wallet
- Avalanche RPC endpoint


## Testnet Deployment

**Network:** Avalanche Fuji C-Chain — `chainId 43113`

| Contract | Address |
|----------|---------|
| IdentityRegistry | [`0x9f196FC83abcBB47391f9D4aF9998E7a5c458D71`](https://testnet.snowtrace.io/address/0x9f196FC83abcBB47391f9D4aF9998E7a5c458D71) |
| GuardianRegistry | [`0xBFe33f7014E3619f39359E14dDcdF25D386D408C`](https://testnet.snowtrace.io/address/0xBFe33f7014E3619f39359E14dDcdF25D386D408C) |
| PermissionManager | [`0x322890CE0C0971e879003dD3A77f686e90f2E61F`](https://testnet.snowtrace.io/address/0x322890CE0C0971e879003dD3A77f686e90f2E61F) |
| ClinicalEpisodeRegistry | [`0xD33a12d276e5a588dc87e8ab7D57F56c6aaA954f`](https://testnet.snowtrace.io/address/0xD33a12d276e5a588dc87e8ab7D57F56c6aaA954f) |
| MedicalOrderRegistry | [`0xAa1381cECAA42ae0313ed1E987fA66007bD3bA26`](https://testnet.snowtrace.io/address/0xAa1381cECAA42ae0313ed1E987fA66007bD3bA26) |
| MedicalDocumentRegistry | [`0x7f1D7C04C2e4f3DaD7BB8c10c852B6d51Ad8c251`](https://testnet.snowtrace.io/address/0x7f1D7C04C2e4f3DaD7BB8c10c852B6d51Ad8c251) |
| HealthcareNetworkRegistry | [`0xC409f54D8FbEA73772d454995882442736fA0D91`](https://testnet.snowtrace.io/address/0xC409f54D8FbEA73772d454995882442736fA0D91) |
| AuditTrail | [`0xFA62c68B31532c72B29a76e17D1e44C4CCe2C709`](https://testnet.snowtrace.io/address/0xFA62c68B31532c72B29a76e17D1e44C4CCe2C709) |
| HealthProofKernel | [`0xAEFcc18cB8C66c60d488658944B55F1C42a41C72`](https://testnet.snowtrace.io/address/0xAEFcc18cB8C66c60d488658944B55F1C42a41C72) |
| HealthProofGateway | [`0xdA58547915d85F053A5f2A086135036cAF5B0a5D`](https://testnet.snowtrace.io/address/0xdA58547915d85F053A5f2A086135036cAF5B0a5D) |
| HealthProofProtocol | [`0xde323389d5Be45a947E354b840b1015d642E2BF2`](https://testnet.snowtrace.io/address/0xde323389d5Be45a947E354b840b1015d642E2BF2) |

---

## Clone Repository

```bash
git clone https://github.com/jpgsChile/healthproof
cd healthproof
