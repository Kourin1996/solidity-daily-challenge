pragma solidity ^0.7.6;

import "./IERC165.sol";

interface ICallee is IERC165 {
    function funcA(uint256 value) external view returns (uint256);

    function funcB(uint256 value) external view returns (uint256);

    function funcC(string memory s) external view returns (string memory);
}
