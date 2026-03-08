/**
 * Tests para HealthProofKernel
 */
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployHealthProofFixture } from "./fixtures";

describe("HealthProofKernel", function () {
  describe("Deployment", function () {
    it("Debe asignar admin, governance y guardian", async function () {
      const { healthProofKernel, deployer } = await loadFixture(deployHealthProofFixture);

      expect(await healthProofKernel.admin()).to.equal(deployer.address);
      expect(await healthProofKernel.governance()).to.equal(deployer.address);
      expect(await healthProofKernel.guardian()).to.equal(deployer.address);
      expect(await healthProofKernel.protocolPaused()).to.equal(false);
    });
  });

  describe("registerModule", function () {
    it("Solo admin puede registrar módulos", async function () {
      const { healthProofKernel, doctor } = await loadFixture(deployHealthProofFixture);
      const EPISODE_MODULE = ethers.keccak256(ethers.toUtf8Bytes("EPISODE_MODULE"));

      await expect(
        healthProofKernel.connect(doctor).registerModule(EPISODE_MODULE, doctor.address)
      ).to.be.revertedWith("Not admin");
    });

    it("Admin puede registrar módulo", async function () {
      const { healthProofKernel, deployer, clinicalEpisodeRegistry } = await loadFixture(
        deployHealthProofFixture
      );
      const EPISODE_MODULE = ethers.keccak256(ethers.toUtf8Bytes("EPISODE_MODULE"));

      const moduleAddr = await clinicalEpisodeRegistry.getAddress();
      expect(await healthProofKernel.getModule(EPISODE_MODULE)).to.equal(moduleAddr);
    });

    it("Rechaza address cero", async function () {
      const { healthProofKernel } = await loadFixture(deployHealthProofFixture);
      const CUSTOM_MODULE = ethers.keccak256(ethers.toUtf8Bytes("CUSTOM_MODULE"));

      await expect(
        healthProofKernel.registerModule(CUSTOM_MODULE, ethers.ZeroAddress)
      ).to.be.reverted;
    });
  });

  describe("pauseProtocol", function () {
    it("Solo guardian puede pausar", async function () {
      const { healthProofKernel, doctor } = await loadFixture(deployHealthProofFixture);

      await expect(healthProofKernel.connect(doctor).pauseProtocol()).to.be.reverted;
    });

    it("Guardian puede pausar el protocolo", async function () {
      const { healthProofKernel, deployer } = await loadFixture(deployHealthProofFixture);

      await healthProofKernel.pauseProtocol();
      expect(await healthProofKernel.protocolPaused()).to.equal(true);
    });

    it("Emite ProtocolPaused", async function () {
      const { healthProofKernel, deployer } = await loadFixture(deployHealthProofFixture);

      await expect(healthProofKernel.pauseProtocol())
        .to.emit(healthProofKernel, "ProtocolPaused")
        .withArgs(deployer.address);
    });
  });

  describe("resumeProtocol", function () {
    it("Solo governance puede reanudar", async function () {
      const { healthProofKernel, doctor } = await loadFixture(deployHealthProofFixture);

      await healthProofKernel.pauseProtocol();

      await expect(healthProofKernel.connect(doctor).resumeProtocol()).to.be.revertedWith(
        "Not governance"
      );
    });

    it("Governance puede reanudar el protocolo", async function () {
      const { healthProofKernel } = await loadFixture(deployHealthProofFixture);

      await healthProofKernel.pauseProtocol();
      expect(await healthProofKernel.protocolPaused()).to.equal(true);

      await healthProofKernel.resumeProtocol();
      expect(await healthProofKernel.protocolPaused()).to.equal(false);
    });
  });

  describe("upgradeModule", function () {
    it("Solo governance puede actualizar módulo", async function () {
      const { healthProofKernel, doctor, clinicalEpisodeRegistry } = await loadFixture(
        deployHealthProofFixture
      );
      const EPISODE_MODULE = ethers.keccak256(ethers.toUtf8Bytes("EPISODE_MODULE"));
      const newAddr = await clinicalEpisodeRegistry.getAddress();

      await expect(
        healthProofKernel.connect(doctor).upgradeModule(EPISODE_MODULE, newAddr)
      ).to.be.revertedWith("Not governance");
    });
  });
});
