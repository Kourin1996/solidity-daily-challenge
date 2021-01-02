import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { Ballot } from "../typechain/Ballot";

chai.use(solidity);
const { expect } = chai;

const PROPOSALS = ["Proposal1", "Proposal2", "Proposal3"].map((n) =>
  ethers.utils.formatBytes32String(n)
);

describe("Ballot", () => {
  let ballot: Ballot;

  beforeEach(async () => {
    const [account] = await ethers.getSigners();
    const ballotFactory = await ethers.getContractFactory("Ballot", account);
    ballot = (await ballotFactory.deploy(PROPOSALS)) as Ballot;
    await ballot.deployed();

    expect(ballot.address).to.properAddress;
  });

  describe("close", () => {
    it("should success", async () => {
      await expect(ballot.close()).to.emit(ballot, "Close");
    });

    it("should fail from 2nd time", async () => {
      await ballot.close();
      await expect(ballot.close()).to.be.reverted;
    });

    it("should fail if address other than chairperson call", async () => {
      const [_chairperson, otherAccount] = await ethers.getSigners();

      const ballotWithSigner = ballot.connect(otherAccount);
      await expect(ballotWithSigner.close()).to.be.reverted;
    });
  });

  describe("giveRightToVote", () => {
    it("should fail if address other than chairperson call", async () => {
      const [_chairperson, account1, account2] = await ethers.getSigners();

      const ballotWithAccount1 = ballot.connect(account1);
      await expect(ballotWithAccount1.giveRightToVote(account2.address)).to.be
        .reverted;
    });

    it("should fail if closed", async () => {
      const [_chairperson, account1] = await ethers.getSigners();
      await ballot.close();
      await expect(ballot.giveRightToVote(account1.address)).to.be.reverted;
    });

    it("should fail if account has given right", async () => {
      const [_chairperson, account1] = await ethers.getSigners();

      await ballot.giveRightToVote(account1.address);

      await expect(ballot.giveRightToVote(account1.address)).to.be.reverted;
    });

    it("should fail if account has voted", async () => {
      const [_chairperson, account1] = await ethers.getSigners();

      await ballot.giveRightToVote(account1.address);

      const ballotWithAccount1 = ballot.connect(account1);
      await ballotWithAccount1.vote(1);

      await expect(ballot.giveRightToVote(account1.address)).to.be.reverted;
    });
  });

  describe("delegate", async () => {
    it("should fail if closed", async () => {
      const [_chairperson, account1, account2] = await ethers.getSigners();
      await ballot.close();
      const ballotWithAccount1 = ballot.connect(account1);
      await expect(ballotWithAccount1.delegate(account2.address)).to.be
        .reverted;
    });

    it("should fail if account has already voted", async () => {
      const [_chairperson, account1, account2] = await ethers.getSigners();

      await ballot.giveRightToVote(account1.address);

      const ballotWithAccount1 = ballot.connect(account1);
      await ballotWithAccount1.vote(1);
      await expect(ballotWithAccount1.delegate(account2.address)).to.be
        .reverted;
    });

    it("should fail if self-delegation", async () => {
      const [_chairperson, account1] = await ethers.getSigners();
      const ballotWithAccount1 = ballot.connect(account1);

      await expect(ballotWithAccount1.delegate(account1.address)).to.be
        .reverted;
    });

    it("should emit event in succeeded", async () => {
      const [_chairperson, account1, account2] = await ethers.getSigners();
      const ballotWithAccount1 = ballot.connect(account1);

      await expect(ballotWithAccount1.delegate(account2.address)).to.emit(
        ballot,
        "Delegate"
      );
    });
  });

  it("vote", async () => {
    it("should fail if closed", async () => {
      const [_chairperson, account1] = await ethers.getSigners();
      await ballot.close();
      const ballotWithAccount1 = ballot.connect(account1);
      await expect(ballotWithAccount1.vote(0)).to.be.reverted;
    });

    it("should fail if account has no right", async () => {
      const [_chairperson, account1] = await ethers.getSigners();
      const ballotWithAccount1 = ballot.connect(account1);
      await expect(ballotWithAccount1.vote(0)).to.be.reverted;
    });

    it("should fail if account has already voted", async () => {
      const [_chairperson, account1] = await ethers.getSigners();

      await ballot.giveRightToVote(account1.address);

      const ballotWithAccount1 = ballot.connect(account1);
      await ballotWithAccount1.vote(0);
      await expect(ballotWithAccount1.vote(0)).to.be.reverted;
    });

    it("should emit event in succeeded", async () => {
      const [_chairperson, account1, account2] = await ethers.getSigners();
      await ballot.giveRightToVote(account1.address);

      const ballotWithAccount1 = ballot.connect(account1);
      await expect(ballotWithAccount1.vote(0)).to.emit(ballot, "Vote");
    });
  });

  it("winningProposal", async () => {
    it("should fail if not closed", async () => {
      await expect(ballot.winningProposal()).to.be.reverted;
    });

    it("should return 0 as default", async () => {
      await ballot.close();
      await expect(ballot.winningProposal()).to.eq(0);
    });

    it("should return the index of winner", async () => {
      const [_chairperson, account1] = await ethers.getSigners();

      await ballot.giveRightToVote(account1.address);

      const ballotWithAccount1 = ballot.connect(account1);
      await ballotWithAccount1.vote(1);

      await ballot.close();
      await expect(ballot.winningProposal()).to.eq(1);
    });
  });

  it("winnerName", async () => {
    it("should fail if not closed", async () => {
      await expect(ballot.winnerName()).to.be.reverted;
    });

    it("should return 0 as default", async () => {
      await ballot.close();
      await expect(ballot.winnerName()).to.eq(PROPOSALS[0]);
    });

    it("should return the index of winner", async () => {
      const [_chairperson, account1] = await ethers.getSigners();

      await ballot.giveRightToVote(account1.address);

      const ballotWithAccount1 = ballot.connect(account1);
      await ballotWithAccount1.vote(1);

      await ballot.close();
      await expect(ballot.winnerName()).to.eq(PROPOSALS[1]);
    });
  });
});
