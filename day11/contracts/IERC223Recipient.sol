pragma solidity ^0.7.6;

interface IERC223Recipient {
    function tokenFallback(
        address _from,
        uint256 _value,
        bytes memory _data
    ) external;
}
