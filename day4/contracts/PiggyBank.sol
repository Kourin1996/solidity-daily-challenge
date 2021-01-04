pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract PiggyBank {
    using SafeMath for uint256;

    struct Account {
        address owner;
        uint256 currentBalance;
        uint256 goalAmount;
        bool isWithdrawalbe;
    }

    mapping(bytes32 => Account) accounts;

    constructor() public {}

    event Create(bytes32 id, address indexed account, uint256 goal);
    event Deposit(bytes32 indexed id, uint256 newBalance);
    event Withdraw(bytes32 indexed id, uint256 newBalance);

    function getNewID() private returns (bytes32) {
        bytes20 id =
            bytes20(
                keccak256(
                    abi.encodePacked(msg.sender, blockhash(block.number - 1))
                )
            );
        while (accounts[id].owner != address(0)) {
            id = bytes20(keccak256(abi.encodePacked(id)));
        }

        return bytes32(id);
    }

    function getBalance(bytes32 id) public view returns (uint256) {
        require(accounts[id].owner != address(0), "Account does not exist");

        return accounts[id].currentBalance;
    }

    function getGoalAmount(bytes32 id) public view returns (uint256) {
        require(accounts[id].owner != address(0), "Account does not exist");

        return accounts[id].goalAmount;
    }

    function create(uint256 goalAmount) public returns (bytes32) {
        bytes32 id = getNewID();

        accounts[id] = Account({
            owner: msg.sender,
            currentBalance: 0,
            goalAmount: goalAmount,
            isWithdrawalbe: goalAmount == 0
        });

        emit Create(id, msg.sender, goalAmount);
        return id;
    }

    function deposit(bytes32 id) public payable returns (uint256) {
        require(accounts[id].owner != address(0), "Account does not exist");

        Account storage account = accounts[id];
        account.currentBalance = account.currentBalance.add(msg.value);
        account.isWithdrawalbe = account.currentBalance >= account.goalAmount;
        emit Deposit(id, account.currentBalance);

        return account.currentBalance;
    }

    function withdraw(bytes32 id, uint256 amount) public returns (uint256) {
        require(accounts[id].owner != address(0), "Account does not exist");

        Account storage account = accounts[id];
        require(msg.sender == account.owner, "Only owner can withdraw");
        require(account.isWithdrawalbe, "Account doesn't reach goal");

        account.currentBalance = account.currentBalance.sub(amount);
        msg.sender.transfer(amount);
        emit Withdraw(id, account.currentBalance);

        return account.currentBalance;
    }
}
