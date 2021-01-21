pragma solidity ^0.7.6;

import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "./IERC777Sender.sol";

contract ERC777Sender is IERC777Sender {
    IERC1820Registry internal constant _ERC1820_REGISTRY =
        IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    constructor() {
        _ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            keccak256("ERC777Sender"),
            address(this)
        );
    }

    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {}
}
