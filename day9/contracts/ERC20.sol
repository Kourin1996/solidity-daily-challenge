pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    string TOKEN_NAME = "Test Token";
    string TOKEN_SYMBOL = "TST";

    constructor(uint256 initialSupply) public ERC20(TOKEN_NAME, TOKEN_SYMBOL) {
        _mint(msg.sender, initialSupply);
    }
}
