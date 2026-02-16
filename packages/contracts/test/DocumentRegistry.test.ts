import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { IssuerRegistry, DocumentRegistry } from "../typechain-types";

describe("DocumentRegistry", function () {
  async function deployFixture() {
    const [owner, issuer, other] = await ethers.getSigners();

    const IssuerRegistryFactory = await ethers.getContractFactory("IssuerRegistry");
    const issuerRegistry = await IssuerRegistryFactory.deploy();
    await issuerRegistry.waitForDeployment();

    const DocumentRegistryFactory = await ethers.getContractFactory("DocumentRegistry");
    const documentRegistry = await DocumentRegistryFactory.deploy(
      await issuerRegistry.getAddress()
    );
    await documentRegistry.waitForDeployment();

    await issuerRegistry.registerIssuer(issuer.address, "did:ethr:0x123", "Test Hospital");

    return {
      issuerRegistry: issuerRegistry as IssuerRegistry,
      documentRegistry: documentRegistry as DocumentRegistry,
      owner,
      issuer,
      other,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct IssuerRegistry", async function () {
      const { documentRegistry, issuerRegistry } = await loadFixture(deployFixture);
      expect(await documentRegistry.issuerRegistry()).to.equal(
        await issuerRegistry.getAddress()
      );
    });
  });

  describe("registerDocument", function () {
    it("Should register a document successfully", async function () {
      const { documentRegistry, issuer } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document-v1"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("metadata-ipfs"));

      const tx = await documentRegistry
        .connect(issuer)
        .registerDocument(documentHash, issuer.address, metadataHash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(documentRegistry, "DocumentRegistered")
        .withArgs(documentHash, issuer.address, metadataHash, block!.timestamp);

      const [exists, docIssuer, timestamp] = await documentRegistry.verifyDocument(documentHash);
      expect(exists).to.be.true;
      expect(docIssuer).to.equal(issuer.address);
      expect(timestamp).to.equal(block!.timestamp);
      expect(await documentRegistry.getMetadataHash(documentHash)).to.equal(metadataHash);
    });

    it("Should reject duplicate document hash", async function () {
      const { documentRegistry, issuer } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("duplicate-doc"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await documentRegistry
        .connect(issuer)
        .registerDocument(documentHash, issuer.address, metadataHash);
      await expect(
        documentRegistry
          .connect(issuer)
          .registerDocument(documentHash, issuer.address, metadataHash)
      ).to.be.revertedWithCustomError(documentRegistry, "AlreadyRegistered");
    });

    it("Should reject when caller is not issuer", async function () {
      const { documentRegistry, issuer, other } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("unauthorized-doc"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await expect(
        documentRegistry
          .connect(other)
          .registerDocument(documentHash, issuer.address, metadataHash)
      ).to.be.revertedWithCustomError(documentRegistry, "CallerNotIssuer");
    });

    it("Should reject when issuer not registered", async function () {
      const { documentRegistry, issuer, other } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("unreg-issuer-doc"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await expect(
        documentRegistry
          .connect(other)
          .registerDocument(documentHash, other.address, metadataHash)
      ).to.be.revertedWithCustomError(documentRegistry, "IssuerNotRegistered");
    });

    it("Should reject zero hash", async function () {
      const { documentRegistry, issuer } = await loadFixture(deployFixture);
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await expect(
        documentRegistry
          .connect(issuer)
          .registerDocument(ethers.ZeroHash, issuer.address, metadataHash)
      ).to.be.revertedWithCustomError(documentRegistry, "InvalidHash");
    });
  });

  describe("verifyDocument", function () {
    it("Should return (true, issuer, timestamp) for valid document", async function () {
      const { documentRegistry, issuer } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("valid-doc"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await documentRegistry
        .connect(issuer)
        .registerDocument(documentHash, issuer.address, metadataHash);

      const [exists, docIssuer, timestamp] = await documentRegistry.verifyDocument(documentHash);
      expect(exists).to.be.true;
      expect(docIssuer).to.equal(issuer.address);
      expect(timestamp).to.be.gt(0);
    });

    it("Should return (false, 0x0, 0) for non-existent document", async function () {
      const { documentRegistry } = await loadFixture(deployFixture);
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("non-existent"));

      const [exists, issuerAddr, timestamp] = await documentRegistry.verifyDocument(fakeHash);
      expect(exists).to.be.false;
      expect(issuerAddr).to.equal(ethers.ZeroAddress);
      expect(timestamp).to.equal(0);
    });

    it("Should return exists=false for revoked document", async function () {
      const { documentRegistry, issuer } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("revoked-doc"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await documentRegistry
        .connect(issuer)
        .registerDocument(documentHash, issuer.address, metadataHash);
      await documentRegistry.connect(issuer).revokeDocument(documentHash);

      const [exists] = await documentRegistry.verifyDocument(documentHash);
      expect(exists).to.be.false;
    });
  });

  describe("revokeDocument", function () {
    it("Should allow issuer to revoke own document", async function () {
      const { documentRegistry, issuer } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("revocable-doc"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await documentRegistry
        .connect(issuer)
        .registerDocument(documentHash, issuer.address, metadataHash);

      await expect(documentRegistry.connect(issuer).revokeDocument(documentHash))
        .to.emit(documentRegistry, "DocumentRevoked")
        .withArgs(documentHash, issuer.address);

      const [exists] = await documentRegistry.verifyDocument(documentHash);
      expect(exists).to.be.false;
    });

    it("Should allow owner to revoke any document", async function () {
      const { documentRegistry, issuer, owner } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("admin-revoke-doc"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await documentRegistry
        .connect(issuer)
        .registerDocument(documentHash, issuer.address, metadataHash);
      await documentRegistry.connect(owner).revokeDocument(documentHash);

      const [exists] = await documentRegistry.verifyDocument(documentHash);
      expect(exists).to.be.false;
    });

    it("Should reject revocation by unauthorized party", async function () {
      const { documentRegistry, issuer, other } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("protected-doc"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await documentRegistry
        .connect(issuer)
        .registerDocument(documentHash, issuer.address, metadataHash);

      await expect(
        documentRegistry.connect(other).revokeDocument(documentHash)
      ).to.be.revertedWithCustomError(documentRegistry, "NotAuthorizedToRevoke");
    });

    it("Should reject double revocation", async function () {
      const { documentRegistry, issuer } = await loadFixture(deployFixture);
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("double-revoke"));
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));

      await documentRegistry
        .connect(issuer)
        .registerDocument(documentHash, issuer.address, metadataHash);
      await documentRegistry.connect(issuer).revokeDocument(documentHash);

      await expect(
        documentRegistry.connect(issuer).revokeDocument(documentHash)
      ).to.be.revertedWithCustomError(documentRegistry, "AlreadyRevoked");
    });
  });
});
