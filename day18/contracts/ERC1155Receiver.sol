pragma solidity ^0.7.6;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "./IERC1155Receiver.sol";

contract ERC1155Receiver is ERC165, IERC1155Receiver {
    constructor() public {
        _registerInterface(
            ERC1155Receiver(address(0)).onERC1155Received.selector ^
                ERC1155Receiver(address(0)).onERC1155BatchReceived.selector
        );
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
