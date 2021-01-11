pragma solidity 0.7.6;

interface IERC223 {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function totalSupply() external view returns (uint256);

    function decimals() external view returns (uint8);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    // New function for ERC223
    function transfer(
        address to,
        uint256 value,
        bytes memory data
    ) external returns (bool success);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    // New Event
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data
    );

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}
