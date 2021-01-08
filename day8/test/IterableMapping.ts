import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { IterableMapping } from "../typechain/IterableMapping";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.use(solidity);
const { expect } = chai;

describe("IterableMapping", () => {
  let iterableMapping: IterableMapping;
  let signers: SignerWithAddress[] = [];

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const iterableMappingFactory = await ethers.getContractFactory(
      "IterableMapping",
      signers[0]
    );

    iterableMapping = (await iterableMappingFactory.deploy()) as IterableMapping;
    await iterableMapping.deployed();

    expect(iterableMapping.address).to.properAddress;
  });

  describe("set", () => {
    it("should success and put into empty space", async () => {
      const key = ethers.utils.ripemd160(
        ethers.utils.formatBytes32String("test")
      );
      await expect(iterableMapping.set(key, 100)).not.to.be.reverted;
    });

    it("should success and put into existed space", async () => {
      const key = ethers.utils.ripemd160(
        ethers.utils.formatBytes32String("test")
      );
      await iterableMapping.set(key, 200);
      await expect(iterableMapping.set(key, 100)).not.to.be.reverted;
    });
  });

  describe("get", async () => {
    const key = ethers.utils.ripemd160(
      ethers.utils.formatBytes32String("test")
    );

    it("should return data", async () => {
      const value = 254;
      await iterableMapping.set(key, value);
      expect(await iterableMapping.get(key)).to.eq(value);
    });

    it("should return zero for empty", async () => {
      expect(await iterableMapping.get(key)).to.eq(0);
    });
  });

  describe("getKeyAtIndex", async () => {
    const key1 = ethers.utils.ripemd160(
      ethers.utils.formatBytes32String("test1")
    );
    const key2 = ethers.utils.ripemd160(
      ethers.utils.formatBytes32String("test2")
    );

    beforeEach(async () => {
      const value = 254;
      await iterableMapping.set(key1, value);
      await iterableMapping.set(key2, value);
    });

    it("should return key1", async () => {
      const key = await iterableMapping.getKeyAtIndex(0);
      expect(key.toLowerCase()).to.eq(key1);
    });

    it("should return key2", async () => {
      const key = await iterableMapping.getKeyAtIndex(1);
      expect(key.toLowerCase()).to.eq(key2);
    });
  });

  describe("getKeyAtIndex", async () => {
    const key1 = ethers.utils.ripemd160(
      ethers.utils.formatBytes32String("test1")
    );
    const key2 = ethers.utils.ripemd160(
      ethers.utils.formatBytes32String("test2")
    );
    const key3 = ethers.utils.ripemd160(
      ethers.utils.formatBytes32String("test3")
    );

    beforeEach(async () => {
      const value = 254;
      await iterableMapping.set(key1, value);
      await iterableMapping.set(key2, value);
      await iterableMapping.set(key3, value);
    });

    it("should success", async () => {
      await expect(iterableMapping.remove(key1)).not.to.be.reverted;
    });

    it("should swap index", async () => {
      await iterableMapping.remove(key1);

      const key = await iterableMapping.getKeyAtIndex(0);
      expect(key.toLowerCase()).to.eq(key3);
    });
  });
});
