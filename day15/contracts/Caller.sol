pragma solidity ^0.7.6;

import "./IERC165.sol";
import "./ICallee.sol";

contract Caller {
    address contractAddress;
    bytes4 expectedInterfaceID;

    constructor(address _contractAddress) {
        contractAddress = _contractAddress;
        expectedInterfaceID =
            bytes4(keccak256("funcA(uint256)")) ^
            bytes4(keccak256("funcB(uint256)")) ^
            bytes4(keccak256("funcC(string)"));
    }

    function callFuncA(uint256 value) external view returns (uint256) {
        IERC165 erc165 = IERC165(contractAddress);
        require(
            erc165.supportsInterface(expectedInterfaceID),
            "Callee doesn't implement ICallee"
        );

        ICallee callee = ICallee(contractAddress);
        return callee.funcA(value);
    }

    function callFuncB(uint256 value) external view returns (uint256) {
        IERC165 erc165 = IERC165(contractAddress);
        require(
            erc165.supportsInterface(expectedInterfaceID),
            "Callee doesn't implement ICallee"
        );

        ICallee callee = ICallee(contractAddress);
        return callee.funcB(value);
    }

    function callFuncC(string memory s) external view returns (string memory) {
        IERC165 erc165 = IERC165(contractAddress);
        require(
            erc165.supportsInterface(expectedInterfaceID),
            "Callee doesn't implement ICallee"
        );

        ICallee callee = ICallee(contractAddress);
        return callee.funcC(s);
    }
}
