pragma solidity ^0.6.0;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./ERC725.sol";
import "../IERC1721.sol";

contract ERC725Account is ERC725, IERC1271 {
    bytes4 internal constant _INTERFACE_ID_ERC1271 = 0x1626ba7e;
    bytes4 internal constant _ERC1271FAILVALUE = 0xffffffff;

    event ValueReceived(address indexed sender, uint256 indexed value);

    constructor(address _newOwner) public ERC725(_newOwner) {
        bytes32 key =
            bytes32(
                0xeafec4d89fa9619884b6b89135626455000000000000000000000000afdeb5d6
            );
        store[key] = abi.encodePacked(bytes4(0xafdeb5d6)); // bytes4(keccak256('ERC725Account')
        emit DataChanged(key, store[key]);

        _registerInterface(_INTERFACE_ID_ERC1271);
    }

    receive() external payable {
        emit ValueReceived(_msgSender(), msg.value);
    }

    function isValidSignature(bytes32 _hash, bytes memory _signature)
        public
        view
        override
        returns (bytes4 magicValue)
    {
        if (
            Address.isContract(owner()) &&
            supportsInterface(_INTERFACE_ID_ERC1271)
        ) {
            return IERC1271(owner()).isValidSignature(_hash, _signature);
        } else {
            return
                owner() == ECDSA.recover(_hash, _signature)
                    ? _INTERFACE_ID_ERC1271
                    : _ERC1271FAILVALUE;
        }
    }
}
