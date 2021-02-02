pragma solidity ^0.6.0;

interface IERC725Y {
    event DataChanged(bytes32 indexed key, bytes value);

    function getData(bytes32 key) external view returns (bytes memory value);

    function setData(bytes32 key, bytes calldata value) external;
}
