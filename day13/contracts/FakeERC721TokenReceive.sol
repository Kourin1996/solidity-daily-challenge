pragma solidity ^0.7.6;

contract FakeERC721TokenReceiver {
    constructor() {}

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external returns (bytes4) {
        return bytes4(keccak256("fake"));
    }
}
