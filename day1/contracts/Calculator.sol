pragma solidity ^0.6.8;

import "hardhat/console.sol";

contract Calculator {
    uint256 current = 0;

    event Calculated(uint256 result);

    function getResult() public view returns (uint256) {
        return current;
    }

    function adds(uint256 number) public returns (uint256) {
        console.log("adds: current=", current, ", number=", number);
        uint256 result = current + number;
        require(result > current, "Uint256 overflow");

        current = result;
        emit Calculated(result);
        return result;
    }

    function subtracts(uint256 number) public returns (uint256) {
        console.log("subtracts: current=", current, ", number=", number);
        uint256 result = current - number;
        require(current > result, "Uint256 underflow");

        current = result;
        emit Calculated(result);
        return result;
    }

    function multiplies(uint256 number) public returns (uint256) {
        console.log("multiplies: current=", current, ", number=", number);
        uint256 result = current * number;
        require(result > current, "Uint256 overflow");

        current = result;
        emit Calculated(result);
        return result;
    }

    function divides(uint256 number) public returns (uint256) {
        require(number != 0, "Divide by zero");
        uint256 result = current / number;

        current = result;
        emit Calculated(result);
        return result;
    }
}
