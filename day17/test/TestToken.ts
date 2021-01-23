import { ethers, web3 } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { TestToken } from "../typechain/TestToken";
import { Wallet } from "ethers";

require("@openzeppelin/test-helpers/configure")({ environment: "web3", web3 });
const { singletons } = require("@openzeppelin/test-helpers");

chai.use(solidity);
const { expect } = chai;

describe("ERC777", () => {
  const TOKEN_NAME = "ERC777Token";
  const TOKEN_SYMBOL = "ERC777";
  const CAPACITY = ethers.BigNumber.from("1" + "0".repeat(18));
  const INITIAL_AMOUNT = ethers.BigNumber.from(10 ** 5);

  let signers: SignerWithAddress[] = [];

  let testToken: TestToken;
  let erc1820: any;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const testTokenFactory = await ethers.getContractFactory(
      "TestToken",
      signers[0]
    );
    testToken = (await testTokenFactory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      CAPACITY,
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
