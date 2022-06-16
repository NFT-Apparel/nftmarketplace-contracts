// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    constructor(uint256 totalSupply_, string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, totalSupply_);
    }
}
