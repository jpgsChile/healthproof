/**
 * Tests para IdentityRegistry
 */
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployHealthProofFixture } from "./fixtures";

describe("IdentityRegistry", function () {
  describe("Deployment", function () {
    it("Debe asignar admin al deployer", async function () {
      const { identityRegistry, deployer } = await loadFixture(deployHealthProofFixture);
      expect(await identityRegistry.admin()).to.equal(deployer.address);
    });
  });

  describe("registerEntity", function () {
    it("Solo admin puede registrar entidades", async function () {
      const { identityRegistry, doctor, patient } = await loadFixture(deployHealthProofFixture);
      const [, , , , other] = await ethers.getSigners();

      await expect(
        identityRegistry.connect(other).registerEntity(
          other.address,
          0, // PATIENT
          "",
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Not admin");
    });

    it("Admin puede registrar entidad con rol DOCTOR", async function () {
      const { identityRegistry, deployer } = await loadFixture(deployHealthProofFixture);
      const [, , , , other] = await ethers.getSigners();

      await identityRegistry.registerEntity(other.address, 1, "Pediatría", ethers.ZeroAddress);

      const entity = await identityRegistry.entities(other.address);
      expect(entity.wallet).to.equal(other.address);
      expect(entity.role).to.equal(1); // DOCTOR
      expect(entity.specialty).to.equal("Pediatría");
      expect(entity.verified).to.equal(false);
    });

    it("Emite EntityRegistered al registrar", async function () {
      const { identityRegistry, deployer } = await loadFixture(deployHealthProofFixture);
      const [, , , , other] = await ethers.getSigners();

      await expect(
        identityRegistry.registerEntity(other.address, 2, "Lab", ethers.ZeroAddress)
      )
        .to.emit(identityRegistry, "EntityRegistered")
        .withArgs(other.address, 2);
    });
  });

  describe("verifyEntity", function () {
    it("Solo admin puede verificar", async function () {
      const { identityRegistry, doctor, patient } = await loadFixture(deployHealthProofFixture);
      const [, , , , other] = await ethers.getSigners();

      await identityRegistry.registerEntity(other.address, 0, "", ethers.ZeroAddress);

      await expect(
        identityRegistry.connect(doctor).verifyEntity(other.address)
      ).to.be.revertedWith("Not admin");
    });

    it("Admin puede verificar entidad", async function () {
      const { identityRegistry, deployer } = await loadFixture(deployHealthProofFixture);
      const [, , , , other] = await ethers.getSigners();

      await identityRegistry.registerEntity(other.address, 0, "", ethers.ZeroAddress);
      expect(await identityRegistry.isVerified(other.address)).to.equal(false);

      await identityRegistry.verifyEntity(other.address);
      expect(await identityRegistry.isVerified(other.address)).to.equal(true);
    });

    it("Emite EntityVerified al verificar", async function () {
      const { identityRegistry } = await loadFixture(deployHealthProofFixture);
      const [, , , , other] = await ethers.getSigners();

      await identityRegistry.registerEntity(other.address, 0, "", ethers.ZeroAddress);

      await expect(identityRegistry.verifyEntity(other.address))
        .to.emit(identityRegistry, "EntityVerified")
        .withArgs(other.address);
    });
  });

  describe("getRole", function () {
    it("Retorna rol correcto de entidad registrada", async function () {
      const { identityRegistry, doctor, patient } = await loadFixture(deployHealthProofFixture);

      expect(await identityRegistry.getRole(doctor.address)).to.equal(1); // DOCTOR
      expect(await identityRegistry.getRole(patient.address)).to.equal(0); // PATIENT
    });
  });
});
