// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HealthProofKernel {
    address public admin;
    address public governance;
    address public guardian;
    bool public protocolPaused;

    mapping(bytes32 => address) public modules;

    event ModuleRegistered(bytes32 indexed moduleId, address module);
    event ModuleUpdated(bytes32 indexed moduleId, address module);
    event ProtocolPaused(address triggeredBy);
    event ProtocolResumed(address triggeredBy);

    constructor(
        address _admin,
        address _governance,
        address _guardian
    ){
        admin = _admin;
        governance = _governance;
        guardian = _guardian;
    }

    modifier onlyAdmin(){
        require(msg.sender == admin,"Not admin");
        _;
    }

    modifier onlyGovernance(){
        require(msg.sender == governance,"Not governance");
        _;
    }

    function registerModule(
        bytes32 moduleId,
        address moduleAddress
    )
        external
        onlyAdmin
    {

        require(moduleAddress != address(0));

        modules[moduleId] = moduleAddress;

        emit ModuleRegistered(moduleId,moduleAddress);
    }

    function upgradeModule(
        bytes32 moduleId,
        address newAddress
    )
        external
        onlyGovernance
    {
        modules[moduleId] = newAddress;
        emit ModuleUpdated(moduleId,newAddress);
    }

    function pauseProtocol()
        external
    {
        require(msg.sender == guardian);
        protocolPaused = true;
        emit ProtocolPaused(msg.sender);
    }

    function resumeProtocol()
        external
        onlyGovernance
    {

        protocolPaused = false;
        emit ProtocolResumed(msg.sender);
    }

    function getModule(bytes32 moduleId)
        external
        view
        returns(address)
    {

        return modules[moduleId];
    }
}