pragma solidity ^0.7.6;

interface IERC777 {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function granularity() external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function balanceOf(address _owner) external view returns (uint256);

    function send(
        address _recipient,
        uint256 _amount,
        bytes calldata _data
    ) external;

    function burn(uint256 _amount, bytes calldata _data) external;

    function isOperatorFor(address _operator, address _tokenHolder)
        external
        view
        returns (bool);

    function authorizeOperator(address _operator) external;

    function revokeOperator(address _operator) external;

    function defaultOperators() external view returns (address[] memory);

    function operatorSend(
        address _sender,
        address _recipient,
        uint256 _amount,
        bytes calldata _data,
        bytes calldata _operatorData
    ) external;

    function operatorBurn(
        address _account,
        uint256 _amount,
        bytes calldata _data,
        bytes calldata _operatorData
    ) external;

    event Sent(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes data,
        bytes operatorData
    );

    event Minted(
        address indexed operator,
        address indexed to,
        uint256 amount,
        bytes data,
        bytes operatorData
    );

    event Burned(
        address indexed operator,
        address indexed from,
        uint256 amount,
        bytes data,
        bytes operatorData
    );

    event AuthorizedOperator(
        address indexed operator,
        address indexed tokenHolder
    );

    event RevokedOperator(
        address indexed operator,
        address indexed tokenHolder
    );
}
