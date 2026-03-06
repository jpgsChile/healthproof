// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../identity/IdentityRegistry.sol";

contract MedicalDocumentRegistry {

    IdentityRegistry public identityRegistry;

    constructor(address identityAddress) {
        identityRegistry = IdentityRegistry(identityAddress);
    }

    struct MedicalDocument {
        address patient;
        address issuer;
        address institution;
        bytes32 documentType;
        bytes32 clinicalHash;
        bytes32 episodeId;
        string cid;
        bytes32 standard;
        bytes32 classification;
        uint64 createdAt;
    }

    mapping(bytes32 => MedicalDocument) public documents;

    event DocumentRegistered(
        bytes32 indexed documentId,
        address indexed patient,
        address issuer
    );

    function registerDocument(
        bytes32 documentId,
        address patient,
        address institution,
        bytes32 documentType,
        bytes32 clinicalHash,
        bytes32 episodeId,
        string calldata cid,
        bytes32 standard,
        bytes32 classification
    ) external {

        require(
            identityRegistry.isVerified(msg.sender),
            "Emitter not verified"
        );

        documents[documentId] = MedicalDocument({
            patient: patient,
            issuer: msg.sender,
            institution: institution,
            documentType: documentType,
            clinicalHash: clinicalHash,
            episodeId: episodeId,
            cid: cid,
            standard: standard,
            classification: classification,
            createdAt: uint64(block.timestamp)
        });

        emit DocumentRegistered(
            documentId,
            patient,
            msg.sender
        );
    }
}