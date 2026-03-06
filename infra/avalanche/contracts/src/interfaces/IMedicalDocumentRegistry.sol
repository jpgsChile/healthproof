// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMedicalDocumentRegistry {
    function registerDocument(bytes32 documentHash, address issuer, bytes32 metadataHash) external;
    function verifyDocument(bytes32 documentHash) external view returns (bool exists, address issuer, uint256 timestamp);
    function revokeDocument(bytes32 documentHash) external;
    function getMetadataHash(bytes32 documentHash) external view returns (bytes32);
}
