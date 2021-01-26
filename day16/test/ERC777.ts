import { ethers, web3 } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ERC777 } from "../typechain/ERC777";
import { ERC777Sender } from "../typechain/ERC777Sender";
import { ERC777Recipient } from "../typechain/ERC777Recipient";

require("@openzeppelin/test-helpers/configure")({ environment: "web3", web3 });
const { singletons, constants } = require("@openzeppelin/test-helpers");

chai.use(solidity);
const { expect } = chai;

describe("ERC777", () => {
  const TOKEN_NAME = "ERC777Token";
  const TOKEN_SYMBOL = "ERC777";
  const INITIAL_AMOUNT = ethers.BigNumber.from(10 ** 8);

  let signers: SignerWithAddress[] = [];

  let erc777: ERC777;
  let erc777Sender: ERC777Sender;
  let erc777Recipient: ERC777Recipient;
  let erc1820: any;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    erc1820 = await singletons.ERC1820Registry(signers[0].address);

    const erc777Factory = await ethers.getContractFactory("ERC777", signers[0]);
    erc777 = (await erc777Factory.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      [signers[0].address, signers[1].address],
      INITIAL_AMOUNT
    )) as ERC777;

    const erc777SenderFactory = await ethers.getContractFactory(
      "ERC777Sender",
      signers[0]
    );
    erc777Sender = (await erc777SenderFactory.deploy()) as ERC777Sender;

    const erc777RecipientFactory = await ethers.getContractFactory(
      "ERC777Recipient",
      signers[0]
    );
    erc777Recipient = (await erc777RecipientFactory.deploy()) as ERC777Recipient;

    await Promise.all([
      erc777.deployed(),
      erc777Sender.deployed(),
      erc777Recipient.deployed(),
    ]);

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
  });

  describe("balanceOf", () => {
    it("should return INITIAL_AMOUNT at first", async () => {
      expect(await erc777.balanceOf(signers[0].address)).to.eq(INITIAL_AMOUNT);
    });

    it("should return zero at first", async () => {
      expect(await erc777.balanceOf(signers[1].address)).to.eq(0);
    });
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

    it("should emit Sent", async () => {
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

    it("should emit Transfer", async () => {
      await expect(erc777.send(signers[1].address, amount, data))
        .to.emit(erc777, "Transfer")
        .withArgs(signers[0].address, signers[1].address, amount);
    });

    it("should change balance", async () => {
      await expect(() =>
        erc777.send(signers[1].address, amount, data)
      ).to.changeTokenBalances(
        erc777,
        [signers[0], signers[1]],
        [amount.mul("-1"), amount]
      );
    });

    describe("recipient is contract", async () => {
      it("should fail if recipient contract doesn't have tokensToSend", async () => {
        await expect(
          erc777.send(erc777Sender.address, amount, data)
        ).to.be.revertedWith(
          "token recipient contract has no implementer for ERC777TokensRecipient"
        );
      });

      it("should success", async () => {
        await expect(() =>
          erc777.send(erc777Recipient.address, amount, data)
        ).to.changeTokenBalances(
          erc777,
          [signers[0], erc777Recipient],
          [amount.mul("-1"), amount]
        );
      });
    });
  });

  describe("transfer", () => {
    const amount = ethers.BigNumber.from(10 ** 4);

    it("should fail if recipient is zero", async () => {
      await expect(
        erc777.transfer(constants.ZERO_ADDRESS, amount)
      ).to.be.revertedWith("recipient address must not be zero address");
    });

    it("should fail if amount exceeds current balance", async () => {
      const amount = ethers.BigNumber.from("100000000000");

      await expect(
        erc777.transfer(signers[1].address, amount)
      ).to.be.revertedWith("transfer amount exceeds balance");
    });

    it("should emit Sent", async () => {
      await expect(erc777.transfer(signers[1].address, amount))
        .to.emit(erc777, "Sent")
        .withArgs(
          signers[0].address,
          signers[0].address,
          signers[1].address,
          amount,
          "0x",
          "0x"
        );
    });

    it("should emit Transfer", async () => {
      await expect(erc777.transfer(signers[1].address, amount))
        .to.emit(erc777, "Transfer")
        .withArgs(signers[0].address, signers[1].address, amount);
    });

    it("should change balance", async () => {
      await expect(() =>
        erc777.transfer(signers[1].address, amount)
      ).to.changeTokenBalances(
        erc777,
        [signers[0], signers[1]],
        [amount.mul("-1"), amount]
      );
    });
  });

  describe("burn", () => {
    const amount = ethers.BigNumber.from(10 ** 4);
    const data = ethers.utils.formatBytes32String("Test Data");

    it("should fail if amount exceeds current balance", async () => {
      const amount = ethers.BigNumber.from("100000000000");

      await expect(erc777.burn(amount, data)).to.be.revertedWith(
        "burn amount exceeds balance"
      );
    });

    it("should emit Burned", async () => {
      await expect(erc777.burn(amount, data))
        .to.emit(erc777, "Burned")
        .withArgs(signers[0].address, signers[0].address, amount, data, "0x");
    });

    it("should emit Transfer", async () => {
      await expect(erc777.burn(amount, data))
        .to.emit(erc777, "Transfer")
        .withArgs(signers[0].address, constants.ZERO_ADDRESS, amount);
    });

    it("should change balance", async () => {
      await expect(() => erc777.burn(amount, data)).to.changeTokenBalances(
        erc777,
        [signers[0]],
        [amount.mul("-1")]
      );
    });

    it("should change totalSupply", async () => {
      const oldTotalSupply = await erc777.totalSupply();
      await erc777.burn(amount, data);
      const newTotalSupply = await erc777.totalSupply();

      expect(oldTotalSupply.sub(newTotalSupply)).to.eq(amount);
    });
  });

  describe("isOperatorFor", async () => {
    it("should return true if self operate", async () => {
      expect(
        await erc777.isOperatorFor(signers[0].address, signers[0].address)
      ).to.eq(true);
    });

    it("should return true if default operators as default", async () => {
      expect(
        await erc777.isOperatorFor(signers[1].address, signers[0].address)
      ).to.eq(true);
    });

    it("should return false if not default operators as default", async () => {
      expect(
        await erc777.isOperatorFor(signers[2].address, signers[0].address)
      ).to.eq(false);
    });
  });

  describe("authorizeOperator", () => {
    it("should fail when self authorize", async () => {
      await expect(
        erc777.authorizeOperator(signers[0].address)
      ).to.be.revertedWith("Can't self authorize");
    });

    it("should emit AuthorizedOperator event", async () => {
      await expect(erc777.authorizeOperator(signers[2].address))
        .to.emit(erc777, "AuthorizedOperator")
        .withArgs(signers[2].address, signers[0].address);
    });

    it("should change authorize state", async () => {
      await erc777.authorizeOperator(signers[2].address);

      expect(
        await erc777.isOperatorFor(signers[2].address, signers[0].address)
      ).to.eq(true);
    });
  });

  describe("revokeOperator", () => {
    it("should fail when self authorize", async () => {
      await expect(
        erc777.revokeOperator(signers[0].address)
      ).to.be.revertedWith("Can't self revoke");
    });

    it("should emit RevokedOperator event", async () => {
      await expect(erc777.revokeOperator(signers[1].address))
        .to.emit(erc777, "RevokedOperator")
        .withArgs(signers[1].address, signers[0].address);
    });

    it("should change authorize state", async () => {
      await erc777.revokeOperator(signers[1].address);

      expect(
        await erc777.isOperatorFor(signers[1].address, signers[0].address)
      ).to.eq(false);
    });
  });

  describe("defaultOperators", () => {
    it("should return", async () => {
      expect(await erc777.defaultOperators()).to.eql(
        signers.slice(0, 2).map((s) => s.address)
      );
    });
  });

  describe("operatorSend", () => {
    const amount = ethers.BigNumber.from(10 ** 4);
    const data = ethers.utils.formatBytes32String("Test Data");
    const operatorData = ethers.utils.formatBytes32String("Test Operator Data");
    let erc777WithAccount2: ERC777;

    beforeEach(async () => {
      erc777WithAccount2 = erc777.connect(signers[2]);
      await erc777.authorizeOperator(signers[2].address);
    });

    it("should fail if not operator", async () => {
      const erc777WithAccount3 = erc777.connect(signers[3]);
      await expect(
        erc777WithAccount3.operatorSend(
          signers[0].address,
          signers[1].address,
          amount,
          data,
          operatorData
        )
      ).to.be.revertedWith("Caller is not an operator for holder");
    });

    it("should fail if from is zero", async () => {
      await expect(
        erc777.operatorSend(
          constants.ZERO_ADDRESS,
          signers[1].address,
          amount,
          data,
          operatorData
        )
      ).to.be.revertedWith("from address must not be zero address");
    });

    it("should fail if to is zero", async () => {
      await expect(
        erc777.operatorSend(
          signers[0].address,
          constants.ZERO_ADDRESS,
          amount,
          data,
          operatorData
        )
      ).to.be.revertedWith("to address must not be zero address");
    });

    it("should fail if amount exceeds current balance", async () => {
      const amount = ethers.BigNumber.from("100000000000");

      await expect(
        erc777WithAccount2.operatorSend(
          signers[0].address,
          signers[1].address,
          amount,
          data,
          operatorData
        )
      ).to.be.revertedWith("transfer amount exceeds balance");
    });

    it("should emit Sent", async () => {
      await expect(
        erc777WithAccount2.operatorSend(
          signers[0].address,
          signers[1].address,
          amount,
          data,
          operatorData
        )
      )
        .to.emit(erc777, "Sent")
        .withArgs(
          signers[2].address,
          signers[0].address,
          signers[1].address,
          amount,
          data,
          operatorData
        );
    });

    it("should emit Transfer", async () => {
      await expect(
        erc777WithAccount2.operatorSend(
          signers[0].address,
          signers[1].address,
          amount,
          data,
          operatorData
        )
      )
        .to.emit(erc777, "Transfer")
        .withArgs(signers[0].address, signers[1].address, amount);
    });

    it("should change balance", async () => {
      await expect(() =>
        erc777WithAccount2.operatorSend(
          signers[0].address,
          signers[1].address,
          amount,
          data,
          operatorData
        )
      ).to.changeTokenBalances(
        erc777,
        [signers[0], signers[1]],
        [amount.mul("-1"), amount]
      );
    });

    describe("recipient is contract", async () => {
      it("should fail if recipient contract doesn't have tokensToSend", async () => {
        await expect(
          erc777WithAccount2.operatorSend(
            signers[0].address,
            erc777Sender.address,
            amount,
            data,
            operatorData
          )
        ).to.be.revertedWith(
          "token recipient contract has no implementer for ERC777TokensRecipient"
        );
      });

      it("should success", async () => {
        await expect(() =>
          erc777WithAccount2.operatorSend(
            signers[0].address,
            erc777Recipient.address,
            amount,
            data,
            operatorData
          )
        ).to.changeTokenBalances(
          erc777,
          [signers[0], erc777Recipient],
          [amount.mul("-1"), amount]
        );
      });
    });
  });

  describe("operatorBurn", () => {
    const amount = ethers.BigNumber.from(10 ** 4);
    const data = ethers.utils.formatBytes32String("Test Data");
    const operatorData = ethers.utils.formatBytes32String("Test Operator Data");

    let erc777WithAccount1: ERC777;

    beforeEach(async () => {
      erc777WithAccount1 = erc777.connect(signers[1]);
    });

    it("should fail if not operator", async () => {
      const erc777WithAccount2 = erc777.connect(signers[2]);
      await expect(
        erc777WithAccount2.operatorBurn(
          signers[0].address,
          amount,
          data,
          operatorData
        )
      ).to.revertedWith("caller is not an operator for holder");
    });

    it("should fail if amount exceeds current balance", async () => {
      await expect(
        erc777.operatorBurn(signers[1].address, amount, data, operatorData)
      ).to.be.revertedWith("burn amount exceeds balance");
    });

    it("should emit Burned", async () => {
      await expect(
        erc777WithAccount1.operatorBurn(
          signers[0].address,
          amount,
          data,
          operatorData
        )
      )
        .to.emit(erc777, "Burned")
        .withArgs(
          signers[1].address,
          signers[0].address,
          amount,
          data,
          operatorData
        );
    });

    it("should emit Transfer", async () => {
      await expect(
        erc777WithAccount1.operatorBurn(
          signers[0].address,
          amount,
          data,
          operatorData
        )
      )
        .to.emit(erc777, "Transfer")
        .withArgs(signers[0].address, constants.ZERO_ADDRESS, amount);
    });

    it("should change balance", async () => {
      await expect(() =>
        erc777WithAccount1.operatorBurn(
          signers[0].address,
          amount,
          data,
          operatorData
        )
      ).to.changeTokenBalances(erc777, [signers[0]], [amount.mul("-1")]);
    });

    it("should change totalSupply", async () => {
      const oldTotalSupply = await erc777.totalSupply();
      await erc777WithAccount1.operatorBurn(
        signers[0].address,
        amount,
        data,
        operatorData
      );
      const newTotalSupply = await erc777.totalSupply();

      expect(oldTotalSupply.sub(newTotalSupply)).to.eq(amount);
    });
  });

  describe("allowance", () => {
    it("should return 0 as default", async () => {
      expect(
        await erc777.allowance(signers[0].address, signers[1].address)
      ).to.eq(0);
    });
  });

  describe("approve", () => {
    const amount = ethers.BigNumber.from(10 ** 4);

    it("should fail if spender address is zero", async () => {
      await expect(
        erc777.approve(constants.ZERO_ADDRESS, amount)
      ).to.be.revertedWith("to address must not be zero address");
    });

    it("should emit Approval", async () => {
      await expect(erc777.approve(signers[1].address, amount))
        .to.emit(erc777, "Approval")
        .withArgs(signers[0].address, signers[1].address, amount);
    });

    it("should change allowance", async () => {
      await erc777.approve(signers[1].address, amount);
      expect(
        await erc777.allowance(signers[0].address, signers[1].address)
      ).to.eq(amount);
    });
  });

  describe("transferFrom", () => {
    const approveAmount = ethers.BigNumber.from(10 ** 5);
    const amount = ethers.BigNumber.from(10 ** 4);

    let erc777WithAccount1: ERC777;

    beforeEach(async () => {
      erc777WithAccount1 = erc777.connect(signers[1]);
      await erc777.approve(signers[1].address, approveAmount);
    });

    it("should fail if recipient address is zero", async () => {
      await expect(
        erc777WithAccount1.transferFrom(
          signers[0].address,
          constants.ZERO_ADDRESS,
          amount
        )
      ).to.be.revertedWith("_recipient must not be zero address");
    });

    it("should fail if holder address is zero", async () => {
      await expect(
        erc777WithAccount1.transferFrom(
          constants.ZERO_ADDRESS,
          signers[2].address,
          amount
        )
      ).to.be.revertedWith("_holder must not be zero address");
    });

    it("should fail if amount exceeds allowance", async () => {
      const amount = ethers.BigNumber.from(10 ** 6);

      await expect(
        erc777WithAccount1.transferFrom(
          signers[0].address,
          signers[2].address,
          amount
        )
      ).to.be.revertedWith("transfer amount exceeds allowance");
    });

    it("should fail if amount exceeds balance", async () => {
      const amount = ethers.BigNumber.from("100000000000");

      await expect(
        erc777WithAccount1.transferFrom(
          signers[0].address,
          signers[2].address,
          amount
        )
      ).to.be.revertedWith("transfer amount exceeds balance");
    });

    it("should emit Sent", async () => {
      await expect(
        erc777WithAccount1.transferFrom(
          signers[0].address,
          signers[2].address,
          amount
        )
      )
        .to.emit(erc777, "Sent")
        .withArgs(
          signers[1].address,
          signers[0].address,
          signers[2].address,
          amount,
          "0x",
          "0x"
        );
    });

    it("should emit Transfer", async () => {
      await expect(
        erc777WithAccount1.transferFrom(
          signers[0].address,
          signers[2].address,
          amount
        )
      )
        .to.emit(erc777, "Transfer")
        .withArgs(signers[0].address, signers[2].address, amount);
    });

    it("should change balance", async () => {
      await expect(() =>
        erc777WithAccount1.transferFrom(
          signers[0].address,
          signers[2].address,
          amount
        )
      ).to.changeTokenBalances(
        erc777,
        [signers[0], signers[2]],
        [amount.mul("-1"), amount]
      );
    });
  });
});
