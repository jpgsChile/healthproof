// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IssuerRegistry.sol";

/**
 * @title DocumentRegistry
 * @dev HealthProof - Registro de hashes de documentos en Avalanche
 * @notice Solo hashes on-chain, sin datos médicos. Solo emisores registrados pueden registrar.
 */
contract DocumentRegistry is Ownable {
    IssuerRegistry public immutable issuerRegistry;

    struct DocumentRecord {
        address issuer;
        bytes32 metadataHash;
        uint64 timestamp; // uint64 suficiente hasta año 292 mil millones
        bool revoked;
    }

    mapping(bytes32 => DocumentRecord) private _documents;

    event DocumentRegistered(
        bytes32 indexed documentHash,
        address indexed issuer,
        bytes32 indexed metadataHash,
        uint256 timestamp
    );
    event DocumentRevoked(bytes32 indexed documentHash, address indexed revokedBy);

    error InvalidHash();
    error AlreadyRegistered();
    error IssuerNotRegistered();
    error CallerNotIssuer();
    error DocumentNotFound();
    error AlreadyRevoked();
    error NotAuthorizedToRevoke();

    constructor(address _issuerRegistry) Ownable(msg.sender) {
        require(_issuerRegistry != address(0), "Invalid issuer registry");
        issuerRegistry = IssuerRegistry(_issuerRegistry);
    }

    /**
     * @dev Registra un documento. Solo emisores registrados. Sin datos médicos on-chain.
     * @param documentHash Hash del documento (ej. SHA-256)
     * @param issuer Emisor del documento (debe ser msg.sender)
     * @param metadataHash Hash de metadata (IPFS, etc.) - sin datos sensibles
     */
    function registerDocument(
        bytes32 documentHash,
        address issuer,
        bytes32 metadataHash
    ) external {
        if (documentHash == bytes32(0)) revert InvalidHash();
        if (_documents[documentHash].timestamp != 0) revert AlreadyRegistered();
        if (!issuerRegistry.isIssuerValid(issuer)) revert IssuerNotRegistered();
        if (msg.sender != issuer) revert CallerNotIssuer();

        _documents[documentHash] = DocumentRecord({
            issuer: issuer,
            metadataHash: metadataHash,
            timestamp: uint64(block.timestamp),
            revoked: false
        });

        emit DocumentRegistered(documentHash, issuer, metadataHash, block.timestamp);
    }

    /**
     * @dev Verifica un documento
     * @return exists true si existe, no revocado y emisor válido
     * @return issuer dirección del emisor
     * @return timestamp momento del registro
     */
    function verifyDocument(bytes32 documentHash)
        external
        view
        returns (bool exists, address issuer, uint256 timestamp)
    {
        DocumentRecord storage doc = _documents[documentHash];
        if (doc.timestamp == 0) return (false, address(0), 0);
        if (doc.revoked) return (false, doc.issuer, doc.timestamp);
        if (!issuerRegistry.isIssuerValid(doc.issuer)) return (false, doc.issuer, doc.timestamp);

        return (true, doc.issuer, doc.timestamp);
    }

    /**
     * @dev Revoca un documento. Solo emisor o owner.
     */
    function revokeDocument(bytes32 documentHash) external {
        DocumentRecord storage doc = _documents[documentHash];
        if (doc.timestamp == 0) revert DocumentNotFound();
        if (doc.revoked) revert AlreadyRevoked();
        if (msg.sender != doc.issuer && msg.sender != owner()) revert NotAuthorizedToRevoke();

        doc.revoked = true;
        emit DocumentRevoked(documentHash, msg.sender);
    }

    /**
     * @dev Obtiene metadata hash (para verificación off-chain)
     */
    function getMetadataHash(bytes32 documentHash) external view returns (bytes32) {
        return _documents[documentHash].metadataHash;
    }
}
