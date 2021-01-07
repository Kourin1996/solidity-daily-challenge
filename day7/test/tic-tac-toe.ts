import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { TicTacToe } from "../typechain/TicTacToe";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.use(solidity);
const { expect } = chai;

describe("TicTacToe", () => {
  let ticTacToe: TicTacToe;
  let signers: SignerWithAddress[] = [];

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const blindAuctionFactory = await ethers.getContractFactory(
      "TicTacToe",
      signers[0]
    );

    ticTacToe = (await blindAuctionFactory.deploy()) as TicTacToe;
    await ticTacToe.deployed();

    expect(ticTacToe.address).to.properAddress;
  });

  describe("create", () => {
    const size = 3;
    const deposit = ethers.utils.parseEther("1");

    it("should success", async () => {
      expect(
        ticTacToe.create(size, {
          value: deposit,
        })
      ).to.emit(ticTacToe, "Create");
    });

    it("should emit create Event", async () => {
      const tx = await ticTacToe.create(size, {
        value: deposit,
      });
      const data = await tx.wait();

      expect(data.events).to.exist;
      expect(data.events).to.have.lengthOf(1);
      expect(data.events![0].args).to.exist;
      expect(data.events![0].args).to.have.lengthOf(3);
      expect(data.events![0].args![1]).to.eq(signers[0].address);
      expect(data.events![0].args![2]).to.eq(size);
    });
  });

  describe("join", () => {
    const size = 3;
    const deposit = ethers.utils.parseEther("1");
    let gameAddress: string = "";

    beforeEach(async () => {
      const tx = await ticTacToe.create(size, {
        value: deposit,
      });
      const data = await tx.wait();
      gameAddress = data.events![0].args![0];
    });

    it("should fail if game doesn't exist", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);
      const fakeGameAddress = ethers.utils.formatBytes32String("fake");

      expect(
        ticTacToeWithContract2.join(fakeGameAddress, {
          value: deposit,
        })
      ).to.be.reverted;
    });

    it("should fail in game where both of players is ready", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);
      const ticTacToeWithContract3 = ticTacToe.connect(signers[2]);

      await ticTacToeWithContract2.join(gameAddress, {
        value: deposit,
      });
      expect(
        ticTacToeWithContract3.join(gameAddress, {
          value: deposit,
        })
      ).to.be.reverted;
    });

    it("should success", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);

      expect(
        ticTacToeWithContract2.join(gameAddress, {
          value: deposit,
        })
      )
        .emit(ticTacToe, "Join")
        .withArgs(gameAddress, signers[1].address);
    });
  });

  describe("put", () => {
    const size = 3;
    const deposit = ethers.utils.parseEther("1");
    let gameAddress: string = "";

    beforeEach(async () => {
      const tx = await ticTacToe.create(size, {
        value: deposit,
      });
      const data = await tx.wait();
      gameAddress = data.events![0].args![0];

      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);
      await ticTacToeWithContract2.join(gameAddress, {
        value: deposit,
      });
    });

    it("should fail if other player try to put", async () => {
      const ticTacToeWithContract3 = ticTacToe.connect(signers[2]);
      await expect(ticTacToeWithContract3.put(gameAddress, 0, 0)).to.be
        .reverted;
    });

    it("should fail if the turn is not player's", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);
      await expect(ticTacToeWithContract2.put(gameAddress, 0, 0)).to.be
        .reverted;
    });

    it("should fail if the game is over", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);

      await ticTacToe.put(gameAddress, 0, 0);
      await ticTacToeWithContract2.put(gameAddress, 1, 0);
      await ticTacToe.put(gameAddress, 0, 1);
      await ticTacToeWithContract2.put(gameAddress, 1, 1);
      await ticTacToe.put(gameAddress, 0, 2);
      await expect(ticTacToeWithContract2.put(gameAddress, 1, 2)).to.be
        .reverted;
    });

    it("should fail if the player try to put in out of field", async () => {
      await expect(ticTacToe.put(gameAddress, size + 5, size + 4)).to.be
        .reverted;
    });

    it("should fail if the player try to put the filled square", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);
      await ticTacToe.put(gameAddress, 0, 0);
      await expect(ticTacToeWithContract2.put(gameAddress, 0, 0)).to.be
        .reverted;
    });

    it("should success and emit Put event", async () => {
      await expect(ticTacToe.put(gameAddress, 0, 0))
        .to.emit(ticTacToe, "Put")
        .withArgs(gameAddress, signers[0].address, 1, 0, 0);
    });

    it("should success and End event", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);

      await ticTacToe.put(gameAddress, 0, 0);
      await ticTacToeWithContract2.put(gameAddress, 1, 0);
      await ticTacToe.put(gameAddress, 0, 1);
      await ticTacToeWithContract2.put(gameAddress, 1, 1);
      await expect(ticTacToe.put(gameAddress, 0, 2))
        .to.emit(ticTacToe, "End")
        .withArgs(
          gameAddress,
          signers[0].address,
          ethers.utils.parseEther("2")
        );
    });

    it("should success and End event (2)", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);

      await ticTacToe.put(gameAddress, 0, 0);
      await ticTacToeWithContract2.put(gameAddress, 1, 0);
      await ticTacToe.put(gameAddress, 0, 1);
      await ticTacToeWithContract2.put(gameAddress, 1, 1);
      await ticTacToe.put(gameAddress, 2, 0);
      await expect(ticTacToeWithContract2.put(gameAddress, 1, 2))
        .to.emit(ticTacToe, "End")
        .withArgs(
          gameAddress,
          signers[1].address,
          ethers.utils.parseEther("2")
        );
    });

    it("should success and End event (3)", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);

      await ticTacToe.put(gameAddress, 0, 0);
      await ticTacToeWithContract2.put(gameAddress, 2, 0);
      await ticTacToe.put(gameAddress, 1, 1);
      await ticTacToeWithContract2.put(gameAddress, 2, 1);
      await expect(ticTacToe.put(gameAddress, 2, 2))
        .to.emit(ticTacToe, "End")
        .withArgs(
          gameAddress,
          signers[0].address,
          ethers.utils.parseEther("2")
        );
    });

    it("should success and End event (4)", async () => {
      const ticTacToeWithContract2 = ticTacToe.connect(signers[1]);

      await ticTacToe.put(gameAddress, 0, 2);
      await ticTacToeWithContract2.put(gameAddress, 2, 1);
      await ticTacToe.put(gameAddress, 1, 1);
      await ticTacToeWithContract2.put(gameAddress, 2, 2);
      await expect(ticTacToe.put(gameAddress, 2, 0))
        .to.emit(ticTacToe, "End")
        .withArgs(
          gameAddress,
          signers[0].address,
          ethers.utils.parseEther("2")
        );
    });
  });
});
