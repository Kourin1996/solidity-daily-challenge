import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ERC20 } from "../typechain/ERC20";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.use(solidity);
const { expect } = chai;

describe("ERC20", () => {
  let erc20: ERC20;
  const name = "TestCoin";
  const symbol = "TST";
  const totalSupply = 1000;
  const decimals = 0;
  let signers: SignerWithAddress[] = [];

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("ERC20", signers[0]);

    erc20 = (await erc20Factory.deploy(
      ethers.utils.formatBytes32String(name),
      ethers.utils.formatBytes32String(symbol),
      totalSupply,
      decimals
    )) as ERC20;
    await erc20.deployed();

    expect(erc20.address).to.properAddress;
  });

  describe("name", () => {
    it("should return", async () => {
      const bytesName = await erc20.name();
      expect(ethers.utils.parseBytes32String(bytesName)).to.eq(name);
    });
  });

  describe("symbol", () => {
    it("should return", async () => {
      const bytesSymbol = await erc20.symbol();
      expect(ethers.utils.parseBytes32String(bytesSymbol)).to.eq(symbol);
    });
  });

  describe("totalSupply", () => {
    it("should return", async () => {
      expect(await erc20.totalSupply()).to.eq(totalSupply);
    });
  });

  describe("decimals", () => {
    it("should return", async () => {
      expect(await erc20.decimals()).to.eq(decimals);
    });
  });

  describe("balanceOf", () => {
    it("should return 0 as default", async () => {
      expect(await erc20.balanceOf(signers[0].address)).to.eq(0);
    });

    it("should return amount", async () => {
      const mintAmount = 1000;
      const address = signers[0].address;
      await erc20.mint(address, mintAmount);

      expect(await erc20.balanceOf(address)).to.eq(mintAmount);
    });
  });

  describe("transfer", () => {
    it("should fail if source address is zero", async () => {
      const erc20WithZeroAccount = erc20.connect("0x0");
      const target = signers[0].address;

      await expect(erc20WithZeroAccount.transfer(target, 0)).to.be.reverted;
    });

    it("should fail if target address is zero", async () => {
      const erc20WithAccount1 = erc20.connect(signers[0]);
      const target = "0x0";

      await expect(erc20WithAccount1.transfer(target, 0)).to.be.reverted;
    });

    it("should fail if source account doesn't have enough balance to transfer", async () => {
      const erc20WithAccount1 = erc20.connect(signers[0]);
      const target = signers[1].address;
      const remittanceAmount = 1000;

      await expect(erc20WithAccount1.transfer(target, remittanceAmount)).to.be
        .reverted;
    });

    it("should success", async () => {
      const erc20WithAccount1 = erc20.connect(signers[0]);
      const target = signers[1].address;
      const initialBalanceOfAccount1 = 10000;
      const remittanceAmount = 1000;

      await erc20.mint(signers[0].address, initialBalanceOfAccount1);

      await expect(
        erc20WithAccount1.transfer(target, remittanceAmount)
      ).to.emit(erc20, "Transfer");

      const newBalanceOfAccount1 = initialBalanceOfAccount1 - remittanceAmount;
      const newBalanceOfAccount2 = remittanceAmount;

      expect(await erc20.balanceOf(signers[0].address)).to.eq(
        newBalanceOfAccount1
      );
      expect(await erc20.balanceOf(signers[1].address)).to.eq(
        newBalanceOfAccount2
      );
    });
  });

  describe("allowance", () => {
    it("should success", async () => {
      expect(
        await erc20.allowance(signers[0].address, signers[1].address)
      ).to.eq(0);
    });
  });

  describe("approve", () => {
    it("should fail if source address is zero", async () => {
      const erc20WithZeroAccount = erc20.connect("0x0");
      const target = signers[1].address;
      const newAllowance = 1000;

      await expect(erc20WithZeroAccount.approve(target, newAllowance)).to.be
        .reverted;
    });

    it("should fail if target address is zero", async () => {
      const erc20WithAccount1 = erc20.connect(signers[0]);
      const target = "0x0";
      const newAllowance = 1000;

      await expect(erc20WithAccount1.approve(target, newAllowance)).to.be
        .reverted;
    });

    it("should success", async () => {
      const erc20WithAccount1 = erc20.connect(signers[0]);
      const target = signers[1].address;
      const newAllowance = 1000;

      await expect(erc20WithAccount1.approve(target, newAllowance)).to.emit(
        erc20,
        "Approval"
      );
    });
  });

  describe("transferFrom", async () => {
    it("should fail if source address is zero", async () => {
      const source = "0x0";
      const target = signers[1].address;

      await expect(erc20.transferFrom(source, target, 0)).to.be.reverted;
    });

    it("should fail if target address is zero", async () => {
      const source = signers[0].address;
      const target = "0x0";

      await expect(erc20.transferFrom(source, target, 0)).to.be.reverted;
    });

    it("should fail if source address doesn't have enough allowance to transfer", async () => {
      const source = signers[0].address;
      const target = signers[1].address;
      const remittanceAmount = 1000;

      await expect(erc20.transferFrom(source, target, remittanceAmount)).to.be
        .reverted;
    });

    it("should success", async () => {
      const caller = signers[0].address;
      const source = signers[1].address;
      const target = signers[2].address;

      const initialBalanceOfAccount2 = 10000;
      const allowance = 10000;
      const remittanceAmount = 1000;

      await erc20.mint(source, initialBalanceOfAccount2);

      const erc20WithAccount2 = erc20.connect(signers[1]);
      await erc20WithAccount2.approve(caller, allowance);

      const erc20WithAccount1 = erc20.connect(signers[0]);
      await expect(
        erc20WithAccount1.transferFrom(source, target, remittanceAmount)
      )
        .to.emit(erc20WithAccount1, "Transfer")
        .and.emit(erc20, "Approval");
    });
  });

  describe("mint", () => {
    it("should fail if a account other than owner call", async () => {
      const erc20WithAccount1 = erc20.connect(signers[1]);
      const amount = 10000;

      await expect(erc20WithAccount1.mint(erc20WithAccount1.address, amount)).to
        .be.reverted;
    });

    it("should success", async () => {
      const target = signers[0].address;
      const amount = 10000;

      await expect(erc20.mint(target, amount))
        .to.emit(erc20, "Mint")
        .and.emit(erc20, "Transfer");

      expect(await erc20.balanceOf(target)).to.eq(amount);
    });
  });

  describe("burn", () => {
    it("should fail if a account other than owner call", async () => {
      const erc20WithAccount1 = erc20.connect(signers[1]);
      const amount = 10000;

      await expect(erc20WithAccount1.burn(erc20WithAccount1.address, amount)).to
        .be.reverted;
    });

    it("should fail if a account doesn't have enough balance", async () => {
      const target = signers[0].address;
      const amount = 10000;

      await expect(erc20.burn(target, amount)).to.be.reverted;
    });

    it("should success", async () => {
      const target = signers[0].address;
      const initialBalance = 10000;
      const amount = 1000;

      await erc20.mint(target, initialBalance);

      await expect(erc20.burn(target, amount))
        .to.emit(erc20, "Burn")
        .and.emit(erc20, "Transfer");

      const newBalance = initialBalance - amount;
      expect(await erc20.balanceOf(target)).to.eq(newBalance);
    });
  });
});
