// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HealthcareNetworkRegistry {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    enum InstitutionType {
        HOSPITAL,
        CLINIC,
        LABORATORY,
        DIAGNOSTIC_CENTER,
        PHARMACY,
        REGULATOR
    }

    struct HealthcareNetwork {
        bytes32 networkId;
        string name;
        string countryCode;
        address authority;
        bool active;
    }

    struct Institution {
        bytes32 institutionId;
        bytes32 networkId;
        address wallet;
        InstitutionType institutionType;
        bytes32 countryCode;
        bool verified;
    }

    mapping(bytes32 => HealthcareNetwork) public networks;
    mapping(bytes32 => Institution) public institutions;
    mapping(address => bytes32) public walletToInstitution;

    event HealthcareNetworkCreated(
        bytes32 indexed networkId,
        string name,
        string countryCode,
        address authority
    );

    event InstitutionRegistered(
        bytes32 indexed institutionId,
        bytes32 indexed networkId,
        address indexed wallet,
        InstitutionType institutionType
    );

    event InstitutionVerified(
        bytes32 indexed institutionId
    );

    function createNetwork(
        bytes32 networkId,
        string calldata name,
        string calldata countryCode

    )
        external
        onlyAdmin
    {

        networks[networkId] = HealthcareNetwork({
            networkId: networkId,
            name: name,
            countryCode: countryCode,
            authority: msg.sender,
            active: true
        });

        emit HealthcareNetworkCreated(
            networkId,
            name,
            countryCode,
            msg.sender
        );
    }

    function registerInstitution(
        bytes32 institutionId,
        bytes32 networkId,
        address wallet,
        InstitutionType institutionType,
        bytes32 countryCode
    )
        external
        onlyAdmin
    {

        institutions[institutionId] = Institution({
            institutionId: institutionId,
            networkId: networkId,
            wallet: wallet,
            institutionType: institutionType,
            countryCode: countryCode,
            verified: false
        });

        walletToInstitution[wallet] = institutionId;
        emit InstitutionRegistered(
            institutionId,
            networkId,
            wallet,
            institutionType
        );
    }

    function verifyInstitution(bytes32 institutionId)
        external
        onlyAdmin
    {
        institutions[institutionId].verified = true;
        emit InstitutionVerified(institutionId);
    }

    function isVerifiedInstitution(address wallet)
        external
        view
        returns(bool)
    {
        bytes32 id = walletToInstitution[wallet];
        return institutions[id].verified;
    }
}