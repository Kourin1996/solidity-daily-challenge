pragma solidity ^0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PaymentChannel is ReentrancyGuard {
    using SafeMath for uint256;

    address payable public payer;
    address payable public payee;
    uint256 public expiresAt;

    constructor(address payable _payee, uint256 _duration) payable {
        require(_duration > 0, "duration must be positive");

        payer = msg.sender;
        payee = _payee;

        expiresAt = block.timestamp.add(_duration);
    }

    receive() external payable {
        require(msg.sender == payer);
    }

    function close(uint256 _amount, bytes memory _signature)
        public
        nonReentrant
    {
        require(msg.sender == payee, "Not payee");
        require(
            isValidSignature(_amount, _signature),
            "Signature is not valid"
        );

        payee.transfer(_amount);
        selfdestruct(payer);
    }

    // Close channel, refund deposit to payer, destroy contract
    function kill() public {
        require(msg.sender == payer, "Not payer");
        require(block.timestamp >= expiresAt, "Not expired");
        selfdestruct(payer);
    }

    function isValidSignature(uint256 _amount, bytes memory _signature)
        internal
        view
        returns (bool)
    {
        bytes32 message = prefixed(keccak256(abi.encodePacked(this, _amount)));

        return recoverSigner(message, _signature) == payer;
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }

    function recoverSigner(bytes32 message, bytes memory sig)
        internal
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);

        // get signer address
        return ecrecover(message, v, r, s);
    }

    // extracts (v, r, s) from signature
    function splitSignature(bytes memory sig)
        internal
        pure
        returns (
            uint8 v,
            bytes32 r,
            bytes32 s
        )
    {
        require(sig.length == 65);

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }
}
