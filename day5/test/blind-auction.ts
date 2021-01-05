import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { BlindAuction } from "../typechain/BlindAuction";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

const { time } = require("@openzeppelin/test-helpers");

chai.use(solidity);
const { expect } = chai;

describe("BlindAuction", () => {
  let blindAuction: BlindAuction;
  let signers: SignerWithAddress[] = [];

  const biddingTime = 60 * 1000;
  const revealTime = 60 * 1000;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const blindAuctionFactory = await ethers.getContractFactory(
      "BlindAuction",
      signers[0]
    );

    blindAuction = (await blindAuctionFactory.deploy(
      biddingTime,
      revealTime,
      signers[0].address
    )) as BlindAuction;
    await blindAuction.deployed();

    expect(blindAuction.address).to.properAddress;
  });

  describe("bid", async () => {
    const value = ethers.BigNumber.from(1000).toNumber();
    const fake = false;
    const secret = ethers.utils.formatBytes32String("secret");
    const blindedBid = ethers.utils.solidityKeccak256(
      ["uint256", "bool", "bytes32"],
      [value, fake, secret]
    );
    const amount = ethers.utils.parseEther("1");

    it("should fail after biddingTime", async () => {
      ethers.provider.send("evm_increaseTime", [70 * 1000]);
      ethers.provider.send("evm_mine", []);

      await expect(
        blindAuction.bid(blindedBid, {
          value: amount,
        })
      ).to.be.reverted;
    });

    it("should success", async () => {
      ethers.provider.send("evm_increaseTime", [30 * 1000]);
      ethers.provider.send("evm_mine", []);

      await blindAuction.bid(blindedBid, {
        value: amount,
      });
    });
  });

  describe("reveal", () => {
    const num = 3;
    const values = [3000, 2000, 1000];
    const fakes = [true, false, true];
    const secrets = ["secret1", "secret2", "secret3"];
    const secretBytes = secrets.map((s) => ethers.utils.formatBytes32String(s));
    const amounts = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    beforeEach(async () => {
      for (let i = 0; i < num; ++i) {
        const value = ethers.BigNumber.from(values[i]).toNumber();
        const fake = fakes[i];
        const secret = ethers.utils.formatBytes32String(secrets[i]);
        const amount = amounts[i];
        const blindedBid = ethers.utils.solidityKeccak256(
          ["uint256", "bool", "bytes32"],
          [value, fake, secret]
        );
        await blindAuction.bid(blindedBid, {
          value: amount,
        });
      }
    });

    it("should fail if reveal time doesn't begin yet", async () => {
      ethers.provider.send("evm_increaseTime", [30 * 1000]);
      ethers.provider.send("evm_mine", []);

      await expect(blindAuction.reveal(values, fakes, secretBytes)).to.be
        .reverted;
    });

    it("should fail if reveal time has ended already", async () => {
      ethers.provider.send("evm_increaseTime", [140 * 1000]);
      ethers.provider.send("evm_mine", []);

      await expect(blindAuction.reveal(values, fakes, secretBytes)).to.be
        .reverted;
    });

    it("should success", async () => {
      ethers.provider.send("evm_increaseTime", [70 * 1000]);
      ethers.provider.send("evm_mine", []);

      await expect(blindAuction.reveal(values, fakes, secretBytes)).not.to.be
        .reverted;
    });
  });

  describe("withdraw", () => {
    it("should success", async () => {
      ethers.provider.send("evm_increaseTime", [30 * 1000]);
      ethers.provider.send("evm_mine", []);

      await expect(blindAuction.withdraw()).not.to.be.reverted;
    });
  });

  describe("auctionEnd", () => {
    it("should fail", async () => {
      ethers.provider.send("evm_increaseTime", [70 * 1000]);
      ethers.provider.send("evm_mine", []);

      await expect(blindAuction.auctionEnd()).to.be.reverted;
    });

    it("should success", async () => {
      ethers.provider.send("evm_increaseTime", [130 * 1000]);
      ethers.provider.send("evm_mine", []);

      await expect(blindAuction.auctionEnd()).to.emit(
        blindAuction,
        "AuctionEnded"
      );
    });

    it("should fail after 2nd time", async () => {
      ethers.provider.send("evm_increaseTime", [130 * 1000]);
      ethers.provider.send("evm_mine", []);

      await blindAuction.auctionEnd();
      await expect(blindAuction.auctionEnd()).to.be.reverted;
    });
  });
});
