import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { TokenMarket } from "../typechain/TokenMarket";
import { AggregatorV3Mock } from "../typechain/AggregatorV3Mock";
import { TestToken } from "../typechain/TestToken";
import { BigNumber } from "ethers";

chai.use(solidity);
const { expect } = chai;

async function sendEther(
  signer: SignerWithAddress,
  to: string,
  value: BigNumber
) {
  const [nonce, chainId, gasPrice] = await Promise.all([
    signer.getTransactionCount(),
    signer.getChainId(),
    signer.getGasPrice(),
  ]);
  const transaction = {
    nonce,
    chainId,
    gasPrice,
    gasLimit: 160000,
    to,
    value,
    data: "0x",
  };

  return signer.sendTransaction(transaction);
}

describe("TokenMarket", () => {
  const TOKEN_NAME = "TestToken";
  const TOKEN_SYMBOL = "TT";
  const INITIAL_AMOUNT = ethers.BigNumber.from("1" + "0".repeat(18));
  const DEFAULT_TOKEN_USD_PRICE = ethers.BigNumber.from(1);
  const DEFAULT_DECIMALS_FOR_TOKEN_USD_PRICE = ethers.BigNumber.from(0);

  let signers: SignerWithAddress[] = [];

  let aggregatorV3Mock: AggregatorV3Mock;
  let tokenMarket: TokenMarket;
  let testToken: TestToken;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const aggregatorV3MockFactory = await ethers.getContractFactory(
      "AggregatorV3Mock",
      signers[0]
    );
    aggregatorV3Mock = (await aggregatorV3MockFactory.deploy()) as AggregatorV3Mock;

    const tokenMarketFactory = await ethers.getContractFactory(
      "TokenMarket",
      signers[0]
    );
    tokenMarket = (await tokenMarketFactory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      INITIAL_AMOUNT,
      aggregatorV3Mock.address,
      DEFAULT_TOKEN_USD_PRICE,
      DEFAULT_DECIMALS_FOR_TOKEN_USD_PRICE
    )) as TokenMarket;

    await Promise.all([aggregatorV3Mock.deployed(), tokenMarket.deployed()]);

    const testTokenFactory = await ethers.getContractFactory(
      "TestToken",
      signers[0]
    );
    testToken = (await testTokenFactory.attach(
      await tokenMarket.tokenAddress()
    )) as TestToken;

    expect(aggregatorV3Mock.address).to.properAddress;
    expect(tokenMarket.address).to.properAddress;
  });

  describe("buy", () => {
    const amount = ethers.utils.parseEther("1");
    const expected = ethers.BigNumber.from(1500);
    // 1500 USD / ETH;
    // 1 Token / 1 USD;

    it("should emit BuyToken", async () => {
      await expect(sendEther(signers[0], tokenMarket.address, amount))
        .to.emit(tokenMarket, "BuyToken")
        .withArgs(signers[0].address, amount, expected);
    });

    it("should change Ether Balance", async () => {
      await expect(() =>
        sendEther(signers[0], tokenMarket.address, amount)
      ).to.changeEtherBalances(
        [signers[0], tokenMarket],
        [amount.mul(-1), amount]
      );
    });

    it("should change Token Balance", async () => {
      await expect(() =>
        sendEther(signers[0], tokenMarket.address, amount)
      ).to.changeTokenBalances(
        testToken,
        [signers[0], tokenMarket],
        [expected, expected.mul(-1)]
      );
    });
  });

  describe("sell", () => {
    const amount = ethers.BigNumber.from(3000);
    const expected = ethers.utils.parseEther("2");
    // 1500 USD / ETH;
    // 1 Token / 1 USD;

    beforeEach(async () => {
      const amount = ethers.utils.parseEther("5");
      await sendEther(signers[0], tokenMarket.address, amount);
      await testToken.approve(tokenMarket.address, expected);
    });

    it("should emit SellToken", async () => {
      await expect(tokenMarket.sell(amount))
        .to.emit(tokenMarket, "SellToken")
        .withArgs(signers[0].address, amount, expected);
    });

    it("should change Ether Balance", async () => {
      await expect(() => tokenMarket.sell(amount)).to.changeEtherBalances(
        [signers[0], tokenMarket],
        [expected, expected.mul(-1)]
      );
    });

    it("should change Token Balance", async () => {
      await expect(() => tokenMarket.sell(amount)).to.changeTokenBalances(
        testToken,
        [signers[0], tokenMarket],
        [amount.mul(-1), amount]
      );
    });
  });
});
