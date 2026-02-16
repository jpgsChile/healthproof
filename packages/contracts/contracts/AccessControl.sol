// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol" as OZ;

/**
 * @title AccessControl
 * @dev Extiende OpenZeppelin AccessControl con roles específicos del sistema
 * @notice Roles: DEFAULT_ADMIN, ISSUER_ADMIN, ISSUER, VERIFIER
 */
contract AccessControl is OZ.AccessControl {
    bytes32 public constant ISSUER_ADMIN_ROLE = keccak256("ISSUER_ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(ISSUER_ROLE, ISSUER_ADMIN_ROLE);
    }

    /**
     * @dev Verifica si una dirección tiene rol de emisor
     */
    function isIssuer(address account) external view returns (bool) {
        return hasRole(ISSUER_ROLE, account);
    }

    /**
     * @dev Verifica si una dirección tiene rol de verificador
     */
    function isVerifier(address account) external view returns (bool) {
        return hasRole(VERIFIER_ROLE, account);
    }
}
