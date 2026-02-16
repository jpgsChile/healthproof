// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title IssuerRegistry
 * @dev Registro de emisores autorizados (hospitales, clínicas, laboratorios)
 */
contract IssuerRegistry is AccessControl {
    bytes32 public constant ISSUER_ADMIN_ROLE = keccak256("ISSUER_ADMIN_ROLE");

    struct Issuer {
        string did;           // DID del emisor
        string name;          // Nombre de la institución
        bool active;          // Si está activo en el sistema
        uint256 registeredAt; // Timestamp de registro
    }

    mapping(address => Issuer) public issuers;
    mapping(string => address) public didToAddress;
    address[] public issuerAddresses;

    event IssuerRegistered(address indexed issuer, string did, string name);
    event IssuerUpdated(address indexed issuer, bool active);
    event IssuerRemoved(address indexed issuer);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Registra un nuevo emisor autorizado
     */
    function registerIssuer(
        address issuerAddress,
        string calldata did,
        string calldata name
    ) external onlyRole(ISSUER_ADMIN_ROLE) {
        require(issuerAddress != address(0), "Invalid address");
        require(bytes(did).length > 0, "DID required");
        require(didToAddress[did] == address(0), "DID already registered");

        issuers[issuerAddress] = Issuer({
            did: did,
            name: name,
            active: true,
            registeredAt: block.timestamp
        });

        didToAddress[did] = issuerAddress;
        issuerAddresses.push(issuerAddress);

        emit IssuerRegistered(issuerAddress, did, name);
    }

    /**
     * @dev Actualiza el estado de un emisor
     */
    function setIssuerActive(address issuerAddress, bool active)
        external
        onlyRole(ISSUER_ADMIN_ROLE)
    {
        require(issuers[issuerAddress].registeredAt > 0, "Issuer not found");

        issuers[issuerAddress].active = active;
        emit IssuerUpdated(issuerAddress, active);
    }

    /**
     * @dev Verifica si una dirección es emisor válido y activo
     */
    function isIssuerValid(address issuerAddress) external view returns (bool) {
        return issuers[issuerAddress].active && issuers[issuerAddress].registeredAt > 0;
    }

    /**
     * @dev Obtiene información del emisor
     */
    function getIssuer(address issuerAddress)
        external
        view
        returns (string memory did, string memory name, bool active, uint256 registeredAt)
    {
        Issuer memory issuer = issuers[issuerAddress];
        return (issuer.did, issuer.name, issuer.active, issuer.registeredAt);
    }

    /**
     * @dev Obtiene emisor por DID
     */
    function getIssuerByDid(string calldata did) external view returns (address) {
        return didToAddress[did];
    }

    /**
     * @dev Cantidad total de emisores registrados
     */
    function getIssuerCount() external view returns (uint256) {
        return issuerAddresses.length;
    }
}
