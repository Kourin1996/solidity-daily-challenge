import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ERC948 } from "../typechain/ERC948";
import { ERC20 } from "../typechain/ERC20";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BytesLike } from "ethers";

chai.use(solidity);
const { expect } = chai;

describe("ERC948", () => {
  const INITIAL_SUPPLY = 100000;

  let erc948: ERC948;
  let erc20: ERC20;
  let signers: SignerWithAddress[] = [];
  let provider: SignerWithAddress;
  let subscriber: SignerWithAddress;
  let erc20WithProvider: ERC20;
  let erc948WithProvider: ERC948;
  let erc948WithSubscriber: ERC948;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    provider = signers[0];
    subscriber = signers[1];

    const erc20Factory = await ethers.getContractFactory("TestToken", provider);
    erc20 = (await erc20Factory.deploy(INITIAL_SUPPLY)) as ERC20;

    const erc948Factory = await ethers.getContractFactory("ERC948", provider);
    erc948 = (await erc948Factory.deploy()) as ERC948;

    await Promise.all([erc20.deployed(), erc948.deployed()]);

    expect(erc20.address).to.properAddress;
    expect(erc948.address).to.properAddress;
    expect(await erc20.balanceOf(provider.address)).to.eq(INITIAL_SUPPLY);

    erc20WithProvider = erc20.connect(provider);
    erc948WithProvider = erc948.connect(provider);
    erc948WithSubscriber = erc948.connect(subscriber);
  });

  describe("subscribe", () => {
    const INITIAL_PAYMENT = 1000;
    const PAYMENT_PER_PERIOD = 100;
    const PERIOD = 86400 * 7; // 1 week
    const START_TIME_OFFSET = 86400;
    let startTime = 0;

    beforeEach(async () => {
      const currentBlock = await ethers.provider.getBlock(
        await ethers.provider.getBlockNumber()
      );
      const timestamp = currentBlock.timestamp;
      startTime = timestamp + START_TIME_OFFSET;
    });

    it("should fail if token address is zero", async () => {
      await expect(
        erc948WithSubscriber.subscribe(
          ethers.utils.hexlify(new Array(20).fill(0)),
          INITIAL_PAYMENT,
          PAYMENT_PER_PERIOD,
          PERIOD,
          startTime
        )
      ).to.be.revertedWith("Token Address must not be zero");
    });

    it("should fail if initial payment per period is zero", async () => {
      await expect(
        erc948WithSubscriber.subscribe(
          erc20.address,
          INITIAL_PAYMENT,
          0,
          PERIOD,
          startTime
        )
      ).to.be.revertedWith(
        "Payment Amount per period must be positive integer"
      );
    });

    it("should fail if period is zero", async () => {
      await expect(
        erc948WithSubscriber.subscribe(
          erc20.address,
          INITIAL_PAYMENT,
          PAYMENT_PER_PERIOD,
          0,
          startTime
        )
      ).to.be.revertedWith("Period must be positive number");
    });

    it("should fail if start time is in the past", async () => {
      await expect(
        erc948WithSubscriber.subscribe(
          erc20.address,
          INITIAL_PAYMENT,
          PAYMENT_PER_PERIOD,
          PERIOD,
          startTime - 86400 * 7
        )
      ).to.be.reverted;
    });

    it("should fail if subscriber doesn't have enough balance in ERC20", async () => {
      await expect(
        erc948WithSubscriber.subscribe(
          erc20.address,
          INITIAL_PAYMENT,
          PAYMENT_PER_PERIOD,
          PERIOD,
          startTime
        )
      ).to.be.reverted;
    });

    it("should fail if subscriber doesn't have enough allowance for provider in ERC20", async () => {
      const requiredAmount = INITIAL_PAYMENT + PAYMENT_PER_PERIOD;
      await erc20WithProvider.transfer(subscriber.address, requiredAmount);

      await expect(
        erc948WithSubscriber.subscribe(
          erc20.address,
          INITIAL_PAYMENT,
          PAYMENT_PER_PERIOD,
          PERIOD,
          startTime
        )
      ).to.be.reverted;
    });

    it("should success", async () => {
      const requiredAmount = INITIAL_PAYMENT + PAYMENT_PER_PERIOD;
      await erc20WithProvider.transfer(subscriber.address, requiredAmount);

      const erc20WithSubscriber = erc20.connect(subscriber);
      await erc20WithSubscriber.approve(erc948.address, requiredAmount);

      await expect(
        erc948WithSubscriber.subscribe(
          erc20.address,
          INITIAL_PAYMENT,
          PAYMENT_PER_PERIOD,
          PERIOD,
          startTime
        )
      ).to.emit(erc948, "NewSubscription");
    });
  });

  describe("unsubscribe", () => {
    const INITIAL_PAYMENT = 1000;
    const PAYMENT_PER_PERIOD = 100;
    const PERIOD = 86400 * 7; // 1 week
    const START_TIME = Math.floor(new Date().getTime() / 1000) + 86400;
    let subscriptionId: BytesLike;

    beforeEach(async () => {
      const requiredAmount = INITIAL_PAYMENT + PAYMENT_PER_PERIOD;
      await erc20WithProvider.transfer(subscriber.address, requiredAmount);

      const erc20WithSubscriber = erc20.connect(subscriber);
      await erc20WithSubscriber.approve(erc948.address, requiredAmount);

      const tx = await erc948WithSubscriber.subscribe(
        erc20.address,
        INITIAL_PAYMENT,
        PAYMENT_PER_PERIOD,
        PERIOD,
        START_TIME
      );
      const result = await tx.wait();
      const newSubscriptionEvent = (result.events || []).find(
        (e) => e.event === "NewSubscription"
      );
      subscriptionId = newSubscriptionEvent
        ? (newSubscriptionEvent.args || [])[0]
        : "";
    });

    it("should fail for non-exist subscription", async () => {
      await expect(
        erc948WithSubscriber.unsubscribe(
          ethers.utils.hexlify(new Array(32).fill(0))
        )
      ).to.be.revertedWith("Subscription doesn't exist");
    });

    it("should fail if the account other than the subscriber calls", async () => {
      const erc948WithOtherAccount = erc948.connect(signers[2]);
      await expect(
        erc948WithOtherAccount.unsubscribe(subscriptionId)
      ).to.be.revertedWith("Only subscriber can unsubscribe");
    });

    it("should success", async () => {
      await expect(erc948WithSubscriber.unsubscribe(subscriptionId)).not.to.be
        .reverted;
    });
  });

  describe("processSubscription", () => {
    const INITIAL_PAYMENT = 1000;
    const PAYMENT_PER_PERIOD = 100;
    const PERIOD = 86400 * 7; // 1 week
    let START_TIME_OFFSET = 86400;
    let subscriptionId: BytesLike;

    beforeEach(async () => {
      await ethers.provider.send("evm_mine", []);

      const currentBlock = await ethers.provider.getBlock(
        await ethers.provider.getBlockNumber()
      );
      const timestamp = currentBlock.timestamp;

      const requiredAmount = INITIAL_PAYMENT + PAYMENT_PER_PERIOD;
      await erc20WithProvider.transfer(subscriber.address, requiredAmount);

      const erc20WithSubscriber = erc20.connect(subscriber);
      await erc20WithSubscriber.approve(erc948.address, requiredAmount);

      const startTime = timestamp + START_TIME_OFFSET;
      const tx = await erc948WithSubscriber.subscribe(
        erc20.address,
        INITIAL_PAYMENT,
        PAYMENT_PER_PERIOD,
        PERIOD,
        startTime
      );
      const result = await tx.wait();
      const newSubscriptionEvent = (result.events || []).find(
        (e) => e.event === "NewSubscription"
      );
      subscriptionId = newSubscriptionEvent
        ? (newSubscriptionEvent.args || [])[0]
        : "";
    });

    it("should fail if the account other than provider calls", async () => {
      const erc948WithOtherAccount = erc948.connect(signers[2]);
      await expect(
        erc948WithOtherAccount.processSubscription(subscriptionId)
      ).to.be.revertedWith("Only service provider can call");
    });

    it("should fail for non exist subscription", async () => {
      await expect(
        erc948WithProvider.processSubscription(
          ethers.utils.hexlify(new Array(32).fill(0))
        )
      ).to.be.revertedWith("Subscription doesn't exist");
    });

    it("should fail if subscription has not started", async () => {
      await expect(
        erc948WithProvider.processSubscription(subscriptionId)
      ).to.be.revertedWith("Subscription has not started yet");
    });

    it("should fail if next payment has not reached", async () => {
      await ethers.provider.send("evm_increaseTime", [86400 * 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        erc948WithProvider.processSubscription(subscriptionId)
      ).to.be.revertedWith("Next payment has not reached now");
    });

    it("should success", async () => {
      await ethers.provider.send("evm_increaseTime", [86400 * 8]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        erc948WithProvider.processSubscription(subscriptionId)
      ).to.emit(erc948, "ProcessedSubscription");
    });

    it("should receive tokens", async () => {
      await ethers.provider.send("evm_increaseTime", [86400 * 8]);
      await ethers.provider.send("evm_mine", []);

      await expect(() =>
        erc948WithProvider.processSubscription(subscriptionId)
      ).to.changeTokenBalance(erc20, provider, PAYMENT_PER_PERIOD);
    });
  });
});
