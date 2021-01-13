import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ERC721 } from "../typechain/ERC721";
import { ERC721TokenReceiver } from "../typechain/ERC721TokenReceiver";
import { FakeERC721TokenReceiver } from "../typechain/FakeERC721TokenReceiver";
import { NonERC721TokenReceiver } from "../typechain/NonERC721TokenReceiver";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.use(solidity);
const { expect } = chai;

describe("ERC721", () => {
  let erc721: ERC721;
  let erc721TokenReceiver: ERC721TokenReceiver;
  let fakeErc721TokenReceiver: FakeERC721TokenReceiver;
  let nonErc721TokenReceiver: NonERC721TokenReceiver;
  let signers: SignerWithAddress[] = [];

  let erc721WithAccount1: ERC721;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const erc721Factory = await ethers.getContractFactory("ERC721", signers[0]);
    erc721 = (await erc721Factory.deploy()) as ERC721;

    const erc721TokenReceiverFactory = await ethers.getContractFactory(
      "ERC721TokenReceiver",
      signers[0]
    );
    erc721TokenReceiver = (await erc721TokenReceiverFactory.deploy()) as ERC721TokenReceiver;

    const fakeErc721TokenReceiverFactory = await ethers.getContractFactory(
      "FakeERC721TokenReceiver",
      signers[0]
    );
    fakeErc721TokenReceiver = (await fakeErc721TokenReceiverFactory.deploy()) as FakeERC721TokenReceiver;

    const nonErc721TokenReceiverFactory = await ethers.getContractFactory(
      "NonERC721TokenReceiver",
      signers[0]
    );
    nonErc721TokenReceiver = (await nonErc721TokenReceiverFactory.deploy()) as NonERC721TokenReceiver;

    await Promise.all([
      erc721.deployed(),
      erc721TokenReceiver.deployed(),
      fakeErc721TokenReceiver.deployed(),
      nonErc721TokenReceiver.deployed(),
    ]);

    expect(erc721.address).to.properAddress;
    expect(erc721TokenReceiver.address).to.properAddress;
    expect(fakeErc721TokenReceiver.address).to.properAddress;
    expect(nonErc721TokenReceiver.address).to.properAddress;

    erc721WithAccount1 = erc721.connect(signers[1]);
  });

  describe("balanceOf", () => {
    it("should fail if address is zero", async () => {
      await expect(
        erc721.balanceOf(ethers.utils.hexlify(new Array(20).fill(0)))
      ).to.be.revertedWith("Address must not be zero");
    });

    it("should return zero if the account has no NFT", async () => {
      expect(await erc721.balanceOf(signers[0].address)).to.eq(0);
    });

    it("should return positive", async () => {
      await erc721.mint(signers[0].address, 0);
      await erc721.mint(signers[0].address, 1);

      expect(await erc721.balanceOf(signers[0].address)).to.eq(2);
    });
  });

  describe("ownerOf", () => {
    it("should fail for non-exist NFT", async () => {
      await expect(erc721.ownerOf(0)).to.be.revertedWith("NFT doesn't exist");
    });

    it("should success", async () => {
      await erc721.mint(signers[0].address, 0);

      expect(await erc721.ownerOf(0)).to.eq(signers[0].address);
    });
  });

  describe("safeTransferFrom(address,address,uint256,bytes)", () => {
    beforeEach(async () => {
      await erc721.mint(signers[0].address, 0);
      await erc721.mint(signers[0].address, 1);
      await erc721.mint(signers[2].address, 2);
    });

    it("should fail for non-exist NFT Token", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          signers[1].address,
          3,
          ethers.utils.formatBytes32String("Test payload")
        )
      ).to.be.revertedWith("NFT doesn't exist");
    });

    it("should fail if transfer is not allowed", async () => {
      await expect(
        erc721WithAccount1["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          signers[2].address,
          0,
          ethers.utils.formatBytes32String("Test payload")
        )
      ).to.be.revertedWith("Not allowed to transfer");
    });

    it("should fail if not owner", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          signers[1].address,
          2,
          ethers.utils.formatBytes32String("Not owner of NFT")
        )
      ).to.be.revertedWith("Not allowed to transfer");
    });

    it("should fail if the destination address is zero", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          ethers.utils.hexlify(new Array(20).fill(0)),
          0,
          ethers.utils.formatBytes32String("Test payload")
        )
      ).to.be.revertedWith("Destination address must not be zero address");
    });

    it("should fail if the receiver is contract and it doesn't have onERC721Received", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          nonErc721TokenReceiver.address,
          0,
          ethers.utils.formatBytes32String("Test payload")
        )
      ).to.be.reverted;
    });

    it("should fail if the receiver is contract and it returns wrong value in onERC721Received", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          fakeErc721TokenReceiver.address,
          0,
          ethers.utils.formatBytes32String("Test payload")
        )
      ).to.be.revertedWith("Receiver cannot handle NFT");
    });

    it("should success if account is the owner", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          signers[1].address,
          0,
          ethers.utils.formatBytes32String("Test payload")
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, signers[1].address, 0);
    });

    it("should success when the destination is contract", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          erc721TokenReceiver.address,
          0,
          ethers.utils.formatBytes32String("Test payload")
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, erc721TokenReceiver.address, 0);
    });

    it("should success if the account is allowed to transfer this token", async () => {
      await erc721.approve(signers[1].address, 0);

      await expect(
        erc721WithAccount1["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          signers[2].address,
          0,
          ethers.utils.formatBytes32String("Test payload")
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, signers[2].address, 0);
    });

    it("should success if the account is allowed to transfer all tokens the sender has", async () => {
      await erc721.setApprovalForAll(signers[1].address, true);

      await expect(
        erc721WithAccount1["safeTransferFrom(address,address,uint256,bytes)"](
          signers[0].address,
          signers[2].address,
          0,
          ethers.utils.formatBytes32String("Test payload")
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, signers[2].address, 0);
    });
  });

  describe("safeTransferFrom(address,address,uint256)", () => {
    beforeEach(async () => {
      await erc721.mint(signers[0].address, 0);
      await erc721.mint(signers[0].address, 1);
      await erc721.mint(signers[1].address, 2);
    });

    it("should fail for non-exist NFT Token", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          signers[1].address,
          3
        )
      ).to.be.revertedWith("NFT doesn't exist");
    });

    it("should fail if transfer is not allowed", async () => {
      await expect(
        erc721WithAccount1["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          signers[2].address,
          0
        )
      ).to.be.revertedWith("Not allowed to transfer");
    });

    it("should fail if not owner", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          signers[1].address,
          2
        )
      ).to.be.revertedWith("Not allowed to transfer");
    });

    it("should fail if the destination address is zero", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          ethers.utils.hexlify(new Array(20).fill(0)),
          0
        )
      ).to.be.revertedWith("Destination address must not be zero address");
    });

    it("should fail if the receiver is contract and it doesn't have onERC721Received", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          nonErc721TokenReceiver.address,
          0
        )
      ).to.be.reverted;
    });

    it("should fail if the receiver is contract and it returns wrong value in onERC721Received", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          fakeErc721TokenReceiver.address,
          0
        )
      ).to.be.revertedWith("Receiver cannot handle NFT");
    });

    it("should success if account is the owner", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          signers[1].address,
          0
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, signers[1].address, 0);
    });

    it("should success when the destination is contract", async () => {
      await expect(
        erc721["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          erc721TokenReceiver.address,
          0
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, erc721TokenReceiver.address, 0);
    });

    it("should success if the account is allowed to transfer for this token", async () => {
      await erc721.approve(signers[1].address, 0);

      await expect(
        erc721WithAccount1["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          signers[2].address,
          0
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, signers[2].address, 0);
    });

    it("should success if the account is allowed to transfer all tokens the sender has", async () => {
      await erc721.setApprovalForAll(signers[1].address, true);

      await expect(
        erc721WithAccount1["safeTransferFrom(address,address,uint256)"](
          signers[0].address,
          signers[2].address,
          0
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, signers[2].address, 0);
    });
  });

  describe("transferFrom", () => {
    beforeEach(async () => {
      await erc721.mint(signers[0].address, 0);
      await erc721.mint(signers[0].address, 1);
      await erc721.mint(signers[1].address, 2);
    });

    it("should fail for non-exist NFT Token", async () => {
      await expect(
        erc721.transferFrom(signers[0].address, signers[1].address, 3)
      ).to.be.revertedWith("NFT doesn't exist");
    });

    it("should fail if transfer is not allowed", async () => {
      await expect(
        erc721WithAccount1.transferFrom(
          signers[0].address,
          signers[2].address,
          0
        )
      ).to.be.revertedWith("Not allowed to transfer");
    });

    it("should fail if not owner", async () => {
      await expect(
        erc721.transferFrom(signers[0].address, signers[1].address, 2)
      ).to.be.revertedWith("Not allowed to transfer");
    });

    it("should fail if the destination address is zero", async () => {
      await expect(
        erc721.transferFrom(
          signers[0].address,
          ethers.utils.hexlify(new Array(20).fill(0)),
          0
        )
      ).to.be.revertedWith("Destination address must not be zero address");
    });

    it("should success if account is the owner", async () => {
      await expect(
        erc721.transferFrom(signers[0].address, signers[1].address, 0)
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, signers[1].address, 0);
    });

    it("should success when the destination is contract", async () => {
      await expect(
        erc721.transferFrom(signers[0].address, erc721TokenReceiver.address, 0)
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, erc721TokenReceiver.address, 0);
    });

    it("should success if the account is allowed to transfer for this token", async () => {
      await erc721.approve(signers[1].address, 0);

      await expect(
        erc721WithAccount1.transferFrom(
          signers[0].address,
          signers[2].address,
          0
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, signers[2].address, 0);
    });

    it("should success if the account is allowed to transfer all tokens the sender has", async () => {
      await erc721.setApprovalForAll(signers[1].address, true);

      await expect(
        erc721WithAccount1.transferFrom(
          signers[0].address,
          signers[2].address,
          0
        )
      )
        .to.emit(erc721, "Transfer")
        .withArgs(signers[0].address, signers[2].address, 0);
    });
  });

  describe("approve", async () => {
    beforeEach(async () => {
      await erc721.mint(signers[0].address, 0);
      await erc721.mint(signers[0].address, 1);
      await erc721.mint(signers[1].address, 2);
    });

    it("should fail for non-exist NFT Token", async () => {
      await expect(erc721.approve(signers[1].address, 3)).to.be.revertedWith(
        "NFT doesn't exist"
      );
    });

    it("should fail if approve is not allowed", async () => {
      await expect(
        erc721WithAccount1.approve(signers[2].address, 0)
      ).to.be.revertedWith("Not allowed to operate");
    });

    it("should fail if target address is myself", async () => {
      await expect(erc721.approve(signers[0].address, 0)).to.be.revertedWith(
        "Cannot approve to myself"
      );
    });

    it("should success if the account is owner", async () => {
      await expect(erc721.approve(signers[1].address, 0))
        .to.emit(erc721, "Approval")
        .withArgs(signers[0].address, signers[1].address, 0);
    });

    it("should success if the account is allowed by the token owner", async () => {
      await erc721.setApprovalForAll(signers[1].address, true);

      await expect(erc721WithAccount1.approve(signers[1].address, 0))
        .to.emit(erc721, "Approval")
        .withArgs(signers[0].address, signers[1].address, 0);
    });
  });

  describe("setApprovalForAll", () => {
    it("should success", async () => {
      await expect(erc721.setApprovalForAll(signers[1].address, true))
        .to.emit(erc721, "ApprovalForAll")
        .withArgs(signers[0].address, signers[1].address, true);
    });
  });

  describe("getApproved", () => {
    beforeEach(async () => {
      await erc721.mint(signers[0].address, 0);
      await erc721.approve(signers[1].address, 0);
    });

    it("should return address", async () => {
      expect(await erc721WithAccount1.getApproved(0)).to.be.eq(
        signers[1].address
      );
    });
  });

  describe("isApprovedForAll", () => {
    beforeEach(async () => {
      await erc721.setApprovalForAll(signers[2].address, true);
    });

    it("should return false", async () => {
      expect(
        await erc721.isApprovedForAll(signers[0].address, signers[1].address)
      ).to.be.eq(false);
    });

    it("should return true", async () => {
      expect(
        await erc721.isApprovedForAll(signers[0].address, signers[2].address)
      ).to.be.eq(true);
    });
  });

  describe("mint", () => {
    beforeEach(async () => {
      await erc721.mint(signers[0].address, 0);
    });

    it("should fail if the account is not contract owner", async () => {
      await expect(
        erc721WithAccount1.mint(signers[0].address, 1)
      ).to.be.revertedWith("Only owner can call");
    });

    it("should fail if the destination address is zero", async () => {
      await expect(
        erc721.mint(ethers.utils.hexlify(new Array(20).fill(0)), 1)
      ).to.be.revertedWith("Destination address must not be zero");
    });

    it("should fail if the token already exists", async () => {
      await expect(erc721.mint(signers[1].address, 0)).to.be.revertedWith(
        "The NFT already exists"
      );
    });

    it("should success", async () => {
      await expect(erc721.mint(signers[1].address, 1))
        .to.emit(erc721, "Transfer")
        .withArgs(
          ethers.utils.hexlify(new Array(20).fill(0)),
          signers[1].address,
          1
        );
    });
  });
});
