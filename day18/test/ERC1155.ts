import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
const { constants } = require("@openzeppelin/test-helpers");

import { ERC1155 } from "../typechain/ERC1155";
import { ERC1155Receiver } from "../typechain/ERC1155Receiver";
import { FakeERC1155Receiver } from "../typechain/FakeERC1155Receiver";

chai.use(solidity);
const { expect } = chai;

describe("ERC1155", () => {
  const URI = "test-uri";

  const INITIAL_TOKEN_IDS = [0, 1];
  const INITIAL_TOKEN_AMOUNTS = [
    ethers.BigNumber.from(1000),
    ethers.BigNumber.from(2000),
  ];
  const INITIAL_TOKEN_DATA = ethers.utils.formatBytes32String("Initial");

  let signers: SignerWithAddress[] = [];
  let erc1155: ERC1155;
  let erc1155Receiver: ERC1155Receiver;
  let fakeErc1155Receiver: FakeERC1155Receiver;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const erc1155Factory = await ethers.getContractFactory(
      "ERC1155",
      signers[0]
    );
    erc1155 = (await erc1155Factory.deploy(
      URI,
      INITIAL_TOKEN_IDS,
      INITIAL_TOKEN_AMOUNTS,
      INITIAL_TOKEN_DATA
    )) as ERC1155;

    const erc1155ReceiverFactory = await ethers.getContractFactory(
      "ERC1155Receiver",
      signers[0]
    );
    erc1155Receiver = (await erc1155ReceiverFactory.deploy()) as ERC1155Receiver;

    const fakeErc1155ReceiverFactory = await ethers.getContractFactory(
      "FakeERC1155Receiver",
      signers[0]
    );
    fakeErc1155Receiver = (await fakeErc1155ReceiverFactory.deploy()) as FakeERC1155Receiver;

    await Promise.all([
      erc1155.deployed(),
      erc1155Receiver.deployed(),
      fakeErc1155Receiver.deployed(),
    ]);

    expect(erc1155.address).to.properAddress;
    expect(erc1155Receiver.address).to.properAddress;
    expect(fakeErc1155Receiver.address).to.properAddress;
  });

  describe("uri", () => {
    it("should return", async () => {
      expect(await erc1155.uri(0)).to.eq(URI);
    });
  });

  describe("balanceOf", () => {
    it("should fail if address is zero", async () => {
      await expect(
        erc1155.balanceOf(constants.ZERO_ADDRESS, 0)
      ).to.be.revertedWith("address must not be zero");
    });

    it("should return balance", async () => {
      expect(await erc1155.balanceOf(signers[0].address, 0)).to.eq(
        INITIAL_TOKEN_AMOUNTS[0]
      );
    });
  });

  describe("balanceOfBatch", () => {
    it("should fail if length of ids and accounts are not same to each other", async () => {
      const accounts = signers.slice(0, 2).map((s) => s.address);
      const ids = new Array(5).fill(null).map((_, i) => i);
      await expect(erc1155.balanceOfBatch(accounts, ids)).to.be.revertedWith(
        "accounts and ids length mismatch"
      );
    });

    it("should fail if the zero address is contained in accounts", async () => {
      const accounts = new Array(2)
        .fill(signers[0].address)
        .concat([constants.ZERO_ADDRESS]);
      const ids = new Array(3).fill(null).map((_, i) => i);

      await expect(erc1155.balanceOfBatch(accounts, ids)).to.be.revertedWith(
        "address must not be zero"
      );
    });

    it("should return balances", async () => {
      const accounts = new Array(2).fill(signers[0].address);
      const ids = new Array(2).fill(null).map((_, i) => i);

      expect(await erc1155.balanceOfBatch(accounts, ids)).to.eql(
        INITIAL_TOKEN_AMOUNTS
      );
    });
  });

  describe("isApprovedForAll", () => {
    it("should return", async () => {
      expect(
        await erc1155.isApprovedForAll(signers[0].address, signers[1].address)
      ).to.eq(false);
    });
  });

  describe("setApprovalForAll", () => {
    it("should fail if msg.sender equals operator", async () => {
      await expect(
        erc1155.setApprovalForAll(signers[0].address, true)
      ).to.be.revertedWith("cannot set approval status for self");
    });

    it("should emit ApprovalForAll event", async () => {
      await expect(erc1155.setApprovalForAll(signers[1].address, true))
        .to.emit(erc1155, "ApprovalForAll")
        .withArgs(signers[0].address, signers[1].address, true);
    });

    it("should change approved", async () => {
      expect(
        await erc1155.isApprovedForAll(signers[0].address, signers[1].address)
      ).to.eq(false);

      await erc1155.setApprovalForAll(signers[1].address, true);

      expect(
        await erc1155.isApprovedForAll(signers[0].address, signers[1].address)
      ).to.eq(true);
    });
  });

  describe("safeTransferFrom", () => {
    const data = ethers.utils.formatBytes32String("Test Data");
    let erc1155WithAccount1: ERC1155;

    beforeEach(async () => {
      await erc1155.setApprovalForAll(signers[1].address, true);
      erc1155WithAccount1 = erc1155.connect(signers[1]);
    });

    it("should fail if to address is zero", async () => {
      await expect(
        erc1155.safeTransferFrom(
          signers[0].address,
          constants.ZERO_ADDRESS,
          0,
          100,
          data
        )
      ).to.be.revertedWith("cannot transfer to the zero address");
    });

    it("should fail if caller is not token owner nor approved", async () => {
      const erc1155WithAccount2 = erc1155.connect(signers[2]);

      await expect(
        erc1155WithAccount2.safeTransferFrom(
          signers[0].address,
          signers[1].address,
          0,
          100,
          data
        )
      ).to.be.revertedWith("caller is not owner nor approved");
    });

    it("should fail if receiver is contract and the contract doesn't implement onERC1155Received", async () => {
      await expect(
        erc1155WithAccount1.safeTransferFrom(
          signers[0].address,
          fakeErc1155Receiver.address,
          0,
          100,
          data
        )
      ).to.be.revertedWith("transfer to non ERC1155 Receiver implementer");
    });

    it("should success when receiver is EOA", async () => {
      await expect(
        erc1155WithAccount1.safeTransferFrom(
          signers[0].address,
          signers[2].address,
          0,
          100,
          data
        )
      ).not.to.be.reverted;
    });

    it("should success when receiver is contract that implements onERC1155Received", async () => {
      await expect(
        erc1155WithAccount1.safeTransferFrom(
          signers[0].address,
          erc1155Receiver.address,
          0,
          100,
          data
        )
      ).not.to.be.reverted;
    });

    it("should emit TransferSignal event", async () => {
      await expect(
        erc1155WithAccount1.safeTransferFrom(
          signers[0].address,
          signers[2].address,
          0,
          100,
          data
        )
      )
        .to.emit(erc1155, "TransferSingle")
        .withArgs(
          signers[1].address,
          signers[0].address,
          signers[2].address,
          0,
          100
        );
    });

    it("should change token balances", async () => {
      const [oldTokenBalance0, oldTokenBalance1] = await Promise.all([
        erc1155.balanceOf(signers[0].address, 0),
        erc1155.balanceOf(signers[1].address, 0),
      ]);

      await erc1155.safeTransferFrom(
        signers[0].address,
        signers[1].address,
        0,
        100,
        data
      );

      const [newTokenBalance0, newTokenBalance1] = await Promise.all([
        erc1155.balanceOf(signers[0].address, 0),
        erc1155.balanceOf(signers[1].address, 0),
      ]);

      expect(newTokenBalance0.sub(oldTokenBalance0)).to.eq(
        ethers.BigNumber.from("-100")
      );
      expect(newTokenBalance1.sub(oldTokenBalance1)).to.eq(
        ethers.BigNumber.from(100)
      );
    });
  });

  describe("safeBatchTransferFrom", () => {
    const data = ethers.utils.formatBytes32String("Test Data");
    let erc1155WithAccount1: ERC1155;

    const ids = [0, 1];
    const amounts = [100, 200];

    beforeEach(async () => {
      await erc1155.setApprovalForAll(signers[1].address, true);
      erc1155WithAccount1 = erc1155.connect(signers[1]);
    });

    it("should fail if length of ids and accounts are not same to each other", async () => {
      const ids = [0, 1, 2].map((id) => ethers.BigNumber.from(id));
      const amounts = [1000, 2000, 3000, 4000].map((a) =>
        ethers.BigNumber.from(a)
      );

      await expect(
        erc1155.safeBatchTransferFrom(
          signers[0].address,
          signers[1].address,
          ids,
          amounts,
          data
        )
      ).to.be.revertedWith("ids and amounts length mismatch");
    });

    it("should fail if to address is zero", async () => {
      await expect(
        erc1155.safeBatchTransferFrom(
          signers[0].address,
          constants.ZERO_ADDRESS,
          ids,
          amounts,
          data
        )
      ).to.be.revertedWith("cannot transfer to the zero address");
    });

    it("should fail if caller is not token owner nor approved", async () => {
      const erc1155WithAccount2 = erc1155.connect(signers[2]);

      await expect(
        erc1155WithAccount2.safeBatchTransferFrom(
          signers[0].address,
          signers[1].address,
          ids,
          amounts,
          data
        )
      ).to.be.revertedWith("caller is not owner nor approved");
    });

    it("should fail if receiver is contract and the contract doesn't implement onERC1155Received", async () => {
      await expect(
        erc1155WithAccount1.safeBatchTransferFrom(
          signers[0].address,
          fakeErc1155Receiver.address,
          ids,
          amounts,
          data
        )
      ).to.be.revertedWith("transfer to non ERC1155 Receiver implementer");
    });

    it("should success when receiver is EOA", async () => {
      await expect(
        erc1155WithAccount1.safeBatchTransferFrom(
          signers[0].address,
          signers[2].address,
          ids,
          amounts,
          data
        )
      ).not.to.be.reverted;
    });

    it("should success when receiver is contract that implements onERC1155Received", async () => {
      await expect(
        erc1155WithAccount1.safeBatchTransferFrom(
          signers[0].address,
          erc1155Receiver.address,
          ids,
          amounts,
          data
        )
      ).not.to.be.reverted;
    });

    it("should emit TransferSignal event", async () => {
      await expect(
        erc1155WithAccount1.safeBatchTransferFrom(
          signers[0].address,
          signers[2].address,
          ids,
          amounts,
          data
        )
      )
        .to.emit(erc1155, "TransferBatch")
        .withArgs(
          signers[1].address,
          signers[0].address,
          signers[2].address,
          ids,
          amounts
        );
    });

    it("should change token balances", async () => {
      const [
        oldTokenBalancesForAccount1,
        oldTokenBalancesForAccount2,
      ] = await Promise.all([
        Promise.all(ids.map((id) => erc1155.balanceOf(signers[0].address, id))),
        Promise.all(ids.map((id) => erc1155.balanceOf(signers[1].address, id))),
      ]);

      await erc1155.safeBatchTransferFrom(
        signers[0].address,
        signers[1].address,
        ids,
        amounts,
        data
      );

      const [
        newTokenBalancesForAccount1,
        newTokenBalancesForAccount2,
      ] = await Promise.all([
        Promise.all(ids.map((id) => erc1155.balanceOf(signers[0].address, id))),
        Promise.all(ids.map((id) => erc1155.balanceOf(signers[1].address, id))),
      ]);

      for (const index in amounts) {
        const oldBalanceOfAccount1 = oldTokenBalancesForAccount1[index];
        const newBalanceOfAccount1 = newTokenBalancesForAccount1[index];
        const diff1 = newBalanceOfAccount1.sub(oldBalanceOfAccount1);
        const expected1 = ethers.BigNumber.from(amounts[index]).mul(-1);

        expect(diff1).to.eq(expected1);

        const oldBalanceOfAccount2 = oldTokenBalancesForAccount2[index];
        const newBalanceOfAccount2 = newTokenBalancesForAccount2[index];
        const diff2 = newBalanceOfAccount2.sub(oldBalanceOfAccount2);
        const expected2 = ethers.BigNumber.from(amounts[index]);
        expect(diff2).to.eq(expected2);
      }
    });
  });
});
