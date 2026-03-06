// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IdentityRegistry {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    enum Role {
        PATIENT,
        DOCTOR,
        LAB,
        INSTITUTION,
        CERTIFIER,
        ADMIN
    }

    struct Entity {
        address wallet;
        Role role;
        string specialty;
        address institution;
        bool verified;
    }

    mapping(address => Entity) public entities;

    event EntityRegistered(address wallet, Role role);
    event EntityVerified(address wallet);

    function registerEntity(
        address wallet,
        Role role,
        string calldata specialty,
        address institution
    ) external onlyAdmin {

        entities[wallet] = Entity({
            wallet: wallet,
            role: role,
            specialty: specialty,
            institution: institution,
            verified: false
        });

        emit EntityRegistered(wallet, role);
    }

    function verifyEntity(address wallet)
        external
        onlyAdmin
    {
        entities[wallet].verified = true;
        emit EntityVerified(wallet);
    }

    function isVerified(address wallet)
        external
        view
        returns (bool)
    {
        return entities[wallet].verified;
    }

    function getRole(address wallet)
        external
        view
        returns (Role)
    {
        return entities[wallet].role;
    }
}