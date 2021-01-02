import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { Calculator } from "../typechain/Calculator";

chai.use(solidity);
const { expect } = chai;

describe("Calculator", () => {
  let calculator: Calculator;

  beforeEach(async () => {
    const signers = await ethers.getSigners();

    const calculatorFactory = await ethers.getContractFactory(
      "Calculator",
      signers[0]
    );
    calculator = (await calculatorFactory.deploy()) as Calculator;
    await calculator.deployed();

    const current = await calculator.getResult();
    expect(current).to.eq(0);
    expect(calculator.address).to.properAddress;
  });

  describe("adds", async () => {
    const addedNumber = 3;

    it("should success", async () => {
      await calculator.adds(addedNumber);

      const current = await calculator.getResult();
      expect(current).to.eq(addedNumber);
    });
  });

  describe("subtracts", async () => {
    const subtractedNumber = 3;

    it("should fail", async () => {
      await expect(calculator.subtracts(subtractedNumber)).to.be.reverted;
    });

    it("should success", async () => {
      const addedNumber = 5;
      await calculator.adds(addedNumber);
      await calculator.subtracts(subtractedNumber);

      const current = await calculator.getResult();
      expect(current).to.eq(addedNumber - subtractedNumber);
    });
  });

  describe("multiplies", async () => {
    const defaultNumber = 5;
    const multipliedNumber = 3;

    beforeEach(async () => {
      await calculator.adds(defaultNumber);
    });

    it("should success", async () => {
      await calculator.multiplies(multipliedNumber);

      const current = await calculator.getResult();
      expect(current).to.eq(defaultNumber * multipliedNumber);
    });
  });

  describe("divides", async () => {
    const dividedNumber = 3;

    it("should fail", async () => {
      await expect(calculator.divides(0)).to.be.reverted;
    });

    it("should success", async () => {
      const defaultNumber = 12;
      await calculator.adds(defaultNumber);
      await calculator.divides(dividedNumber);

      const current = await calculator.getResult();
      expect(current).to.eq(defaultNumber / dividedNumber);
    });
  });
});
