// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../identity/IdentityRegistry.sol";
import "../identity/GuardianRegistry.sol";

contract PermissionManager {

    IdentityRegistry public identityRegistry;
    GuardianRegistry public guardianRegistry;

    constructor(
        address identityAddress,
        address guardianAddress
    ){
        identityRegistry = IdentityRegistry(identityAddress);
        guardianRegistry = GuardianRegistry(guardianAddress);
    }

    enum Scope {
        DOCUMENT,
        DOCUMENT_TYPE,
        INSTITUTION,
        FULL_ACCESS
    }

    struct Permission {
        address grantee;
        Scope scope;
        bytes32 resourceId;
        uint64 expiresAt;
        bool active;
    }

    mapping(address => Permission[]) private permissions;

    event PermissionGranted(
        address indexed patient,
        address indexed grantee,
        Scope scope
    );

    event PermissionRevoked(
        address indexed patient,
        address indexed grantee
    );

    modifier authorized(address patient) {

        require(

            msg.sender == patient ||
            guardianRegistry.isGuardian(patient, msg.sender),
            "No autorizado"

        );

        _;
    }

    function grantPermission(
        address patient,
        address grantee,
        Scope scope,
        bytes32 resourceId,
        uint64 expiresAt
    )
        external
        authorized(patient)
    {

        require(
            identityRegistry.isVerified(grantee),
            "Entidad no verificada"
        );

        permissions[patient].push(

            Permission({
                grantee: grantee,
                scope: scope,
                resourceId: resourceId,
                expiresAt: expiresAt,
                active: true
            })
        );

        emit PermissionGranted(patient, grantee, scope);
    }

    function revokePermission(
        address patient,
        address grantee
    )
        external
        authorized(patient)
    {

        Permission[] storage list = permissions[patient];

        for(uint i; i < list.length; ){

            if(
                list[i].grantee == grantee &&
                list[i].active
            ){
                list[i].active = false;
                emit PermissionRevoked(patient, grantee);
            }

            unchecked { ++i; }
        }
    }

    function hasAccess(
        address patient,
        address requester,
        bytes32 documentId,
        bytes32 documentType,
        address institution
    )
        external
        view
        returns(bool)
    {

        Permission[] memory list = permissions[patient];

        for(uint i; i < list.length; ){

            Permission memory p = list[i];

            if(!p.active){
                unchecked { ++i; }
                continue;
            }

            if(p.expiresAt != 0 && block.timestamp > p.expiresAt){
                unchecked { ++i; }
                continue;
            }

            if(p.grantee != requester){
                unchecked { ++i; }
                continue;
            }

            if(p.scope == Scope.FULL_ACCESS)
                return true;

            if(p.scope == Scope.DOCUMENT && p.resourceId == documentId)
                return true;

            if(p.scope == Scope.DOCUMENT_TYPE && p.resourceId == documentType)
                return true;

            if(
                p.scope == Scope.INSTITUTION &&
                p.resourceId == bytes32(uint256(uint160(institution)))
            )
                return true;

            unchecked { ++i; }
        }

        return false;
    }
}