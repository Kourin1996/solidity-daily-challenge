# Day15 ERC165

## Description

ERC165 provides an interface to check if contract has specific functions  
interfaceID is represented as bytes4 and calculated by keccak256 with function name and arg types.

```.sol
bytes4 interfaceIDForFuncA = bytes4(keccak256("funcA(uint256)"));
```

or simply can read from function.selector

```.sol
bytes4 interfaceIDForFuncA = this.funcA.selector;

...

function funcA(uint256 value) external returns (uint256) {}
```

Callee that is implements ERC165 must has supportsInterface function

```.sol
// method1: have mapping and return value in map
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
```

```.sol
// method2: calculate on call
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
```

Caller can check if contract has functions by calling supportsInterface in callee contract  

```.sol

// Caller require callee contract with following functions
bytes4 expectedInterfaceID = bytes4(keccak256("funcA(uint256)")) ^ bytes4(keccak256("funcB(uint256)")) ^ bytes4(keccak256("funcC(string)"));

IERC165 erc165 = IERC165(contractAddress);
require(
    erc165.supportsInterface(expectedInterfaceID),
    "Callee doesn't implement ICallee"
);
```


## References

- https://eips.ethereum.org/EIPS/eip-165
