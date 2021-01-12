import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { TokenExchange } from "../typechain/TokenExchange";
import { ERC20Token } from "../typechain/ERC20Token";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.use(solidity);
const { expect } = chai;

describe("TokenExchange", () => {
  const BUY_POSITION = 0;
  const SELL_POSITION = 1;
  const INITIAL_TOKEN_SUPPLY = 10 ** 9;
  const INITIAL_AMOUNT = 10 ** 5;

  let tokenExchange: TokenExchange;
  let baseToken: ERC20Token;
  let quoteToken: ERC20Token;
  let signers: SignerWithAddress[] = [];
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;
  let exchangeContractWithBuyer: TokenExchange;
  let exchangeContractWithSeller: TokenExchange;
  let baseTokenWithSeller: ERC20Token;
  let quoteTokenWithBuyer: ERC20Token;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    const erc20TokenFactory = await ethers.getContractFactory(
      "ERC20Token",
      signers[0]
    );
    baseToken = (await erc20TokenFactory.deploy(
      ethers.utils.formatBytes32String("Base Token"),
      ethers.utils.formatBytes32String("BT"),
      INITIAL_TOKEN_SUPPLY
    )) as ERC20Token;
    quoteToken = (await erc20TokenFactory.deploy(
      ethers.utils.formatBytes32String("Quote Token"),
      ethers.utils.formatBytes32String("QT"),
      INITIAL_TOKEN_SUPPLY
    )) as ERC20Token;

    const tokenExchangeFactory = await ethers.getContractFactory(
      "TokenExchange",
      signers[0]
    );
    tokenExchange = (await tokenExchangeFactory.deploy(
      baseToken.address,
      quoteToken.address
    )) as TokenExchange;

    await Promise.all([
      baseToken.deployed(),
      quoteToken.deployed(),
      tokenExchange.deployed(),
    ]);

    expect(baseToken.address).to.properAddress;
    expect(quoteToken.address).to.properAddress;
    expect(tokenExchange.address).to.properAddress;

    buyer = signers[1];
    seller = signers[2];

    exchangeContractWithBuyer = tokenExchange.connect(buyer);
    exchangeContractWithSeller = tokenExchange.connect(seller);
    baseTokenWithSeller = baseToken.connect(seller);
    quoteTokenWithBuyer = quoteToken.connect(buyer);
  });

  describe("placeOrder", () => {
    beforeEach(async () => {
      await Promise.all([
        baseToken.transfer(seller.address, INITIAL_AMOUNT),
        quoteToken.transfer(buyer.address, INITIAL_AMOUNT),
      ]);
    });

    it("should fail if buyer doesn't have enough balance to buy", async () => {
      const amount = ethers.BigNumber.from(10 ** 5);
      const price = ethers.BigNumber.from(10 ** 3);
      await expect(
        exchangeContractWithBuyer.placeOrder(BUY_POSITION, price, amount)
      ).to.be.revertedWith("Insufficient balance to buy");
    });

    it("should fail if buyer doesn't have allowance to buy", async () => {
      const amount = ethers.BigNumber.from(10);
      const price = ethers.BigNumber.from(10 ** 2);
      await expect(
        exchangeContractWithBuyer.placeOrder(BUY_POSITION, price, amount)
      ).to.be.revertedWith("Insufficient allowance to buy");
    });

    it("should fail if seller doesn't have enough balance to buy", async () => {
      const amount = ethers.BigNumber.from(10 ** 8);
      const price = ethers.BigNumber.from(10 ** 3);
      await expect(
        exchangeContractWithSeller.placeOrder(SELL_POSITION, price, amount)
      ).to.be.revertedWith("Insufficient balance to sell");
    });

    it("should fail if seller doesn't have allowance to buy", async () => {
      const amount = ethers.BigNumber.from(10 ** 5);
      const price = ethers.BigNumber.from(10 ** 2);
      await expect(
        exchangeContractWithSeller.placeOrder(SELL_POSITION, price, amount)
      ).to.be.revertedWith("Insufficient allowance to sell");
    });

    it("should success for buyer", async () => {
      const amount = ethers.BigNumber.from(10);
      const price = ethers.BigNumber.from(10 ** 2);

      await quoteTokenWithBuyer.approve(
        tokenExchange.address,
        amount.mul(price)
      );

      await expect(
        exchangeContractWithBuyer.placeOrder(BUY_POSITION, price, amount)
      ).not.to.be.reverted;
    });

    it("should success for seller", async () => {
      const amount = ethers.BigNumber.from(10 ** 5);
      const price = ethers.BigNumber.from(10 ** 2);

      await baseTokenWithSeller.approve(tokenExchange.address, amount);

      await expect(
        exchangeContractWithSeller.placeOrder(SELL_POSITION, price, amount)
      ).not.to.be.reverted;
    });

    it("should success and trade (1)", async () => {
      const price = ethers.BigNumber.from(10 ** 2);

      const buyerAmount = ethers.BigNumber.from(10 ** 3);
      const sellerAmount = ethers.BigNumber.from(10 ** 2);
      const baseAmount = sellerAmount;
      const quoteAmount = baseAmount.mul(price);

      await Promise.all([
        quoteTokenWithBuyer.approve(
          tokenExchange.address,
          buyerAmount.mul(price)
        ),
        baseTokenWithSeller.approve(tokenExchange.address, sellerAmount),
      ]);

      await exchangeContractWithBuyer.placeOrder(
        BUY_POSITION,
        price,
        buyerAmount
      );

      await expect(() =>
        exchangeContractWithSeller.placeOrder(
          SELL_POSITION,
          price,
          sellerAmount
        )
      ).to.changeTokenBalances(
        baseToken,
        [buyer, seller],
        [baseAmount, baseAmount.mul(-1)]
      );
    });

    it("should success and trade (2)", async () => {
      const price = ethers.BigNumber.from(10 ** 2);

      const buyerAmount = ethers.BigNumber.from(10 ** 3);
      const sellerAmount = ethers.BigNumber.from(10 ** 2);
      const baseAmount = sellerAmount;
      const quoteAmount = baseAmount.mul(price);

      await Promise.all([
        quoteTokenWithBuyer.approve(
          tokenExchange.address,
          buyerAmount.mul(price)
        ),
        baseTokenWithSeller.approve(tokenExchange.address, sellerAmount),
      ]);

      await exchangeContractWithBuyer.placeOrder(
        BUY_POSITION,
        price,
        buyerAmount
      );

      await expect(() =>
        exchangeContractWithSeller.placeOrder(
          SELL_POSITION,
          price,
          sellerAmount
        )
      ).changeTokenBalances(
        quoteToken,
        [buyer, seller],
        [quoteAmount.mul(-1), quoteAmount]
      );
    });

    it("should be able to continue trade", async () => {
      const price = ethers.BigNumber.from(10 ** 2);

      const buyerAmount = ethers.BigNumber.from(10 ** 3);
      const sellerAmount = ethers.BigNumber.from(10 ** 2);
      const additionalSellerAmount = ethers.BigNumber.from(500);

      const baseAmount = sellerAmount;
      const quoteAmount = baseAmount.mul(price);

      await Promise.all([
        quoteTokenWithBuyer.approve(
          tokenExchange.address,
          buyerAmount.mul(price)
        ),
        baseTokenWithSeller.approve(
          tokenExchange.address,
          sellerAmount.add(additionalSellerAmount)
        ),
      ]);

      await exchangeContractWithBuyer.placeOrder(
        BUY_POSITION,
        price,
        buyerAmount
      );
      await exchangeContractWithSeller.placeOrder(
        SELL_POSITION,
        price,
        sellerAmount
      );

      await expect(() =>
        exchangeContractWithSeller.placeOrder(
          SELL_POSITION,
          price,
          additionalSellerAmount
        )
      ).changeTokenBalances(
        baseToken,
        [buyer, seller],
        [additionalSellerAmount, additionalSellerAmount.mul(-1)]
      );
    });
  });
});
