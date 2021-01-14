import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { PaymentChannel } from "../typechain/PaymentChannel";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber } from "ethers";

chai.use(solidity);
const { expect } = chai;

const createMessage = (contractAddress: string, amount: BigNumber) => {
  return ethers.utils.solidityKeccak256(
    ["address", "uint256"],
    [contractAddress, amount]
  );
};

describe("PaymentChannel", () => {
  let paymentChannel: PaymentChannel;
  let signers: SignerWithAddress[] = [];

  let paymentChannelWithAccount0: PaymentChannel;
  let paymentChannelWithAccount1: PaymentChannel;
  let paymentChannelWithAccount2: PaymentChannel;

  const duration = 7 * 86400;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const paymentChannelFactory = await ethers.getContractFactory(
      "PaymentChannel",
      signers[0]
    );
    paymentChannel = (await paymentChannelFactory.deploy(
      signers[1].address,
      duration
    )) as PaymentChannel;

    await paymentChannel.deployed();

    expect(paymentChannel.address).to.properAddress;

    paymentChannelWithAccount0 = paymentChannel.connect(signers[0]);
    paymentChannelWithAccount1 = paymentChannel.connect(signers[1]);
    paymentChannelWithAccount2 = paymentChannel.connect(signers[2]);
  });

  describe("close", async () => {
    const initialDeposit = ethers.utils.parseEther("5");
    const transferAmount = ethers.utils.parseEther("1");
    const wrongAmount = ethers.utils.parseEther("2");
    let signature: string;

    beforeEach(async () => {
      await signers[0].sendTransaction({
        to: paymentChannel.address,
        value: initialDeposit,
      });

      const message = createMessage(paymentChannel.address, transferAmount);
      // ethers.js prefixes with "\x19Ethereum Signed Message:\n32"
      signature = await signers[0].signMessage(ethers.utils.arrayify(message));

      const signerAddress = ethers.utils.verifyMessage(
        ethers.utils.arrayify(message),
        signature
      );
      expect(signerAddress).to.eq(signers[0].address);
    });

    it("should fail if the account other than payee calls", async () => {
      await expect(
        paymentChannelWithAccount2.close(transferAmount, signature)
      ).to.be.revertedWith("Not payee");
    });

    it("should fail if the transfer amount different from the value defined in signature", async () => {
      await expect(
        paymentChannelWithAccount1.close(wrongAmount, signature)
      ).to.be.revertedWith("Signature is not valid");
    });

    it("should success", async () => {
      await expect(() =>
        paymentChannelWithAccount1.close(transferAmount, signature)
      ).to.changeEtherBalances(
        [paymentChannel, signers[0], signers[1]],
        [
          initialDeposit.mul("-1"),
          initialDeposit.sub(transferAmount),
          transferAmount,
        ]
      );
    });
  });

  describe("kill", async () => {
    const initialDeposit = ethers.utils.parseEther("5");

    beforeEach(async () => {
      await signers[0].sendTransaction({
        to: paymentChannel.address,
        value: initialDeposit,
      });
    });

    it("should fail if the account other than payer calls", async () => {
      await expect(paymentChannelWithAccount2.kill()).to.be.revertedWith(
        "Not payer"
      );
    });

    it("should fail if it's not expired", async () => {
      await expect(paymentChannelWithAccount0.kill()).to.be.revertedWith(
        "Not expired"
      );
    });

    it("should success", async () => {
      ethers.provider.send("evm_increaseTime", [duration + 86400]);
      ethers.provider.send("evm_mine", []);

      await expect(() =>
        paymentChannelWithAccount0.kill()
      ).to.changeEtherBalances(
        [paymentChannel, signers[0]],
        [initialDeposit.mul("-1"), initialDeposit]
      );
    });
  });
});
