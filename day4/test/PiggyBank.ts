import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { PiggyBank } from "../typechain/PiggyBank";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.use(solidity);
const { expect } = chai;

describe("PiggyBank", () => {
  let piggyBank: PiggyBank;
  let signers: SignerWithAddress[] = [];

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const piggyBankFactory = await ethers.getContractFactory(
      "PiggyBank",
      signers[0]
    );

    piggyBank = (await piggyBankFactory.deploy()) as PiggyBank;
    await piggyBank.deployed();

    expect(piggyBank.address).to.properAddress;
  });

  describe("create", () => {
    it("should success", async () => {
      await expect(piggyBank.create(5000)).to.emit(piggyBank, "Create");
    });

    it("should emit create event", async () => {
      const goalAmount = 2000;
      const tx = await piggyBank.create(goalAmount);

      const res = await tx.wait();
      const events = res.events ?? [];
      const createEvent = events.find((e) => e.event === "Create");

      expect(createEvent).is.not.undefined;
      expect(createEvent!.args).is.not.undefined;
      expect(createEvent!.args!.length).is.greaterThan(2);
    });

    it("should set goal amount", async () => {
      const goalAmount = 2000;
      const tx = await piggyBank.create(goalAmount);

      const res = await tx.wait();
      const events = res.events ?? [];
      const createEvent = events.find((e) => e.event === "Create");
      const id = createEvent!.args![0];

      expect(await piggyBank.getGoalAmount(id)).to.equal(goalAmount);
    });

    it("should set 0 in currentBalance", async () => {
      const goalAmount = 2000;
      const tx = await piggyBank.create(goalAmount);

      const res = await tx.wait();
      const events = res.events ?? [];
      const createEvent = events.find((e) => e.event === "Create");
      const id = createEvent!.args![0];

      expect(await piggyBank.getBalance(id)).to.equal(0);
    });
  });

  describe("deposit", () => {
    const goalAmount = ethers.utils.parseEther("5");
    let id: string = "";
    beforeEach(async () => {
      const tx = await piggyBank.create(goalAmount);
      const res = await tx.wait();
      const events = res.events ?? [];
      const createEvent = events.find((e) => e.event === "Create");
      id = createEvent!.args![0];
    });

    it("should fail if account doesn't exist", async () => {
      const amount = ethers.utils.parseEther("1");
      await expect(
        piggyBank.deposit("0x0", {
          value: amount,
        })
      ).to.be.reverted;
    });

    it("should success and emit Deposit event", async () => {
      const amount = ethers.utils.parseEther("1");
      await expect(
        piggyBank.deposit(id, {
          value: amount,
        })
      )
        .to.emit(piggyBank, "Deposit")
        .withArgs(id, amount);
    });

    it("should update balance", async () => {
      const amount = ethers.utils.parseEther("1");
      const tx = await piggyBank.deposit(id, {
        value: amount,
      });
      await tx.wait();

      expect(await piggyBank.getBalance(id)).to.eq(amount);
    });
  });

  describe("withdraw", () => {
    const goalAmount = ethers.utils.parseEther("5");
    let id: string = "";
    beforeEach(async () => {
      const tx = await piggyBank.create(goalAmount);
      const res = await tx.wait();
      const events = res.events ?? [];
      const createEvent = events.find((e) => e.event === "Create");
      id = createEvent!.args![0];
    });

    it("should fail if account doesn't exist", async () => {
      const depositedAmount = ethers.utils.parseEther("5");
      const withdrawAmount = ethers.utils.parseEther("1");

      const tx = await piggyBank.deposit(id, {
        value: depositedAmount,
      });
      await tx.wait();

      await expect(piggyBank.withdraw("0x0", withdrawAmount)).to.be.reverted;
    });

    it("should fail if account doesn't reach goal", async () => {
      const depositedAmount = ethers.utils.parseEther("4");
      const withdrawAmount = ethers.utils.parseEther("2");

      const tx = await piggyBank.deposit(id, {
        value: depositedAmount,
      });
      await tx.wait();

      await expect(piggyBank.withdraw(id, withdrawAmount)).to.be.reverted;
    });

    it("should fail if the account rather than owner withdraw", async () => {
      const depositedAmount = ethers.utils.parseEther("5");
      const withdrawAmount = ethers.utils.parseEther("2");

      const tx = await piggyBank.deposit(id, {
        value: depositedAmount,
      });
      await tx.wait();

      const piggyBankWithAccounts = piggyBank.connect(signers[1]);
      await expect(piggyBankWithAccounts.withdraw(id, withdrawAmount)).to.be
        .reverted;
    });

    it("should success and emit Withdraw event", async () => {
      const depositedAmount = ethers.utils.parseEther("10");
      const withdrawAmount = ethers.utils.parseEther("5");
      const remainingAmount = ethers.utils.parseEther("5");

      const tx = await piggyBank.deposit(id, {
        value: depositedAmount,
      });
      await tx.wait();

      await expect(piggyBank.withdraw(id, withdrawAmount))
        .to.emit(piggyBank, "Withdraw")
        .withArgs(id, remainingAmount);
    });

    it("should update balance", async () => {
      const depositedAmount = ethers.utils.parseEther("10");
      const withdrawAmount = ethers.utils.parseEther("5");

      const depositTx = await piggyBank.deposit(id, {
        value: depositedAmount,
      });
      await depositTx.wait();

      const withdrawTx = await piggyBank.withdraw(id, withdrawAmount);
      await withdrawTx.wait();

      expect(await piggyBank.getBalance(id)).to.eq(withdrawAmount);
    });
  });
});
