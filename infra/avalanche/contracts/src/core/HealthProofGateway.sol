// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HealthProofKernel.sol";
import "../clinical/ClinicalEpisodeRegistry.sol";
import "../clinical/MedicalOrderRegistry.sol";
import "../clinical/MedicalDocumentRegistry.sol";
import "../access/PermissionManager.sol";

contract HealthProofGateway {

    HealthProofKernel public kernel;

    constructor(address kernelAddress){
        kernel = HealthProofKernel(kernelAddress);
    }

    bytes32 constant EPISODE_MODULE =
        keccak256("EPISODE_MODULE");

    bytes32 constant ORDER_MODULE =
        keccak256("ORDER_MODULE");

    bytes32 constant DOCUMENT_MODULE =
        keccak256("DOCUMENT_MODULE");

    bytes32 constant PERMISSION_MODULE =
        keccak256("PERMISSION_MODULE");

    event EpisodeCreated(
        bytes32 indexed episodeId,
        address indexed patient,
        address indexed doctor
    );

    event MedicalOrderCreated(
        bytes32 indexed orderId,
        address indexed patient,
        bytes32 episodeId
    );

    event MedicalDocumentRegistered(
        bytes32 indexed documentId,
        address indexed patient,
        bytes32 episodeId
    );

    event AccessGranted(
        address indexed patient,
        address indexed grantee,
        bytes32 resourceId
    );

    modifier notPaused(){
        require(!kernel.protocolPaused(),"Protocol paused");
        _;
    }

    function createEpisode(

        bytes32 episodeId,
        address patient,
        address institution,
        bytes32 episodeType,
        bytes32 classification

    )
        external
        notPaused
    {

        address module = kernel.getModule(EPISODE_MODULE);

        ClinicalEpisodeRegistry(module).openEpisode(
            episodeId,
            patient,
            institution,
            episodeType,
            classification
        );

        emit EpisodeCreated(
            episodeId,
            patient,
            msg.sender
        );
    }

    function createMedicalOrder(

        bytes32 orderId,
        address patient,
        address institution,
        bytes32 episodeId,
        bytes32 orderType,
        bytes32 examType

    )
        external
        notPaused
    {

        address module = kernel.getModule(ORDER_MODULE);

        MedicalOrderRegistry(module).createOrder(
            orderId,
            patient,
            institution,
            episodeId,
            orderType,
            examType
        );

        emit MedicalOrderCreated(
            orderId,
            patient,
            episodeId
        );
    }

    function registerMedicalDocument(

        bytes32 documentId,
        address patient,
        address institution,
        bytes32 documentType,
        bytes32 clinicalHash,
        bytes32 episodeId,
        string calldata cid,
        bytes32 standard,
        bytes32 classification

    )
        external
        notPaused
    {

        address module = kernel.getModule(DOCUMENT_MODULE);

        MedicalDocumentRegistry(module).registerDocument(
            documentId,
            patient,
            institution,
            documentType,
            clinicalHash,
            episodeId,
            cid,
            standard,
            classification
        );

        emit MedicalDocumentRegistered(
            documentId,
            patient,
            episodeId
        );
    }

    function grantAccess(

        address patient,
        address grantee,
        uint8 scope,
        bytes32 resourceId,
        uint64 expiresAt

    )
        external
        notPaused
    {

        address module = kernel.getModule(PERMISSION_MODULE);

        PermissionManager(module).grantPermission(
            patient,
            grantee,
            PermissionManager.Scope(scope),
            resourceId,
            expiresAt
        );

        emit AccessGranted(
            patient,
            grantee,
            resourceId
        );
    }
}