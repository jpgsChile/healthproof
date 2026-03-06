// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentityRegistry {
    function isIdentityValid(address identity) external view returns (bool);
    function getIdentity(address identity) external view returns (string memory did, string memory name, bool active);
}
