// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IdentityRegistry.sol";

contract GuardianRegistry {

    IdentityRegistry public identityRegistry;

    constructor(address identityAddress) {
        identityRegistry = IdentityRegistry(identityAddress);
    }

    enum GuardianshipType {
        PARENTAL,
        LEGAL_TUTOR,
        COURT_APPOINTED,
        VOLUNTARY_DELEGATION
    }

    struct Guardianship {
        address guardian;
        address certifier;
        GuardianshipType gType;
        bytes32 legalDocHash;
        uint256 validUntil;
        bool active;
    }

    mapping(address => Guardianship[]) public guardians;

    event GuardianshipGranted(
        address patient,
        address guardian,
        address certifier
    );

    /// Registrar tutela validada por certificador
    function grantGuardianship(
        address patient,
        address guardian,
        GuardianshipType gType,
        bytes32 legalDocHash,
        uint256 validUntil
    ) external {

        /// validar que quien ejecuta es certificador
        require(
            identityRegistry.getRole(msg.sender)
                == IdentityRegistry.Role.CERTIFIER,
            "No autorizado"
        );

        guardians[patient].push(
            Guardianship({
                guardian: guardian,
                certifier: msg.sender,
                gType: gType,
                legalDocHash: legalDocHash,
                validUntil: validUntil,
                active: true
            })
        );

        emit GuardianshipGranted(patient, guardian, msg.sender);
    }

    function isGuardian(address patient, address guardian)
        public
        view
        returns (bool)
    {
        Guardianship[] memory list = guardians[patient];

        for (uint i = 0; i < list.length; i++) {

            if(
                list[i].guardian == guardian &&
                list[i].active &&
                (list[i].validUntil == 0 ||
                 block.timestamp <= list[i].validUntil)
            ){
                return true;
            }
        }

        return false;
    }
}
