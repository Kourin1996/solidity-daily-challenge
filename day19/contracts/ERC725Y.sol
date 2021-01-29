pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "./IERC725Y.sol";

contract ERC725Y is ERC165, Ownable, IERC725Y {
    bytes4 internal constant _INTERFACE_ID_ERC725Y = 0x2bd57b73;

    mapping(bytes32 => bytes) internal store;

    constructor(address _newOwner) public {
        if (_newOwner != owner()) {
            transferOwnership(_newOwner);
        }
        _registerInterface(_INTERFACE_ID_ERC725Y);
    }

    function getData(bytes32 _key)
        public
        view
        virtual
        override
        returns (bytes memory _value)
    {
        return store[_key];
    }

    function setData(bytes32 _key, bytes calldata _value)
        external
        virtual
        override
        onlyOwner
    {
        store[_key] = _value;
        emit DataChanged(_key, _value);
    }
}
