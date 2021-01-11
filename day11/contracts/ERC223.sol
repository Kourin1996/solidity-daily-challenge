pragma solidity ^0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IERC223.sol";
import "./IERC223Recipient.sol";

import "hardhat/console.sol";

contract ERC223 is IERC223 {
    using SafeMath for uint256;

    address _owner;

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    string private _name;
    string private _symbol;

    uint256 private _totalSupply;
    uint8 private _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        uint8 decimals_
    ) public {
        _owner = msg.sender;
        _name = name_;
        _symbol = symbol_;
        _totalSupply = totalSupply_;
        _decimals = decimals_;
    }

    modifier onlyOwner {
        require(
            msg.sender == _owner,
            "Only chairperson can call this function."
        );
        _;
    }

    event Mint(address indexed to, uint256 amount);

    event Burn(address indexed from, uint256 amount);

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount)
        public
        override
        returns (bool)
    {
        bytes memory empty = hex"00000000";
        _transfer(msg.sender, recipient, amount, empty);
        return true;
    }

    // New function
    function transfer(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public override returns (bool success) {
        _transfer(msg.sender, _to, _value, _data);
        return true;
    }

    function allowance(address owner, address spender)
        public
        view
        override
        returns (uint256)
    {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount)
        public
        override
        returns (bool)
    {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        bytes memory empty = hex"00000000";
        // Revert if underflow happens
        uint256 remainAllowance = _allowances[sender][msg.sender] - amount;

        _transfer(sender, recipient, amount, empty);
        _approve(sender, msg.sender, remainAllowance);
        return true;
    }

    function mint(address recipient, uint256 amount)
        public
        onlyOwner
        returns (bool)
    {
        _mint(recipient, amount);

        return true;
    }

    function burn(address from, uint256 amount)
        public
        onlyOwner
        returns (bool)
    {
        _burn(from, amount);
        return true;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount,
        bytes memory data
    ) internal {
        require(sender != address(0), "transfer from the zero address");
        require(recipient != address(0), "transfer to the zero address");

        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);

        console.log("is contract", Address.isContract(recipient));
        if (Address.isContract(recipient)) {
            IERC223Recipient receiver = IERC223Recipient(recipient);
            receiver.tokenFallback(msg.sender, amount, data);
        }
        emit Transfer(sender, recipient, amount, data);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        require(owner != address(0), "approve from the zero address");
        require(spender != address(0), "approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _mint(address account, uint256 amount) internal {
        bytes memory empty = hex"00000000";
        require(account != address(0), "mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);

        emit Mint(account, amount);
        emit Transfer(address(0), account, amount, empty);
    }

    function _burn(address account, uint256 amount) internal virtual {
        bytes memory empty = hex"00000000";
        require(account != address(0), "burn from the zero address");

        _balances[account] = _balances[account].sub(amount);
        _totalSupply = _totalSupply.sub(amount);

        emit Burn(account, amount);
        emit Transfer(account, address(0), amount, empty);
    }
}
