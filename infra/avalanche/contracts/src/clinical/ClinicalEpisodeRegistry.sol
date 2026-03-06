// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../identity/IdentityRegistry.sol";

/// @title ClinicalEpisodeRegistry
/// @notice Gestiona episodios clínicos de pacientes.

contract ClinicalEpisodeRegistry {

    IdentityRegistry public identityRegistry;

    constructor(address identityAddress) {
        identityRegistry = IdentityRegistry(identityAddress);
    }

    struct ClinicalEpisode {
        address patient;
        address openedBy;
        address institution;
        bytes32 episodeType;
        bytes32 classification;
        uint64 openedAt;
        bool active;
    }

    mapping(bytes32 => ClinicalEpisode) public episodes;

    event ClinicalEpisodeOpened(
        bytes32 indexed episodeId,
        address indexed patient,
        address indexed doctor,
        address institution,
        bytes32 episodeType,
        uint64 timestamp
    );

    event ClinicalEpisodeClosed(
        bytes32 indexed episodeId,
        address indexed patient,
        uint64 timestamp
    );

    modifier onlyVerified() {
        require(
            identityRegistry.isVerified(msg.sender),
            "Entidad no verificada"
        );
        _;
    }

    modifier onlyDoctor() {
        require(
            identityRegistry.getRole(msg.sender)
                == IdentityRegistry.Role.DOCTOR,
            "Solo doctor"
        );
        _;
    }

    function openEpisode(
        bytes32 episodeId,
        address patient,
        address institution,
        bytes32 episodeType,
        bytes32 classification
    )
        external
        onlyVerified
        onlyDoctor
    {

        require(
            episodes[episodeId].openedAt == 0,
            "Episodio ya existe"
        );

        episodes[episodeId] = ClinicalEpisode({
            patient: patient,
            openedBy: msg.sender,
            institution: institution,
            episodeType: episodeType,
            classification: classification,
            openedAt: uint64(block.timestamp),
            active: true
        });

        emit ClinicalEpisodeOpened(
            episodeId,
            patient,
            msg.sender,
            institution,
            episodeType,
            uint64(block.timestamp)
        );
    }

    function closeEpisode(bytes32 episodeId)
        external
        onlyVerified
    {

        ClinicalEpisode storage ep = episodes[episodeId];
        require(ep.active, "Episodio cerrado");
        require(
            msg.sender == ep.openedBy,
            "Solo doctor creador"
        );

        ep.active = false;

        emit ClinicalEpisodeClosed(
            episodeId,
            ep.patient,
            uint64(block.timestamp)
        );
    }

    function getEpisode(bytes32 episodeId)
        external
        view
        returns (ClinicalEpisode memory)
    {
        return episodes[episodeId];
    }
}