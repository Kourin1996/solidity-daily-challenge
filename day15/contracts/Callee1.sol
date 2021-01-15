pragma solidity ^0.7.6;

import "./ICallee.sol";

// Method1: save interface ID to mapping
contract Callee1 is ICallee {
    mapping(bytes4 => bool) internal supportedInterfaces;

    constructor() {
        supportedInterfaces[0x01ffc9a7] = true; // supportsInterface(bytes4);
        supportedInterfaces[
            this.funcA.selector ^ this.funcB.selector ^ this.funcC.selector
        ] = true;
    }

    function supportsInterface(bytes4 interfaceID)
        external
        view
        override
        returns (bool)
    {
        return supportedInterfaces[interfaceID];
    }

    function funcA(uint256 value) external view override returns (uint256) {
        return value + 1000;
    }

    function funcB(uint256 value) external view override returns (uint256) {
        return value - 1000;
    }

    function funcC(string memory s)
        external
        view
        override
        returns (string memory)
    {
        string memory prefix = "Welcome to Callee1:";
        return string(abi.encodePacked(prefix, s));
    }
}
