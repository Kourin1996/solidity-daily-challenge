import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { Callee1 } from "../typechain/Callee1";
import { Callee2 } from "../typechain/Callee2";
import { Caller } from "../typechain/Caller";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.use(solidity);
const { expect } = chai;

describe("ERC165", () => {
  let signers: SignerWithAddress[] = [];

  let callee1: Callee1;
  let callee2: Callee2;
  let callerForCallee1: Caller;
  let callerForCallee2: Caller;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const callee1Factory = await ethers.getContractFactory(
      "Callee1",
      signers[0]
    );
    callee1 = (await callee1Factory.deploy()) as Callee1;

    const callee2Factory = await ethers.getContractFactory(
      "Callee2",
      signers[0]
    );
    callee2 = (await callee2Factory.deploy()) as Callee2;

    const callerFactory = await ethers.getContractFactory("Caller", signers[0]);
    callerForCallee1 = (await callerFactory.deploy(callee1.address)) as Caller;
    callerForCallee2 = (await callerFactory.deploy(callee2.address)) as Caller;

    await Promise.all([
      callee1.deployed(),
      callee2.deployed(),
      callerForCallee1.deployed(),
      callerForCallee2.deployed(),
    ]);

    expect(callee1.address).to.properAddress;
    expect(callee2.address).to.properAddress;
    expect(callerForCallee2.address).to.properAddress;
    expect(callerForCallee2.address).to.properAddress;
  });

  describe("Callee1", async () => {
    it("should success to call funcA(uint256)", async () => {
      const value = 1024;
      const expectedValue = value + 1000;
      expect(await callerForCallee1.callFuncA(value)).to.eq(expectedValue);
    });

    it("should success to call funcB(uint256)", async () => {
      const value = 2048;
      const expectedValue = value - 1000;
      expect(await callerForCallee1.callFuncB(value)).to.eq(expectedValue);
    });

    it("should success to call funcC(string)", async () => {
      const value = "test";
      const expectedValue = `Welcome to Callee1:${value}`;

      expect(await callerForCallee1.callFuncC(value)).to.eq(expectedValue);
    });
  });

  describe("Callee2", async () => {
    it("should success to call funcA(uint256)", async () => {
      const value = 512;
      await expect(callerForCallee2.callFuncA(value)).to.be.revertedWith(
        "Callee doesn't implement ICallee"
      );
    });

    it("should success to call funcB(uint256)", async () => {
      const value = 1050;
      await expect(callerForCallee2.callFuncB(value)).to.be.revertedWith(
        "Callee doesn't implement ICallee"
      );
    });

    it("should fail to call funcC(string)", async () => {
      const value = "test";
      await expect(callerForCallee2.callFuncC(value)).to.be.revertedWith(
        "Callee doesn't implement ICallee"
      );
    });
  });
});
