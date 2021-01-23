pragma solidity ^0.7.6;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./TestToken.sol";

import "hardhat/console.sol";

contract TokenMarket is Ownable {
    using SafeMath for uint256;

    TestToken _token;
    AggregatorV3Interface _aggregator;

    uint256 _tokenUsdPrice;
    uint256 _decimalsForTokenUsdPrice;

    event BuyToken(
        address indexed account,
        uint256 weiAmount,
        uint256 tokenAmount
    );

    event SellToken(
        address indexed account,
        uint256 tokenAmount,
        uint256 weiAmount
    );

    constructor(
        string memory tokenName_,
        string memory tokenSymbol_,
        uint256 tokenInitialAmount_,
        address oracleContractAddress_,
        uint256 defaultTokenUsdPrice_,
        uint256 defaultDecimalsForTokenUsdPrice_
    ) public Ownable() {
        _token = new TestToken(tokenName_, tokenSymbol_, tokenInitialAmount_);
        _aggregator = AggregatorV3Interface(oracleContractAddress_);
        _tokenUsdPrice = defaultTokenUsdPrice_;
        _decimalsForTokenUsdPrice = defaultDecimalsForTokenUsdPrice_;
    }

    receive() external payable {
        if (msg.value > 0) {
            _buyToken(msg.sender, msg.value);
        }
    }

    function sell(uint256 amount) external {
        require(amount > 0, "amount must be positive integer");
        _sellToken(msg.sender, amount);
    }

    function setTokenUsdPrice(
        uint256 tokenUsdPrice_,
        uint256 decimalsForTokenUsdPrice_
    ) external onlyOwner {
        _tokenUsdPrice = tokenUsdPrice_;
        _decimalsForTokenUsdPrice = decimalsForTokenUsdPrice_;
    }

    function _buyToken(address reciepient_, uint256 weiAmount_) internal {
        (uint256 price, uint256 decimals) = _getCurrentPrice();

        console.log("Buy from %d wei", weiAmount_);
        console.logAddress(reciepient_);
        console.log(
            "Current ETH/USD price: %d USD per 1 Ether (decimals: %d)",
            price,
            decimals
        );
        console.log(
            "Current Token/USD price: %d USD per 1 Token (decimals: %d)",
            _tokenUsdPrice,
            _decimalsForTokenUsdPrice
        );

        uint256 numerator =
            weiAmount_.mul(price.mul(_decimalsForTokenUsdPrice));
        uint256 denominator = decimals.mul(_tokenUsdPrice.mul(18));
        uint256 amount = numerator.div(denominator);

        console.log("Buy %d tokens in %d wei", amount, weiAmount_);

        uint256 currentBalance = _token.balanceOf(address(this));
        require(
            currentBalance >= amount,
            "Contract doesn't have enough balance"
        );

        _token.transfer(reciepient_, amount);
        emit BuyToken(reciepient_, weiAmount_, amount);
    }

    function _sellToken(address sender_, uint256 tokenAmount_) internal {
        (uint256 price, uint256 decimals) = _getCurrentPrice();

        console.log("Sell %d tokens", tokenAmount_);
        console.logAddress(sender_);
        console.log(
            "Current ETH/USD price: %d USD per 1 Ether (decimals: %d)",
            price,
            decimals
        );
        console.log(
            "Current Token/USD price: %d USD per 1 Token (decimals: %d)",
            _tokenUsdPrice,
            _decimalsForTokenUsdPrice
        );

        uint256 numerator =
            tokenAmount_.mul(_tokenUsdPrice.mul(decimals.mul(18)));
        uint256 denominator = _decimalsForTokenUsdPrice.mul(price);
        uint256 amount = numerator.div(denominator);

        console.log("Sell %d tokens by ", tokenAmount_, amount);

        require(
            _token.allowance(sender_, address(this)) >= amount,
            "Not enough allowance"
        );

        _token.transferFrom(sender_, address(this), amount);
        payable(sender_).transfer(amount);

        emit SellToken(sender_, amount, tokenAmount_);
    }

    function _getCurrentPrice()
        internal
        returns (uint256 price, uint256 decimals)
    {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = _aggregator.latestRoundData();

        price = uint256(answer);
        decimals = _aggregator.decimals();
    }
}
