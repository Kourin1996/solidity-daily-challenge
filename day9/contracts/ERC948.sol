pragma solidity ^0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC948 {
    using SafeMath for uint256;

    struct Subscription {
        address subscriberAddress;
        address tokenAddress;
        uint256 initialPayment;
        uint256 paymentPerPeriod;
        uint256 period;
        uint256 startTime;
        uint256 nextPayment;
    }

    address payable serviceProviderAddress;

    mapping(bytes32 => Subscription) public subscriptions;

    event NewSubscription(
        bytes32 subscriptionId,
        address subscriberAddress,
        address tokenAddress,
        uint256 initialPayment,
        uint256 paymentPerPeriod,
        uint256 period,
        uint256 startTime,
        uint256 nextPayment
    );

    event ProcessedSubscription(
        bytes32 indexed subscriptionId,
        address indexed subscriberAddress,
        address tokenAddress,
        uint256 amount,
        uint256 nextPayment
    );

    modifier onlyProvider() {
        require(
            msg.sender == serviceProviderAddress,
            "Only service provider can call"
        );
        _;
    }

    modifier canProcessSubscription(bytes32 _subscriptionId) {
        Subscription memory subscription = subscriptions[_subscriptionId];

        require(
            subscription.subscriberAddress != address(0),
            "Subscription doesn't exist"
        );
        require(
            subscription.startTime <= block.timestamp,
            "Subscription has not started yet"
        );
        require(
            subscription.nextPayment <= block.timestamp,
            "Next payment has not reached now"
        );

        _;
    }

    constructor() public {
        serviceProviderAddress = msg.sender;
    }

    function subscribe(
        address _tokenAddress,
        uint256 _initialPayment,
        uint256 _paymentPerPeriod,
        uint256 _period,
        uint256 _startTime
    ) public returns (bytes32) {
        require(_tokenAddress != address(0), "Token Address must not be zero");
        require(
            _paymentPerPeriod > 0,
            "Payment Amount per period must be positive integer"
        );
        require(_period > 0, "Period must be positive number");
        require(
            _startTime >= block.timestamp,
            "Start Time must not start in the past"
        );

        ERC20 token = ERC20(_tokenAddress);
        uint256 amountRequired = _initialPayment + _paymentPerPeriod;
        require(
            token.balanceOf(msg.sender) >= amountRequired,
            "Insufficient balance for initial payment and first payment"
        );
        require(
            token.allowance(msg.sender, address(this)) >= amountRequired,
            "Insufficient approval for initial payment and first payment"
        );

        uint256 nextPayment = _startTime + _period;

        bytes32 subscriptionId =
            keccak256(abi.encodePacked(msg.sender, block.timestamp));
        subscriptions[subscriptionId] = Subscription({
            subscriberAddress: msg.sender,
            tokenAddress: _tokenAddress,
            initialPayment: _initialPayment,
            paymentPerPeriod: _paymentPerPeriod,
            period: _period,
            startTime: _startTime,
            nextPayment: nextPayment
        });

        token.transferFrom(msg.sender, serviceProviderAddress, _initialPayment);

        emit NewSubscription(
            subscriptionId,
            msg.sender,
            _tokenAddress,
            _initialPayment,
            _paymentPerPeriod,
            _period,
            _startTime,
            nextPayment
        );

        return subscriptionId;
    }

    function unsubscribe(bytes32 _subscriptionId) public returns (bool) {
        Subscription memory subscription = subscriptions[_subscriptionId];
        require(
            subscription.subscriberAddress != address(0),
            "Subscription doesn't exist"
        );
        require(
            subscription.subscriberAddress == msg.sender,
            "Only subscriber can unsubscribe"
        );

        delete subscriptions[_subscriptionId];
        return true;
    }

    function processSubscription(bytes32 _subscriptionId)
        public
        onlyProvider
        canProcessSubscription(_subscriptionId)
        returns (bool)
    {
        Subscription storage subscription = subscriptions[_subscriptionId];

        uint256 nextPayment = subscription.nextPayment.add(subscription.period);
        subscription.nextPayment = nextPayment;

        ERC20 token = ERC20(subscription.tokenAddress);

        token.transferFrom(
            subscription.subscriberAddress,
            serviceProviderAddress,
            subscription.paymentPerPeriod
        );

        emit ProcessedSubscription(
            _subscriptionId,
            msg.sender,
            subscription.tokenAddress,
            subscription.paymentPerPeriod,
            nextPayment
        );

        return true;
    }
}
