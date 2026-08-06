// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract Preflight {
    uint256 public value;

    function set(uint256 _value) external {
        value = _value;
    }
}
