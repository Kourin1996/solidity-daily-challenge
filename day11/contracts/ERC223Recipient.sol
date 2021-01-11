pragma solidity ^0.7.6;

import "./IERC223Recipient.sol";

contract ERC223Recipient is IERC223Recipient {
    constructor() {}

    function tokenFallback(
        address _from,
        uint256 _value,
        bytes memory _data
    ) public override {}
}
