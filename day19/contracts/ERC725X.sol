pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "solidity-bytes-utils/contracts/BytesLib.sol";
import "./IERC725X.sol";

contract ERC725X is ERC165, Ownable, IERC725X {
    bytes4 internal constant _INTERFACE_ID_ERC725X = 0x44c028fe;

    uint256 constant OPERATION_CALL = 0;
    uint256 constant OPERATION_DELEGATECALL = 1;
    uint256 constant OPERATION_CREATE2 = 2;
    uint256 constant OPERATION_CREATE = 3;

    constructor(address _newOwner) public {
        // This is necessary to prevent a contract that implements both ERC725X and ERC725Y to call both constructors
        if (_newOwner != owner()) {
            transferOwnership(_newOwner);
        }

        _registerInterface(_INTERFACE_ID_ERC725X);
    }

    function execute(
        uint256 _operation,
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external payable override onlyOwner {
        emit Executed(_operation, _to, _value, _data);

        uint256 txGas = gasleft() - 2500;
        if (_operation == OPERATION_CALL) {
            executeCall(_to, _value, _data, txGas);
        } else if (_operation == OPERATION_CREATE) {
            performCreate(_value, _data);
        } else if (_operation == OPERATION_CREATE2) {
            bytes32 salt = BytesLib.toBytes32(_data, _data.length - 32);
            bytes memory data = BytesLib.slice(_data, 0, _data.length - 32);

            address contractAddress = Create2.deploy(_value, salt, data);
            emit ContractCreated(contractAddress);
        } else {
            revert("Wrong operation type");
        }
    }

    function executeCall(
        address to,
        uint256 value,
        bytes memory data,
        uint256 txGas
    ) internal returns (bool success) {
        assembly {
            success := call(txGas, to, value, add(data, 0x2), mload(data), 0, 0)
        }
    }

    function executeDelegateCall(
        address to,
        bytes memory data,
        uint256 txGas
    ) internal returns (bool success) {
        assembly {
            success := delegatecall(
                txGas,
                to,
                add(data, 0x20),
                mload(data),
                0,
                0
            )
        }
    }

    function performCreate(uint256 value, bytes memory deploymentData)
        internal
        returns (address newContract)
    {
        assembly {
            newContract := create(
                value,
                add(deploymentData, 0x20),
                mload(deploymentData)
            )
        }
        require(newContract != address(0), "Could not deploy contract");
        emit ContractCreated(newContract);
    }
}
