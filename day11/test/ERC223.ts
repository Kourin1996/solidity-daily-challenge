import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ERC223 } from "../typechain/ERC223";
import { ERC223Recipient } from "../typechain/ERC223Recipient";
import { ERC20Recipient } from "../typechain/ERC20Recipient";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.use(solidity);
const { expect } = chai;

describe("ERC223", () => {
  let erc223: ERC223;
  let erc223Recipient: ERC223Recipient;
  let erc20Recipient: ERC20Recipient;
  const name = "TestToken";
  const symbol = "TST";
  const totalSupply = 1000;
  const decimals = 0;
  let signers: SignerWithAddress[] = [];

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const erc223Factory = await ethers.getContractFactory("ERC223", signers[0]);
    erc223 = (await erc223Factory.deploy(
      ethers.utils.formatBytes32String(name),
      ethers.utils.formatBytes32String(symbol),
      totalSupply,
      decimals
    )) as ERC223;

    const erc223RecipientFactory = await ethers.getContractFactory(
      "ERC223Recipient",
      signers[0]
    );
    erc223Recipient = (await erc223RecipientFactory.deploy()) as ERC223Recipient;

    const erc20RecipientFactory = await ethers.getContractFactory(
      "ERC20Recipient",
      signers[0]
    );
    erc20Recipient = (await erc20RecipientFactory.deploy()) as ERC20Recipient;

    await Promise.all([
      erc223.deployed(),
      erc223Recipient.deployed(),
      erc20Recipient.deployed(),
    ]);

    expect(erc223.address).to.properAddress;
  });

  describe("name", () => {
    it("should return", async () => {
      const bytesName = await erc223.name();
      expect(ethers.utils.parseBytes32String(bytesName)).to.eq(name);
    });
  });

  describe("symbol", () => {
    it("should return", async () => {
      const bytesSymbol = await erc223.symbol();
      expect(ethers.utils.parseBytes32String(bytesSymbol)).to.eq(symbol);
    });
  });

  describe("totalSupply", () => {
    it("should return", async () => {
      expect(await erc223.totalSupply()).to.eq(totalSupply);
    });
  });

  describe("decimals", () => {
    it("should return", async () => {
      expect(await erc223.decimals()).to.eq(decimals);
    });
  });

  describe("balanceOf", () => {
    it("should return 0 as default", async () => {
      expect(await erc223.balanceOf(signers[0].address)).to.eq(0);
    });

    it("should return amount", async () => {
      const mintAmount = 1000;
      const address = signers[0].address;
      await erc223.mint(address, mintAmount);

      expect(await erc223.balanceOf(address)).to.eq(mintAmount);
    });
  });

  describe("transfer(address,uint256)", () => {
    describe("EOA", () => {
      it("should fail if source address is zero", async () => {
        const erc223WithZeroAccount = erc223.connect("0x0");
        const target = signers[0].address;

        await expect(
          erc223WithZeroAccount["transfer(address,uint256)"](target, 0)
        ).to.be.reverted;
      });

      it("should fail if target address is zero", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = "0x0";

        await expect(erc223WithAccount1["transfer(address,uint256)"](target, 0))
          .to.be.reverted;
      });

      it("should fail if source account doesn't have enough balance to transfer", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = signers[1].address;
        const remittanceAmount = 1000;

        await expect(
          erc223WithAccount1["transfer(address,uint256)"](
            target,
            remittanceAmount
          )
        ).to.be.reverted;
      });

      it("should success", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = signers[1].address;
        const initialBalanceOfAccount1 = 10000;
        const remittanceAmount = 1000;

        await erc223.mint(signers[0].address, initialBalanceOfAccount1);

        await expect(
          erc223WithAccount1["transfer(address,uint256)"](
            target,
            remittanceAmount
          )
        ).to.emit(erc223, "Transfer");

        const newBalanceOfAccount1 =
          initialBalanceOfAccount1 - remittanceAmount;
        const newBalanceOfAccount2 = remittanceAmount;

        expect(await erc223.balanceOf(signers[0].address)).to.eq(
          newBalanceOfAccount1
        );
        expect(await erc223.balanceOf(signers[1].address)).to.eq(
          newBalanceOfAccount2
        );
      });
    });

    describe("contract without tokenFallback", () => {
      it("should fail", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = erc20Recipient.address;
        const initialBalanceOfAccount1 = 10000;
        const remittanceAmount = 1000;

        await erc223.mint(signers[0].address, initialBalanceOfAccount1);

        await expect(
          erc223WithAccount1["transfer(address,uint256)"](
            target,
            remittanceAmount
          )
        ).to.be.reverted;
      });
    });

    describe("contract with tokenFallback", () => {
      it("should success", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = erc223Recipient.address;
        const initialBalanceOfAccount1 = 10000;
        const remittanceAmount = 1000;

        await erc223.mint(signers[0].address, initialBalanceOfAccount1);

        await expect(
          erc223WithAccount1["transfer(address,uint256)"](
            target,
            remittanceAmount
          )
        ).to.emit(erc223, "Transfer");
      });
    });
  });

  describe("transfer(address,uint256,bytes)", () => {
    const payload = ethers.utils.formatBytes32String("test payload");

    describe("EOA", () => {
      it("should fail if source address is zero", async () => {
        const erc223WithZeroAccount = erc223.connect("0x0");
        const target = signers[0].address;

        await expect(
          erc223WithZeroAccount["transfer(address,uint256,bytes)"](
            target,
            0,
            payload
          )
        ).to.be.reverted;
      });

      it("should fail if target address is zero", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = "0x0";

        await expect(
          erc223WithAccount1["transfer(address,uint256,bytes)"](
            target,
            0,
            payload
          )
        ).to.be.reverted;
      });

      it("should fail if source account doesn't have enough balance to transfer", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = signers[1].address;
        const remittanceAmount = 1000;

        await expect(
          erc223WithAccount1["transfer(address,uint256,bytes)"](
            target,
            remittanceAmount,
            payload
          )
        ).to.be.reverted;
      });

      it("should success", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = signers[1].address;
        const initialBalanceOfAccount1 = 10000;
        const remittanceAmount = 1000;

        await erc223.mint(signers[0].address, initialBalanceOfAccount1);

        await expect(
          erc223WithAccount1["transfer(address,uint256,bytes)"](
            target,
            remittanceAmount,
            payload
          )
        ).to.emit(erc223, "Transfer");

        const newBalanceOfAccount1 =
          initialBalanceOfAccount1 - remittanceAmount;
        const newBalanceOfAccount2 = remittanceAmount;

        expect(await erc223.balanceOf(signers[0].address)).to.eq(
          newBalanceOfAccount1
        );
        expect(await erc223.balanceOf(signers[1].address)).to.eq(
          newBalanceOfAccount2
        );
      });
    });

    describe("contract without tokenFallback", () => {
      it("should fail", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = erc20Recipient.address;
        const initialBalanceOfAccount1 = 10000;
        const remittanceAmount = 1000;

        await erc223.mint(signers[0].address, initialBalanceOfAccount1);

        await expect(
          erc223WithAccount1["transfer(address,uint256,bytes)"](
            target,
            remittanceAmount,
            payload
          )
        ).to.be.reverted;
      });
    });

    describe("contract with tokenFallback", () => {
      it("should success", async () => {
        const erc223WithAccount1 = erc223.connect(signers[0]);
        const target = erc223Recipient.address;
        const initialBalanceOfAccount1 = 10000;
        const remittanceAmount = 1000;

        await erc223.mint(signers[0].address, initialBalanceOfAccount1);

        await expect(
          erc223WithAccount1["transfer(address,uint256,bytes)"](
            target,
            remittanceAmount,
            payload
          )
        ).to.emit(erc223, "Transfer");
      });
    });
  });

  describe("allowance", () => {
    it("should success", async () => {
      expect(
        await erc223.allowance(signers[0].address, signers[1].address)
      ).to.eq(0);
    });
  });

  describe("approve", () => {
    it("should fail if source address is zero", async () => {
      const erc223WithZeroAccount = erc223.connect("0x0");
      const target = signers[1].address;
      const newAllowance = 1000;

      await expect(erc223WithZeroAccount.approve(target, newAllowance)).to.be
        .reverted;
    });

    it("should fail if target address is zero", async () => {
      const erc223WithAccount1 = erc223.connect(signers[0]);
      const target = "0x0";
      const newAllowance = 1000;

      await expect(erc223WithAccount1.approve(target, newAllowance)).to.be
        .reverted;
    });

    it("should success", async () => {
      const erc223WithAccount1 = erc223.connect(signers[0]);
      const target = signers[1].address;
      const newAllowance = 1000;

      await expect(erc223WithAccount1.approve(target, newAllowance)).to.emit(
        erc223,
        "Approval"
      );
    });
  });

  describe("transferFrom", async () => {
    describe("EOA", () => {
      it("should fail if source address is zero", async () => {
        const source = "0x0";
        const target = signers[1].address;

        await expect(erc223.transferFrom(source, target, 0)).to.be.reverted;
      });

      it("should fail if target address is zero", async () => {
        const source = signers[0].address;
        const target = "0x0";

        await expect(erc223.transferFrom(source, target, 0)).to.be.reverted;
      });

      it("should fail if source address doesn't have enough allowance to transfer", async () => {
        const source = signers[0].address;
        const target = signers[1].address;
        const remittanceAmount = 1000;

        await expect(erc223.transferFrom(source, target, remittanceAmount)).to
          .be.reverted;
      });

      it("should success", async () => {
        const caller = signers[0].address;
        const source = signers[1].address;
        const target = signers[2].address;

        const initialBalanceOfAccount2 = 10000;
        const allowance = 10000;
        const remittanceAmount = 1000;

        await erc223.mint(source, initialBalanceOfAccount2);

        const erc223WithAccount2 = erc223.connect(signers[1]);
        await erc223WithAccount2.approve(caller, allowance);

        const erc223WithAccount1 = erc223.connect(signers[0]);
        await expect(
          erc223WithAccount1.transferFrom(source, target, remittanceAmount)
        )
          .to.emit(erc223WithAccount1, "Transfer")
          .and.emit(erc223, "Approval");
      });
    });

    describe("contract without tokenFallback", () => {
      it("should fail", async () => {
        const caller = signers[0].address;
        const source = signers[1].address;
        const target = erc20Recipient.address;

        const initialBalanceOfAccount2 = 10000;
        const allowance = 10000;
        const remittanceAmount = 1000;

        await erc223.mint(source, initialBalanceOfAccount2);

        const erc223WithAccount2 = erc223.connect(signers[1]);
        await erc223WithAccount2.approve(caller, allowance);

        const erc223WithAccount1 = erc223.connect(signers[0]);
        await expect(
          erc223WithAccount1.transferFrom(source, target, remittanceAmount)
        ).to.be.reverted;
      });
    });

    describe("contract with tokenFallback", () => {
      it("should success", async () => {
        const caller = signers[0].address;
        const source = signers[1].address;
        const target = erc223Recipient.address;

        const initialBalanceOfAccount2 = 10000;
        const allowance = 10000;
        const remittanceAmount = 1000;

        await erc223.mint(source, initialBalanceOfAccount2);

        const erc223WithAccount2 = erc223.connect(signers[1]);
        await erc223WithAccount2.approve(caller, allowance);

        const erc223WithAccount1 = erc223.connect(signers[0]);
        await expect(
          erc223WithAccount1.transferFrom(source, target, remittanceAmount)
        )
          .to.emit(erc223WithAccount1, "Transfer")
          .and.emit(erc223, "Approval");
      });
    });
  });

  describe("mint", () => {
    it("should fail if a account other than owner call", async () => {
      const erc223WithAccount1 = erc223.connect(signers[1]);
      const amount = 10000;

      await expect(erc223WithAccount1.mint(erc223WithAccount1.address, amount))
        .to.be.reverted;
    });

    it("should success", async () => {
      const target = signers[0].address;
      const amount = 10000;

      await expect(erc223.mint(target, amount))
        .to.emit(erc223, "Mint")
        .and.emit(erc223, "Transfer");

      expect(await erc223.balanceOf(target)).to.eq(amount);
    });
  });

  describe("burn", () => {
    it("should fail if a account other than owner call", async () => {
      const erc223WithAccount1 = erc223.connect(signers[1]);
      const amount = 10000;

      await expect(erc223WithAccount1.burn(erc223WithAccount1.address, amount))
        .to.be.reverted;
    });

    it("should fail if a account doesn't have enough balance", async () => {
      const target = signers[0].address;
      const amount = 10000;

      await expect(erc223.burn(target, amount)).to.be.reverted;
    });

    it("should success", async () => {
      const target = signers[0].address;
      const initialBalance = 10000;
      const amount = 1000;

      await erc223.mint(target, initialBalance);

      await expect(erc223.burn(target, amount))
        .to.emit(erc223, "Burn")
        .and.emit(erc223, "Transfer");

      const newBalance = initialBalance - amount;
      expect(await erc223.balanceOf(target)).to.eq(newBalance);
    });
  });
});
