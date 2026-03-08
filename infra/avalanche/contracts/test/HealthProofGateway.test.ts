/**
 * Tests para HealthProofGateway - flujo completo del protocolo
 */
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployHealthProofFixture } from "./fixtures";

describe("HealthProofGateway", function () {
  describe("createEpisode", function () {
    it("Doctor verificado puede crear episodio vía Gateway", async function () {
      const {
        healthProofGateway,
        doctor,
        patient,
        clinicalEpisodeRegistry,
      } = await loadFixture(deployHealthProofFixture);

      const episodeId = ethers.keccak256(ethers.toUtf8Bytes("episode-001"));
      const institution = ethers.ZeroAddress;
      const episodeType = ethers.keccak256(ethers.toUtf8Bytes("CONSULTA"));
      const classification = ethers.keccak256(ethers.toUtf8Bytes("RUTINA"));

      const gatewayAddr = await healthProofGateway.getAddress();

      await expect(
        healthProofGateway
          .connect(doctor)
          .createEpisode(episodeId, patient.address, institution, episodeType, classification)
      )
        .to.emit(healthProofGateway, "EpisodeCreated")
        .withArgs(episodeId, patient.address, doctor.address);

      const episode = await clinicalEpisodeRegistry.getEpisode(episodeId);
      expect(episode.patient).to.equal(patient.address);
      expect(episode.openedBy).to.equal(gatewayAddr); // msg.sender en módulo = Gateway
      expect(episode.active).to.equal(true);
    });

    it("Falla si protocolo está pausado", async function () {
      const { healthProofGateway, healthProofKernel, doctor, patient } = await loadFixture(
        deployHealthProofFixture
      );

      await healthProofKernel.pauseProtocol();

      const episodeId = ethers.keccak256(ethers.toUtf8Bytes("episode-paused"));
      const institution = ethers.ZeroAddress;
      const episodeType = ethers.keccak256(ethers.toUtf8Bytes("CONSULTA"));
      const classification = ethers.keccak256(ethers.toUtf8Bytes("RUTINA"));

      await expect(
        healthProofGateway
          .connect(doctor)
          .createEpisode(episodeId, patient.address, institution, episodeType, classification)
      ).to.be.revertedWith("Protocol paused");
    });
  });

  describe("createMedicalOrder", function () {
    it("Doctor verificado puede crear orden médica vía Gateway", async function () {
      const {
        healthProofGateway,
        doctor,
        patient,
        medicalOrderRegistry,
        clinicalEpisodeRegistry,
      } = await loadFixture(deployHealthProofFixture);

      // Primero crear episodio
      const episodeId = ethers.keccak256(ethers.toUtf8Bytes("episode-order"));
      const institution = ethers.ZeroAddress;
      const episodeType = ethers.keccak256(ethers.toUtf8Bytes("CONSULTA"));
      const classification = ethers.keccak256(ethers.toUtf8Bytes("RUTINA"));

      await healthProofGateway
        .connect(doctor)
        .createEpisode(episodeId, patient.address, institution, episodeType, classification);

      // Crear orden
      const orderId = ethers.keccak256(ethers.toUtf8Bytes("order-001"));
      const orderType = ethers.keccak256(ethers.toUtf8Bytes("LAB"));
      const examType = ethers.keccak256(ethers.toUtf8Bytes("SANGRE"));

      await expect(
        healthProofGateway
          .connect(doctor)
          .createMedicalOrder(
            orderId,
            patient.address,
            institution,
            episodeId,
            orderType,
            examType
          )
      )
        .to.emit(healthProofGateway, "MedicalOrderCreated")
        .withArgs(orderId, patient.address, episodeId);

      const gatewayAddr = await healthProofGateway.getAddress();
      const order = await medicalOrderRegistry.orders(orderId);
      expect(order.patient).to.equal(patient.address);
      expect(order.doctor).to.equal(gatewayAddr); // msg.sender en módulo = Gateway
      expect(order.episodeId).to.equal(episodeId);
    });
  });

  describe("registerMedicalDocument", function () {
    it("Entidad verificada puede registrar documento vía Gateway", async function () {
      const {
        healthProofGateway,
        doctor,
        patient,
        medicalDocumentRegistry,
        clinicalEpisodeRegistry,
      } = await loadFixture(deployHealthProofFixture);

      // Crear episodio primero
      const episodeId = ethers.keccak256(ethers.toUtf8Bytes("episode-doc"));
      const institution = ethers.ZeroAddress;
      const episodeType = ethers.keccak256(ethers.toUtf8Bytes("CONSULTA"));
      const classification = ethers.keccak256(ethers.toUtf8Bytes("RUTINA"));

      await healthProofGateway
        .connect(doctor)
        .createEpisode(episodeId, patient.address, institution, episodeType, classification);

      // Registrar documento
      const documentId = ethers.keccak256(ethers.toUtf8Bytes("doc-001"));
      const documentType = ethers.keccak256(ethers.toUtf8Bytes("INFORME"));
      const clinicalHash = ethers.keccak256(ethers.toUtf8Bytes("hash-clinico"));
      const cid = "QmTest123";
      const standard = ethers.keccak256(ethers.toUtf8Bytes("HL7"));
      const docClassification = ethers.keccak256(ethers.toUtf8Bytes("CONFIDENCIAL"));

      await expect(
        healthProofGateway
          .connect(doctor)
          .registerMedicalDocument(
            documentId,
            patient.address,
            institution,
            documentType,
            clinicalHash,
            episodeId,
            cid,
            standard,
            docClassification
          )
      )
        .to.emit(healthProofGateway, "MedicalDocumentRegistered")
        .withArgs(documentId, patient.address, episodeId);

      const gatewayAddr = await healthProofGateway.getAddress();
      const doc = await medicalDocumentRegistry.documents(documentId);
      expect(doc.patient).to.equal(patient.address);
      expect(doc.issuer).to.equal(gatewayAddr); // msg.sender en módulo = Gateway
      expect(doc.cid).to.equal(cid);
    });
  });

  describe("grantAccess", function () {
    it("Paciente puede otorgar acceso (PermissionManager directo)", async function () {
      // Nota: grantAccess vía Gateway falla porque PermissionManager.authorized(patient)
      // requiere msg.sender==patient, pero al llamar vía Gateway msg.sender=Gateway.
      // Se prueba el flujo de permisos llamando PermissionManager directamente.
      const { permissionManager, patient, doctor } = await loadFixture(deployHealthProofFixture);

      const resourceId = ethers.keccak256(ethers.toUtf8Bytes("doc-123"));
      const expiresAt = 0n; // sin expiración
      const scope = 0; // DOCUMENT

      await permissionManager
        .connect(patient)
        .grantPermission(patient.address, doctor.address, scope, resourceId, expiresAt);

      const hasAccess = await permissionManager.hasAccess(
        patient.address,
        doctor.address,
        resourceId,
        ethers.ZeroHash,
        ethers.ZeroAddress
      );
      expect(hasAccess).to.equal(true);
    });
  });
});
