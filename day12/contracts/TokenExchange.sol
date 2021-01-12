pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract TokenExchange {
    using SafeMath for uint256;

    enum Position {Buy, Sell}

    struct Order {
        address owner;
        uint256 price;
        uint256 amount;
        uint256 remaining;
    }

    address baseTokenAddress;
    address quoteTokenAddress;

    mapping(uint256 => Order[]) asks;
    mapping(uint256 => Order[]) bids;

    mapping(uint256 => uint256) askIndices;
    mapping(uint256 => uint256) bidIndices;

    constructor(address _baseTokenAddress, address _quoteTokenAddress) {
        baseTokenAddress = _baseTokenAddress;
        quoteTokenAddress = _quoteTokenAddress;
    }

    function placeOrder(
        Position _position,
        uint256 _price,
        uint256 _amount
    ) public returns (uint256) {
        if (_position == Position.Buy) {
            ERC20 quoteToken = ERC20(quoteTokenAddress);

            require(
                quoteToken.balanceOf(msg.sender) >= _price * _amount,
                "Insufficient balance to buy"
            );
            require(
                quoteToken.allowance(msg.sender, address(this)) >=
                    _price * _amount,
                "Insufficient allowance to buy"
            );
        } else {
            ERC20 baseToken = ERC20(baseTokenAddress);

            require(
                baseToken.balanceOf(msg.sender) >= _amount,
                "Insufficient balance to sell"
            );
            require(
                baseToken.allowance(msg.sender, address(this)) >= _amount,
                "Insufficient allowance to sell"
            );
        }

        uint256 remaining = matchPair(_position, _price, _amount);
        Order memory order =
            Order({
                owner: msg.sender,
                price: _price,
                amount: _amount,
                remaining: remaining
            });

        uint256 index = 0;
        if (_position == Position.Buy) {
            index = asks[_price].length;
            asks[_price].push(order);
        } else {
            index = bids[_price].length;
            bids[_price].push(order);
        }

        return index;
    }

    function matchPair(
        Position _position,
        uint256 _price,
        uint256 _amount
    ) internal returns (uint256) {
        uint256 partnerIndex = 0;
        uint256 numOfPartners = 0;
        if (_position == Position.Buy) {
            partnerIndex = bidIndices[_price];
            numOfPartners = bids[_price].length;
        } else {
            partnerIndex = askIndices[_price];
            numOfPartners = asks[_price].length;
        }

        uint256 remaining = _amount;
        while (remaining > 0 && partnerIndex < numOfPartners) {
            Order storage order;
            address buyerAddress;
            address sellerAddress;
            if (_position == Position.Buy) {
                order = bids[_price][partnerIndex];
                buyerAddress = msg.sender;
                sellerAddress = order.owner;
            } else {
                order = asks[_price][partnerIndex];
                buyerAddress = order.owner;
                sellerAddress = msg.sender;
            }

            uint256 tradeAmount = Math.min(order.remaining, remaining);
            if (trade(buyerAddress, sellerAddress, _price, tradeAmount)) {
                remaining -= tradeAmount;
                order.remaining -= tradeAmount;
            }

            if (order.remaining == 0) {
                partnerIndex++;
            }
        }

        if (_position == Position.Buy) {
            bidIndices[_price] = partnerIndex;
        } else {
            askIndices[_price] = partnerIndex;
        }
        return remaining;
    }

    function trade(
        address _buyerAddress,
        address _sellerAddress,
        uint256 _price,
        uint256 _amount
    ) internal returns (bool) {
        ERC20 baseToken = ERC20(baseTokenAddress);
        ERC20 quoteToken = ERC20(quoteTokenAddress);
        require(
            quoteToken.balanceOf(_buyerAddress) >= _price * _amount,
            "Insufficient balance to buy"
        );
        require(
            quoteToken.allowance(_buyerAddress, address(this)) >=
                _price * _amount,
            "Insufficient allowance to buy"
        );
        require(
            baseToken.balanceOf(_sellerAddress) >= _amount,
            "Insufficient balance to sell"
        );
        require(
            baseToken.allowance(_sellerAddress, address(this)) >= _amount,
            "Insufficient allowance to sell"
        );

        quoteToken.transferFrom(
            _buyerAddress,
            _sellerAddress,
            _amount * _price
        );
        baseToken.transferFrom(_sellerAddress, _buyerAddress, _amount);

        return true;
    }
}
