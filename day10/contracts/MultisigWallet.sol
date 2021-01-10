pragma solidity ^0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "hardhat/console.sol";

contract MultisigWallet {
    using SafeMath for uint256;
    using SafeMath for uint8;

    enum TransactionType {
        None,
        AddAccount,
        RemoveAccount,
        ChangeNumberOfRequiredConfirmation,
        Transfer
    }

    enum AnswerType {NotYet, Confirm, Revoke}

    struct Transaction {
        TransactionType transactionType;
        uint8 confirmations;
        bool executed;
        // payload
        address target;
        uint256 value;
    }

    mapping(address => bool) accounts;
    uint8 numberOfAccounts;
    uint8 requiredConfirmation;

    mapping(bytes32 => Transaction) transactions;
    mapping(bytes32 => mapping(address => AnswerType)) answers;

    event Deposit(address sender, uint256 amount);
    event TransactionCreated(
        bytes32 transactionId,
        TransactionType transactionType,
        address proposer,
        address target,
        uint256 amount
    );
    event Confirmation(bytes32 indexed transactionId, address account);
    event Revocation(bytes32 indexed transactionId, address account);
    event AccountAddition(address account);
    event AccountRemoval(address account);
    event RequiredConfirmationChange(uint8 num);
    event Transfer(address destination, uint256 amount);

    modifier onlyAccounts {
        require(accounts[msg.sender], "Only registered accounts can call");
        _;
    }

    modifier transactionExists(bytes32 _transactionId) {
        require(
            transactions[_transactionId].transactionType !=
                TransactionType.None,
            "Transaction doesn't exist"
        );
        _;
    }

    modifier beforeVote(bytes32 _transactionId) {
        require(
            answers[_transactionId][msg.sender] == AnswerType.NotYet,
            "The account has already voted"
        );
        _;
    }

    constructor(address[] memory _accounts, uint8 _requiredConfirmation) {
        require(_accounts.length > 0, "Initial accounts must not be non-zero");
        require(
            _accounts.length < 2**8,
            "Number of accounts must be less than 2^8"
        );
        require(
            _accounts.length >= _requiredConfirmation,
            "Number of required confirmations must be equal or less than number of accounts"
        );
        for (uint256 i = 0; i < _accounts.length; i++) {
            accounts[_accounts[i]] = true;
        }
        numberOfAccounts = uint8(_accounts.length);
        requiredConfirmation = _requiredConfirmation;
    }

    receive() external payable {
        if (msg.value > 0) {
            emit Deposit(msg.sender, msg.value);
        }
    }

    function addAccount(address _newAccount)
        public
        onlyAccounts
        returns (bytes32)
    {
        require(
            accounts[_newAccount] == false,
            "The account has already joined"
        );

        TransactionType transactionType = TransactionType.AddAccount;
        bytes32 transactionId = addTransaction(transactionType, _newAccount, 0);
        return transactionId;
    }

    function removeAccount(address _removeAccount)
        public
        onlyAccounts
        returns (bytes32)
    {
        require(
            accounts[_removeAccount] == true,
            "The account doesn't exist in wallet"
        );

        TransactionType transactionType = TransactionType.RemoveAccount;
        bytes32 transactionId =
            addTransaction(transactionType, _removeAccount, 0);
        return transactionId;
    }

    function changeRequiredConfirmations(uint8 _requiredConfirmations)
        public
        onlyAccounts
        returns (bytes32)
    {
        require(
            _requiredConfirmations <= numberOfAccounts,
            "Number of required confirmations must be equal or less than number of accounts"
        );

        TransactionType transactionType =
            TransactionType.ChangeNumberOfRequiredConfirmation;
        bytes32 transactionId =
            addTransaction(
                transactionType,
                address(0),
                uint256(_requiredConfirmations)
            );
        return transactionId;
    }

    function transfer(address _destination, uint256 _value)
        public
        onlyAccounts
        returns (bytes32)
    {
        TransactionType transactionType = TransactionType.Transfer;
        bytes32 transactionId =
            addTransaction(transactionType, _destination, _value);
        return transactionId;
    }

    function confirm(bytes32 _transactionId)
        public
        onlyAccounts
        transactionExists(_transactionId)
        beforeVote(_transactionId)
        returns (bool)
    {
        answers[_transactionId][msg.sender] = AnswerType.Confirm;

        Transaction storage transaction = transactions[_transactionId];
        transaction.confirmations += 1;
        emit Confirmation(_transactionId, msg.sender);
        return true;
    }

    function revoke(bytes32 _transactionId)
        public
        onlyAccounts
        transactionExists(_transactionId)
        beforeVote(_transactionId)
        returns (bool)
    {
        answers[_transactionId][msg.sender] = AnswerType.Revoke;

        emit Revocation(_transactionId, msg.sender);
        return true;
    }

    function executeTransaction(bytes32 _transactionId)
        public
        onlyAccounts
        transactionExists(_transactionId)
        returns (bool)
    {
        Transaction storage transaction = transactions[_transactionId];

        require(
            transaction.executed == false,
            "The transaction has been executed"
        );
        require(
            transaction.confirmations >= requiredConfirmation,
            "The transaction doesn't meet required confirmations"
        );

        if (transaction.transactionType == TransactionType.AddAccount) {
            require(
                accounts[transaction.target] == false,
                "The account has already joined"
            );
            require(
                numberOfAccounts < 2**8 - 1,
                "Number of accounts cannot exceed upper limit 255"
            );

            accounts[transaction.target] = true;
            numberOfAccounts += 1;

            emit AccountAddition(transaction.target);
        } else if (
            transaction.transactionType == TransactionType.RemoveAccount
        ) {
            require(
                accounts[transaction.target] == true,
                "The account doesn't exist in wallet"
            );
            require(
                numberOfAccounts > 1,
                "At least one account must exist in wallet"
            );
            require(
                numberOfAccounts > requiredConfirmation,
                "Number of required confirmations must be equal or less than number of accounts"
            );

            accounts[transaction.target] = false;
            numberOfAccounts -= 1;

            emit AccountRemoval(transaction.target);
        } else if (
            transaction.transactionType ==
            TransactionType.ChangeNumberOfRequiredConfirmation
        ) {
            require(
                transaction.value <= numberOfAccounts,
                "Number of required confirmations must be equal or less than number of accounts"
            );
            requiredConfirmation = uint8(transaction.value);

            emit RequiredConfirmationChange(requiredConfirmation);
        } else if (transaction.transactionType == TransactionType.Transfer) {
            address payable destination = payable(transaction.target);
            destination.transfer(transaction.value);

            emit Transfer(transaction.target, transaction.value);
        }

        transaction.executed = true;
        return true;
    }

    function addTransaction(
        TransactionType _transactionType,
        address _target,
        uint256 _value
    ) internal returns (bytes32) {
        bytes32 transactionId =
            getTransactionId(_transactionType, _target, _value);
        transactions[transactionId] = Transaction({
            transactionType: _transactionType,
            confirmations: 1,
            executed: false,
            target: _target,
            value: _value
        });
        answers[transactionId][msg.sender] = AnswerType.Confirm;

        emit TransactionCreated(
            transactionId,
            _transactionType,
            msg.sender,
            _target,
            _value
        );

        return transactionId;
    }

    function getTransactionId(
        TransactionType _transactionType,
        address _target,
        uint256 _value
    ) internal returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    _transactionType,
                    _target,
                    _value,
                    block.timestamp
                )
            );
    }
}
