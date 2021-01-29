pragma solidity ^0.6.0;

interface IERC725X {
    event ContractCreated(address indexed contractAddress);

    event Executed(
        uint256 indexed _operation,
        address indexed _to,
        uint256 indexed _value,
        bytes _data
    );

    function execute(
        uint256 operationType,
        address to,
        uint256 value,
        bytes calldata data
    ) external payable;
}
