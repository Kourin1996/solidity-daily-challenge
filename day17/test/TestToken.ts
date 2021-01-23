import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { TestToken } from "../typechain/TestToken";

chai.use(solidity);
const { expect } = chai;

describe("TestToken", () => {
  const TOKEN_NAME = "TestToken";
  const TOKEN_SYMBOL = "TT";
  const INITIAL_AMOUNT = ethers.BigNumber.from(10 ** 5);

  let signers: SignerWithAddress[] = [];

  let testToken: TestToken;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const testTokenFactory = await ethers.getContractFactory(
      "TestToken",
      signers[0]
    );
    testToken = (await testTokenFactory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      INITIAL_AMOUNT
    )) as TestToken;

    await testToken.deployed();

    expect(testToken.address).to.properAddress;
  });

  describe("name", () => {
    it("should return name", async () => {
      expect(await testToken.name()).to.eq(TOKEN_NAME);
    });
  });

  describe("symbol", () => {
    it("should return symbol", async () => {
      expect(await testToken.symbol()).to.eq(TOKEN_SYMBOL);
    });
  });

  describe("decimals", () => {
    it("should return decimals", async () => {
      expect(await testToken.decimals()).to.eq(18);
    });
  });

  describe("totalSupply", () => {
    it("should return initial amount as default", async () => {
      expect(await testToken.totalSupply()).to.eq(INITIAL_AMOUNT);
    });
  });

  describe("balanceOf", () => {
    it("should return initial amount as default balance of creator", async () => {
      expect(await testToken.balanceOf(signers[0].address)).to.eq(
        INITIAL_AMOUNT
      );
    });
  });
});
