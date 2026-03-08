// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAuditTrail {
    function log(bytes32 eventType, address actor, bytes32 subject, bytes calldata data) external;
}
