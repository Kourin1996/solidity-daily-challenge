pragma solidity ^0.6.0;

import "./ERC725X.sol";
import "./ERC725Y.sol";

contract ERC725 is ERC725X, ERC725Y {
    constructor(address _newOwner)
        public
        ERC725X(_newOwner)
        ERC725Y(_newOwner)
    {}
}
