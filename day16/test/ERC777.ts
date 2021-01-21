import { ethers, web3 } from "hardhat";
import chai from "chai";
import {
  deployMockContract,
  MockContract,
  MockProvider,
  solidity,
} from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ERC777 } from "../typechain/ERC777";
import { Wallet } from "ethers";

require("@openzeppelin/test-helpers/configure")({ environment: "web3", web3 });
const {
  accounts,
  singletons,
  constants,
} = require("@openzeppelin/test-helpers");

chai.use(solidity);
const { expect } = chai;

const IERC777Sender = require("../artifacts/contracts/IERC777Sender.sol/IERC777Sender.json");
const IERC777Recipient = require("../artifacts/contracts/IERC777Recipient.sol/IERC777Recipient.json");

describe("ERC777", () => {
  const TOKEN_NAME = "ERC777Token";
  const TOKEN_SYMBOL = "ERC777";
  const INITIAL_AMOUNT = ethers.BigNumber.from(10 ** 8);

  let signers: SignerWithAddress[] = [];
  let mockWallets: Wallet[];

  let erc777: ERC777;
  let erc1820: any;

  // let mockErc777Sender: MockContract;
  // let mockErc777Recipient: MockContract;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    mockWallets = new MockProvider().getWallets();

    erc1820 = await singletons.ERC1820Registry(signers[0].address);

    // mockErc777Sender = await deployMockContract(
    //   mockWallets[0],
    //   IERC777Sender.abi
    // );
    // mockErc777Recipient = await deployMockContract(
    //   mockWallets[0],
    //   IERC777Recipient.abi
    // );

    // await Promise.all([
    //   erc1820.methods
    //     .setInterfaceImplementer(
    //       constants.ZERO_ADDRESS,
    //       ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ERC777Sender")),
    //       mockErc777Sender.address
    //     )
    //     .call({ from: accounts[0] }),
    //   erc1820.methods
    //     .setInterfaceImplementer(
    //       constants.ZERO_ADDRESS,
    //       ethers.utils.keccak256(
    //         ethers.utils.toUtf8Bytes("ERC777TokensRecipient")
    //       ),
    //       mockErc777Recipient.address
    //     )
    //     .call({ from: accounts[0] }),
    //   ,
    // ]);

    const erc777Factory = await ethers.getContractFactory("ERC777", signers[0]);
    erc777 = (await erc777Factory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      [],
      INITIAL_AMOUNT
    )) as ERC777;

    await Promise.all([erc777.deployed()]);

    expect(erc777.address).to.properAddress;
  });

  describe("name", () => {
    it("should return name", async () => {
      expect(await erc777.name()).to.eq(TOKEN_NAME);
    });
  });

  describe("symbol", () => {
    it("should return symbol", async () => {
      expect(await erc777.symbol()).to.eq(TOKEN_SYMBOL);
    });
  });

  describe("decimals", () => {
    it("should return decimals", async () => {
      expect(await erc777.decimals()).to.eq(18);
    });
  });

  describe("granularity", () => {
    it("should return granularity", async () => {
      expect(await erc777.granularity()).to.eq(1);
    });
  });

  describe("totalSupply", () => {
    it("should return INITIAL_AMOUNT at first", async () => {
      expect(await erc777.totalSupply()).to.eq(INITIAL_AMOUNT);
    });

    //todo
  });

  describe("balanceOf", () => {
    it("should return INITIAL_AMOUNT at first", async () => {
      expect(await erc777.balanceOf(signers[0].address)).to.eq(INITIAL_AMOUNT);
    });

    it("should return zero at first", async () => {
      expect(await erc777.balanceOf(signers[1].address)).to.eq(0);
    });
    //todo
  });

  describe("send", () => {
    const amount = ethers.BigNumber.from(10 ** 4);
    const data = ethers.utils.formatBytes32String("Test Data");

    it("should fail if recipient_ is zero", async () => {
      await expect(
        erc777.send(constants.ZERO_ADDRESS, amount, data)
      ).to.be.revertedWith("to address must not be zero address");
    });

    it("should fail if amount exceeds current balance", async () => {
      const amount = ethers.BigNumber.from("100000000000");

      await expect(
        erc777.send(signers[1].address, amount, data)
      ).to.be.revertedWith("transfer amount exceeds balance");
    });

    describe("recipient is EOA", async () => {
      it("should success and emit Sent", async () => {
        await expect(erc777.send(signers[1].address, amount, data))
          .to.emit(erc777, "Sent")
          .withArgs(
            signers[0].address,
            signers[0].address,
            signers[1].address,
            amount,
            data,
            "0x"
          );
      });

      it("should success and emit Transfer", async () => {
        await expect(erc777.send(signers[1].address, amount, data))
          .to.emit(erc777, "Transfer")
          .withArgs(signers[0].address, signers[1].address, amount);
      });

      it("should success and change balance", async () => {
        await expect(() =>
          erc777.send(signers[1].address, amount, data)
        ).to.changeTokenBalances(
          erc777,
          [signers[0], signers[1]],
          [amount.mul("-1"), amount]
        );
      });
    });

    describe("recipient is contract", async () => {
      // it("should fail if recipient contract doesn't have tokensToSend", async () => {
      //   await expect(
      //     erc777.send(mockErc777Sender.address, amount, data)
      //   ).to.be.revertedWith(
      //     "token recipient contract has no implementer for ERC777TokensRecipient"
      //   );
      // });
      // it("should success", async () => {
      //   await expect(() =>
      //     erc777.send(erc777Recipient.address, amount, data)
      //   ).to.changeTokenBalances(
      //     erc777,
      //     [signers[0], erc777Recipient],
      //     [amount.mul("-1"), amount]
      //   );
      // });
    });

    // describe("sender is contract, recipient is contract", async (

    // ) => {});
  });
});
