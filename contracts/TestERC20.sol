// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Foo is ERC20 {
    uint constant _initial_supply = 100 * (10**18);
    constructor(address[] memory receipts, uint amount) ERC20("Foo", "foo") {
        for (uint i = 0; i < receipts.length; i++) {
            _mint(receipts[i], amount);
        }
    }
}