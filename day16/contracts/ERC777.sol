pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "./IERC777.sol";
import "./IERC777Sender.sol";
import "./IERC777Recipient.sol";

import "hardhat/console.sol";

contract ERC777 is IERC777, IERC20 {
    using SafeMath for uint256;
    using Address for address;

    IERC1820Registry internal constant _ERC1820_REGISTRY =
        IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    mapping(address => uint256) private _balances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    // keccak256("ERC777TokensSender")
    bytes32 private constant _TOKENS_SENDER_INTERFACE_HASH =
        0x29ddb589b1fb5fc7cf394961c1adf5f8c6454761adf795e67fe149f658abe895;

    // keccak256("ERC777TokensRecipient")
    bytes32 private constant _TOKENS_RECIPIENT_INTERFACE_HASH =
        0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b;

    address[] private _defaultOperatorsArray;

    mapping(address => bool) private _defaultOperators;

    mapping(address => mapping(address => bool)) private _operators;
    mapping(address => mapping(address => bool))
        private _revokedDefaultOperators;

    mapping(address => mapping(address => uint256)) private _allowances;

    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory defaultOperators_,
        uint256 amount_
    ) public {
        _name = name_;
        _symbol = symbol_;

        _defaultOperatorsArray = defaultOperators_;
        for (uint256 i = 0; i < _defaultOperatorsArray.length; i++) {
            _defaultOperators[_defaultOperatorsArray[i]] = true;
        }

        _ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            keccak256("ERC777Token"),
            address(this)
        );
        _ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            keccak256("ERC20Token"),
            address(this)
        );

        _mint(msg.sender, amount_, "", "");
    }

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function decimals() public pure returns (uint8) {
        return 18;
    }

    function granularity() public view override returns (uint256) {
        return 1;
    }

    function totalSupply()
        public
        view
        override(IERC20, IERC777)
        returns (uint256)
    {
        return _totalSupply;
    }

    function balanceOf(address tokenHolder_)
        public
        view
        override(IERC20, IERC777)
        returns (uint256)
    {
        return _balances[tokenHolder_];
    }

    function send(
        address recipient_,
        uint256 amount_,
        bytes memory data_
    ) public virtual override {
        _send(msg.sender, recipient_, amount_, data_, "", true);
    }

    function transfer(address _recipient, uint256 _amount)
        public
        virtual
        override
        returns (bool)
    {
        require(
            _recipient != address(0),
            "recipient address must not be zero address"
        );

        address from = msg.sender;

        _callTokensToSend(from, from, _recipient, _amount, "", "");

        _move(from, from, _recipient, _amount, "", "");

        _callTokensReceived(from, from, _recipient, _amount, "", "", false);

        return true;
    }

    function burn(uint256 _amount, bytes memory _data) public virtual override {
        _burn(msg.sender, _amount, _data, "");
    }

    function isOperatorFor(address _operator, address _tokenHolder)
        public
        view
        override
        returns (bool)
    {
        return
            _operator == _tokenHolder ||
            (_defaultOperators[_operator] &&
                !_revokedDefaultOperators[_tokenHolder][_operator]) ||
            _operators[_tokenHolder][_operator];
    }

    function authorizeOperator(address _operator) public virtual override {
        require(msg.sender != _operator, "Can't self authorize");

        if (_defaultOperators[_operator]) {
            delete _revokedDefaultOperators[msg.sender][_operator];
        } else {
            _operators[msg.sender][_operator] = true;
        }

        emit AuthorizedOperator(_operator, msg.sender);
    }

    function revokeOperator(address _operator) public virtual override {
        require(_operator != msg.sender, "Can't self revoke");

        if (_defaultOperators[_operator]) {
            _revokedDefaultOperators[msg.sender][_operator] = true;
        } else {
            delete _operators[msg.sender][_operator];
        }

        emit RevokedOperator(_operator, msg.sender);
    }

    function defaultOperators()
        public
        view
        override
        returns (address[] memory)
    {
        return _defaultOperatorsArray;
    }

    function operatorSend(
        address _sender,
        address _recipient,
        uint256 _amount,
        bytes memory _data,
        bytes memory _operatorData
    ) public virtual override {
        require(
            isOperatorFor(msg.sender, _sender),
            "Caller is not an operator for holder"
        );
        _send(_sender, _recipient, _amount, _data, _operatorData, true);
    }

    function operatorBurn(
        address _account,
        uint256 _amount,
        bytes memory _data,
        bytes memory _operatorData
    ) public virtual override {
        require(
            isOperatorFor(msg.sender, _account),
            "caller is not an operator for holder"
        );
        _burn(_account, _amount, _data, _operatorData);
    }

    function allowance(address _holder, address _spender)
        public
        view
        override
        returns (uint256)
    {
        return _allowances[_holder][_spender];
    }

    function approve(address _spender, uint256 _value)
        public
        virtual
        override
        returns (bool)
    {
        address holder = msg.sender;
        _approve(holder, _spender, _value);
        return true;
    }

    function transferFrom(
        address _holder,
        address _recipient,
        uint256 _amount
    ) public virtual override returns (bool) {
        require(
            _recipient != address(0),
            "_recipient must not be zero address"
        );
        require(_holder != address(0), "_holder must not be zero address");

        address spender = msg.sender;

        _callTokensToSend(spender, _holder, _recipient, _amount, "", "");

        _move(spender, _holder, _recipient, _amount, "", "");
        _approve(
            _holder,
            spender,
            _allowances[_holder][spender].sub(
                _amount,
                "transfer amount exceeds allowance"
            )
        );

        _callTokensReceived(
            spender,
            _holder,
            _recipient,
            _amount,
            "",
            "",
            false
        );

        return true;
    }

    function _mint(
        address _account,
        uint256 _amount,
        bytes memory _userData,
        bytes memory _operatorData
    ) internal virtual {
        require(
            _account != address(0),
            "target address must not be zero address"
        );

        address operator = msg.sender;

        _beforeTokenTransfer(operator, address(0), _account, _amount);

        _totalSupply = _totalSupply.add(_amount);
        _balances[_account] = _balances[_account].add(_amount);

        _callTokensReceived(
            operator,
            address(0),
            _account,
            _amount,
            _userData,
            _operatorData,
            true
        );

        emit Minted(operator, _account, _amount, _userData, _operatorData);
        emit Transfer(address(0), _account, _amount);
    }

    function _send(
        address from_,
        address to_,
        uint256 amount_,
        bytes memory userData_,
        bytes memory operatorData_,
        bool requireReceptionAck_
    ) internal virtual {
        require(from_ != address(0), "from address must not be zero address");
        require(to_ != address(0), "to address must not be zero address");

        address operator = msg.sender;

        _callTokensToSend(
            operator,
            from_,
            to_,
            amount_,
            userData_,
            operatorData_
        );

        _move(operator, from_, to_, amount_, userData_, operatorData_);

        _callTokensReceived(
            operator,
            from_,
            to_,
            amount_,
            userData_,
            operatorData_,
            requireReceptionAck_
        );
    }

    function _burn(
        address _from,
        uint256 _amount,
        bytes memory _data,
        bytes memory _operatorData
    ) internal virtual {
        require(_from != address(0), "from address must not be zero address");

        address operator = msg.sender;

        _beforeTokenTransfer(operator, _from, address(0), _amount);
        _callTokensToSend(
            operator,
            _from,
            address(0),
            _amount,
            _data,
            _operatorData
        );

        _balances[_from] = _balances[_from].sub(
            _amount,
            "burn amount exceeds balance"
        );
        _totalSupply = _totalSupply.sub(_amount);

        emit Burned(operator, _from, _amount, _data, _operatorData);
        emit Transfer(_from, address(0), _amount);
    }

    function _move(
        address _operator,
        address _from,
        address _to,
        uint256 _amount,
        bytes memory _userData,
        bytes memory _operatorData
    ) private {
        _beforeTokenTransfer(_operator, _from, _to, _amount);

        _balances[_from] = _balances[_from].sub(
            _amount,
            "transfer amount exceeds balance"
        );
        _balances[_to] = _balances[_to].add(_amount);

        emit Sent(_operator, _from, _to, _amount, _userData, _operatorData);
        emit Transfer(_from, _to, _amount);
    }

    function _approve(
        address _holder,
        address _spender,
        uint256 _value
    ) internal {
        require(
            _holder != address(0),
            "_holder address must not be zero address"
        );
        require(_spender != address(0), "to address must not be zero address");

        _allowances[_holder][_spender] = _value;
        emit Approval(_holder, _spender, _value);
    }

    function _callTokensToSend(
        address _operator,
        address _from,
        address _to,
        uint256 _amount,
        bytes memory _userData,
        bytes memory _operatorData
    ) private {
        address implementer =
            _ERC1820_REGISTRY.getInterfaceImplementer(
                _from,
                _TOKENS_SENDER_INTERFACE_HASH
            );
        if (implementer != address(0)) {
            IERC777Sender(implementer).tokensToSend(
                _operator,
                _from,
                _to,
                _amount,
                _userData,
                _operatorData
            );
        }
    }

    function _callTokensReceived(
        address _operator,
        address _from,
        address _to,
        uint256 _amount,
        bytes memory _userData,
        bytes memory _operatorData,
        bool _requireReceptionAck
    ) private {
        address implementer =
            _ERC1820_REGISTRY.getInterfaceImplementer(
                _to,
                _TOKENS_RECIPIENT_INTERFACE_HASH
            );

        if (implementer != address(0)) {
            IERC777Recipient(implementer).tokensReceived(
                _operator,
                _from,
                _to,
                _amount,
                _userData,
                _operatorData
            );
        } else if (_requireReceptionAck) {
            require(
                !_to.isContract(),
                "token recipient contract has no implementer for ERC777TokensRecipient"
            );
        }
    }

    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256 _amount
    ) internal virtual {}
}
