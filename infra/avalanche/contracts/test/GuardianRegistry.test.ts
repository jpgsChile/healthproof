/**
 * Tests para GuardianRegistry
 */
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployHealthProofFixture } from "./fixtures";

describe("GuardianRegistry", function () {
  describe("grantGuardianship", function () {
    it("Solo CERTIFIER puede otorgar tutela", async function () {
      const { guardianRegistry, patient, doctor } = await loadFixture(deployHealthProofFixture);

      await expect(
        guardianRegistry.connect(doctor).grantGuardianship(
          patient.address,
          doctor.address,
          0, // PARENTAL
          ethers.zeroPadBytes("0x01", 32),
          0 // sin expiración
        )
      ).to.be.revertedWith("No autorizado");
    });

    it("CERTIFIER puede otorgar tutela", async function () {
      const { guardianRegistry, patient, certifier, doctor } = await loadFixture(
        deployHealthProofFixture
      );

      const legalDocHash = ethers.keccak256(ethers.toUtf8Bytes("doc-legal-123"));
      const validUntil = 0n; // sin expiración

      await guardianRegistry
        .connect(certifier)
        .grantGuardianship(
          patient.address,
          doctor.address,
          0, // PARENTAL
          legalDocHash,
          validUntil
        );

      expect(await guardianRegistry.isGuardian(patient.address, doctor.address)).to.equal(true);
    });

    it("Emite GuardianshipGranted al otorgar tutela", async function () {
      const { guardianRegistry, patient, certifier, doctor } = await loadFixture(
        deployHealthProofFixture
      );

      await expect(
        guardianRegistry
          .connect(certifier)
          .grantGuardianship(
            patient.address,
            doctor.address,
            1, // LEGAL_TUTOR
            ethers.zeroPadBytes("0x02", 32),
            0
          )
      )
        .to.emit(guardianRegistry, "GuardianshipGranted")
        .withArgs(patient.address, doctor.address, certifier.address);
    });
  });

  describe("isGuardian", function () {
    it("Retorna false si no hay tutela", async function () {
      const { guardianRegistry, patient, doctor } = await loadFixture(deployHealthProofFixture);

      expect(await guardianRegistry.isGuardian(patient.address, doctor.address)).to.equal(false);
    });

    it("Retorna true si tutela activa y no expirada", async function () {
      const { guardianRegistry, patient, certifier, doctor } = await loadFixture(
        deployHealthProofFixture
      );

      await guardianRegistry
        .connect(certifier)
        .grantGuardianship(
          patient.address,
          doctor.address,
          0,
          ethers.zeroPadBytes("0x01", 32),
          Math.floor(Date.now() / 1000) + 86400 * 365 // 1 año
        );

      expect(await guardianRegistry.isGuardian(patient.address, doctor.address)).to.equal(true);
    });
  });
});
