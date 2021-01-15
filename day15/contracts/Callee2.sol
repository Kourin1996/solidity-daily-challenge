pragma solidity ^0.7.6;

import "./IERC165.sol";

// Method2: calculate interaceID on-call
contract Callee2 is IERC165 {
    constructor() {}

    function supportsInterface(bytes4 interfaceID)
        external
        view
        override
        returns (bool)
    {
        return
            interfaceID == this.supportsInterface.selector ||
            interfaceID == this.funcA.selector ||
            interfaceID == this.funcB.selector ||
            interfaceID == this.funcC.selector;
    }

    function funcA(uint256 value) external returns (uint256) {
        return value * 10;
    }

    function funcB(uint256 value) external returns (uint256) {
        return value / 10;
    }

    function funcC(uint256 value) external returns (uint256) {
        return value * 1000;
    }
}
