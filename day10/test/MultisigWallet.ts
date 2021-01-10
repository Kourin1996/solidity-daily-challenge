import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { MultisigWallet } from "../typechain/MultisigWallet";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber, BytesLike, ContractFactory } from "ethers";

chai.use(solidity);
const { expect } = chai;

async function sendEther(
  signer: SignerWithAddress,
  to: string,
  value: BigNumber
) {
  const [nonce, chainId, gasPrice] = await Promise.all([
    signer.getTransactionCount(),
    signer.getChainId(),
    signer.getGasPrice(),
  ]);
  const transaction = {
    nonce,
    chainId,
    gasPrice,
    gasLimit: 40000,
    to,
    value,
    data: "0x",
  };

  return signer.sendTransaction(transaction);
}

describe("Multisig Wallet", () => {
  let multisigWallet: MultisigWallet;
  let signers: SignerWithAddress[] = [];
  let initialAccounts: SignerWithAddress[] = [];
  const numberOfInitialAccounts = 3;
  const initialRequiredConfirmations = 2;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    initialAccounts = signers.slice(0, numberOfInitialAccounts);

    const multisigWalletFactory = await ethers.getContractFactory(
      "MultisigWallet",
      signers[0]
    );
    multisigWallet = (await multisigWalletFactory.deploy(
      initialAccounts.map((a) => a.address),
      initialRequiredConfirmations
    )) as MultisigWallet;

    await multisigWallet.deployed();

    expect(multisigWallet.address).to.properAddress;
  });

  describe("constructor", () => {
    let multisigWalletFactory: ContractFactory;

    beforeEach(async () => {
      multisigWalletFactory = await ethers.getContractFactory(
        "MultisigWallet",
        signers[0]
      );
    });

    it("should fail if accounts are empty", async () => {
      await expect(multisigWalletFactory.deploy([], 0)).to.be.reverted;
    });

    it("should fail if number of initial accounts is equal or greater than 2^8", async () => {
      const accounts = new Array(2 ** 8).fill(signers[0]).map((a) => a.address);
      const numberOfRequiredConfirmations = Math.floor(accounts.length / 2);
      await expect(
        multisigWalletFactory.deploy(accounts, numberOfRequiredConfirmations)
      ).to.be.reverted;
    });

    it("should fail if number of required confirmations is equal or less than number of initial accounts", async () => {
      const accounts = initialAccounts.map((a) => a.address);
      const numberOfRequiredConfirmations = initialAccounts.length + 5;
      await expect(
        multisigWalletFactory.deploy(accounts, numberOfRequiredConfirmations)
      ).to.be.reverted;
    });

    it("should success", async () => {
      const accounts = initialAccounts.map((a) => a.address);
      await expect(
        multisigWalletFactory.deploy(accounts, initialRequiredConfirmations)
      ).not.to.be.reverted;
    });
  });

  describe("receive", () => {
    const value = ethers.utils.parseEther("1");

    it("should not emit Deposit event if value is zero", async () => {
      const value = ethers.utils.parseEther("0");
      await expect(
        sendEther(signers[0], multisigWallet.address, value)
      ).not.to.emit(multisigWallet, "Deposit");
    });

    it("should emit Deposit event", async () => {
      await expect(sendEther(signers[0], multisigWallet.address, value))
        .to.emit(multisigWallet, "Deposit")
        .withArgs(await multisigWallet.signer.getAddress(), value);
    });

    it("should change balance", async () => {
      await expect(() =>
        sendEther(signers[0], multisigWallet.address, value)
      ).to.changeEtherBalance(multisigWallet, value);
    });
  });

  describe("transfer", () => {
    const value = ethers.utils.parseEther("1");

    it("should fail if the account who doesn't join to wallet calls", async () => {
      const destination = signers[0].address;

      const account = signers[5];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(
        multisigWalletWithAccount.transfer(destination, value)
      ).to.be.revertedWith("Only registered accounts can call");
    });

    it("should success", async () => {
      const destination = signers[0].address;

      await expect(multisigWallet.transfer(destination, value)).to.emit(
        multisigWallet,
        "TransactionCreated"
      );
    });
  });

  describe("addAccount", () => {
    it("should fail if the account who doesn't join to wallet calls", async () => {
      const newAccount = signers[5].address;

      const account = signers[5];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(
        multisigWalletWithAccount.addAccount(newAccount)
      ).to.be.revertedWith("Only registered accounts can call");
    });

    it("should fail if the account has already joined", async () => {
      const newAccount = signers[0].address;

      await expect(multisigWallet.addAccount(newAccount)).to.be.revertedWith(
        "The account has already joined"
      );
    });

    it("should success", async () => {
      const newAccount = signers[5].address;

      await expect(multisigWallet.addAccount(newAccount)).to.emit(
        multisigWallet,
        "TransactionCreated"
      );
    });
  });

  describe("removeAccount", () => {
    it("should fail if the account who doesn't join to wallet calls", async () => {
      const removeAccount = signers[0].address;

      const account = signers[5];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(
        multisigWalletWithAccount.addAccount(removeAccount)
      ).to.be.revertedWith("Only registered accounts can call");
    });

    it("should fail if the account doesn't exist in wallet", async () => {
      const removeAccount = signers[5].address;

      await expect(
        multisigWallet.removeAccount(removeAccount)
      ).to.be.revertedWith("The account doesn't exist in wallet");
    });

    it("should success", async () => {
      const removeAccount = signers[0].address;

      await expect(multisigWallet.removeAccount(removeAccount)).to.emit(
        multisigWallet,
        "TransactionCreated"
      );
    });
  });

  describe("changeRequiredConfirmations", () => {
    it("should fail if the account who doesn't join to wallet calls", async () => {
      const account = signers[5];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(
        multisigWalletWithAccount.changeRequiredConfirmations(
          numberOfInitialAccounts
        )
      ).to.be.revertedWith("Only registered accounts can call");
    });

    it("should fail if the value exceeds number of current accounts", async () => {
      await expect(
        multisigWallet.changeRequiredConfirmations(numberOfInitialAccounts + 5)
      ).to.be.revertedWith(
        "Number of required confirmations must be equal or less than number of accounts"
      );
    });

    it("should success", async () => {
      await expect(
        multisigWallet.changeRequiredConfirmations(numberOfInitialAccounts - 1)
      ).to.emit(multisigWallet, "TransactionCreated");
    });
  });

  describe("transfer", () => {
    const value = ethers.utils.parseEther("1");

    it("should fail if the account who doesn't join to wallet calls", async () => {
      const destination = signers[0].address;

      const account = signers[5];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(
        multisigWalletWithAccount.transfer(destination, value)
      ).to.be.revertedWith("Only registered accounts can call");
    });

    it("should success", async () => {
      const destination = signers[0].address;

      await expect(multisigWallet.transfer(destination, value)).to.emit(
        multisigWallet,
        "TransactionCreated"
      );
    });
  });

  describe("confirm", () => {
    let transactionId: BytesLike;

    beforeEach(async () => {
      const destination = signers[0].address;
      const value = ethers.utils.parseEther("1");

      const tx = await multisigWallet.transfer(destination, value);
      const res = await tx.wait();
      const event = (res.events ?? []).find(
        (e) => e.event === "TransactionCreated"
      );
      const args = event?.args ?? [];
      transactionId = args[0];
    });

    it("should fail for non exist transaction", async () => {
      const account = signers[1];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(
        multisigWalletWithAccount.confirm(
          ethers.utils.hexlify(new Array(32).fill(0))
        )
      ).to.be.revertedWith("Transaction doesn't exist");
    });

    it("should fail if the account who doesn't join to wallet calls", async () => {
      const account = signers[5];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(
        multisigWalletWithAccount.confirm(transactionId)
      ).to.be.revertedWith("Only registered accounts can call");
    });

    it("should fail after 2nd time", async () => {
      const account = signers[1];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await multisigWalletWithAccount.confirm(transactionId);
      await expect(
        multisigWalletWithAccount.confirm(transactionId)
      ).to.be.revertedWith("The account has already voted");
    });

    it("should success", async () => {
      const account = signers[1];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(multisigWalletWithAccount.confirm(transactionId))
        .to.emit(multisigWallet, "Confirmation")
        .withArgs(transactionId, account.address);
    });
  });

  describe("revoke", () => {
    let transactionId: BytesLike;

    beforeEach(async () => {
      const destination = signers[0].address;
      const value = ethers.utils.parseEther("1");

      const tx = await multisigWallet.transfer(destination, value);
      const res = await tx.wait();
      const event = (res.events ?? []).find(
        (e) => e.event === "TransactionCreated"
      );
      const args = event?.args ?? [];
      transactionId = args[0];
    });

    it("should fail for non exist transaction", async () => {
      const account = signers[1];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(
        multisigWalletWithAccount.revoke(
          ethers.utils.hexlify(new Array(32).fill(0))
        )
      ).to.be.revertedWith("Transaction doesn't exist");
    });

    it("should fail if the account who doesn't join to wallet calls", async () => {
      const account = signers[5];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(
        multisigWalletWithAccount.revoke(transactionId)
      ).to.be.revertedWith("Only registered accounts can call");
    });

    it("should fail after 2nd time", async () => {
      const account = signers[1];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await multisigWalletWithAccount.revoke(transactionId);
      await expect(
        multisigWalletWithAccount.revoke(transactionId)
      ).to.be.revertedWith("The account has already voted");
    });

    it("should success", async () => {
      const account = signers[1];
      const multisigWalletWithAccount = multisigWallet.connect(account);

      await expect(multisigWalletWithAccount.revoke(transactionId))
        .to.emit(multisigWallet, "Revocation")
        .withArgs(transactionId, account.address);
    });
  });

  describe("executeTransaction", () => {
    let contractsWithSigners: MultisigWallet[];
    let transactionId: BytesLike;

    beforeEach(() => {
      contractsWithSigners = signers.map((s) => multisigWallet.connect(s));
    });

    describe("pre-check", async () => {
      beforeEach(async () => {
        const target = signers[numberOfInitialAccounts];

        const tx = await multisigWallet.addAccount(target.address);
        const res = await tx.wait();
        const event = (res.events ?? []).find(
          (e) => e.event === "TransactionCreated"
        );
        const args = event?.args ?? [];
        transactionId = args[0];
      });

      it("should fail if the account who doesn't join to wallet calls", async () => {
        await expect(
          contractsWithSigners[5].executeTransaction(transactionId)
        ).to.be.revertedWith("Only registered accounts can call");
      });

      it("should fail for non exist transaction", async () => {
        await expect(
          contractsWithSigners[0].executeTransaction(
            ethers.utils.hexlify(new Array(32).fill(0))
          )
        ).to.be.revertedWith("Transaction doesn't exist");
      });

      it("should fail if required number of confirmations doesn't exceed", async () => {
        await expect(
          contractsWithSigners[0].executeTransaction(transactionId)
        ).to.be.revertedWith(
          "The transaction doesn't meet required confirmations"
        );
      });

      it("should fail if transaction has been executed", async () => {
        await contractsWithSigners[1].confirm(transactionId);
        await contractsWithSigners[0].executeTransaction(transactionId);
        await expect(
          contractsWithSigners[0].executeTransaction(transactionId)
        ).to.be.revertedWith("The transaction has been executed");
      });
    });

    describe("add account", async () => {
      let targetAddress: string;

      beforeEach(async () => {
        const target = signers[numberOfInitialAccounts];
        targetAddress = target.address;

        const tx = await multisigWallet.addAccount(targetAddress);
        const res = await tx.wait();
        const event = (res.events ?? []).find(
          (e) => e.event === "TransactionCreated"
        );
        const args = event?.args ?? [];
        transactionId = args[0];

        await contractsWithSigners[1].confirm(transactionId);
      });

      it("should fail if the number of accounts exceeds 255", async () => {
        const randomAccountAddresses = new Array(255 - numberOfInitialAccounts)
          .fill(null)
          .map(() => ethers.utils.randomBytes(20));
        await Promise.all(
          randomAccountAddresses.map(async (accountAddress) => {
            const address = ethers.utils.hexlify(accountAddress);
            const tx = await multisigWallet.addAccount(address);
            const res = await tx.wait();
            const event = (res.events ?? []).find(
              (e) => e.event === "TransactionCreated"
            );
            const args = event?.args ?? [];
            const transactionId = args[0];

            await contractsWithSigners[1].confirm(transactionId);
            await contractsWithSigners[0].executeTransaction(transactionId);
          })
        );

        await expect(
          contractsWithSigners[0].executeTransaction(transactionId)
        ).to.be.revertedWith(
          "Number of accounts cannot exceed upper limit 255"
        );
      });

      it("should fail if the account has been already joined", async () => {
        const tx = await multisigWallet.addAccount(targetAddress);
        const res = await tx.wait();
        const event = (res.events ?? []).find(
          (e) => e.event === "TransactionCreated"
        );
        const args = event?.args ?? [];
        const transactionId2 = args[0];
        await contractsWithSigners[1].confirm(transactionId2);
        await contractsWithSigners[0].executeTransaction(transactionId2);

        await expect(
          contractsWithSigners[0].executeTransaction(transactionId)
        ).to.be.revertedWith("The account has already joined");
      });

      it("should success", async () => {
        await expect(contractsWithSigners[0].executeTransaction(transactionId))
          .to.emit(multisigWallet, "AccountAddition")
          .withArgs(targetAddress);
      });
    });

    describe("remove account", async () => {
      let targetAddress: string;

      beforeEach(async () => {
        const target = signers[numberOfInitialAccounts - 1];
        targetAddress = target.address;

        const tx = await multisigWallet.removeAccount(targetAddress);
        const res = await tx.wait();
        const event = (res.events ?? []).find(
          (e) => e.event === "TransactionCreated"
        );
        const args = event?.args ?? [];
        transactionId = args[0];

        await contractsWithSigners[1].confirm(transactionId);
      });

      it("should fail if the account is tha last one in wallet", async () => {
        {
          // Change number of confirmations
          const tx = await multisigWallet.changeRequiredConfirmations(1);
          const res = await tx.wait();
          const event = (res.events ?? []).find(
            (e) => e.event === "TransactionCreated"
          );
          const args = event?.args ?? [];
          const transactionId = args[0];
          await contractsWithSigners[1].confirm(transactionId);
          await contractsWithSigners[0].executeTransaction(transactionId);
        }
        {
          // Remove other accounts
          await Promise.all(
            signers.slice(0, 2).map(async (s) => {
              const tx = await contractsWithSigners[2].removeAccount(s.address);
              const res = await tx.wait();
              const event = (res.events ?? []).find(
                (e) => e.event === "TransactionCreated"
              );
              const args = event?.args ?? [];
              const transactionId = args[0];

              await contractsWithSigners[2].executeTransaction(transactionId);
            })
          );
        }

        await expect(
          contractsWithSigners[2].executeTransaction(transactionId)
        ).to.be.revertedWith("At least one account must exist in wallet");
      });

      it("should fail if the number of accounts equals to number of required confirmations", async () => {
        {
          // Change number of confirmations
          const tx = await multisigWallet.changeRequiredConfirmations(3);
          const res = await tx.wait();
          const event = (res.events ?? []).find(
            (e) => e.event === "TransactionCreated"
          );
          const args = event?.args ?? [];
          const transactionId = args[0];
          await contractsWithSigners[1].confirm(transactionId);
          await contractsWithSigners[0].executeTransaction(transactionId);
        }

        await contractsWithSigners[2].confirm(transactionId);
        await expect(
          multisigWallet.executeTransaction(transactionId)
        ).to.be.revertedWith(
          "Number of required confirmations must be equal or less than number of accounts"
        );
      });

      it("should fail if the account doesn't exist", async () => {
        {
          // Change number of confirmations
          const tx = await multisigWallet.changeRequiredConfirmations(1);
          const res = await tx.wait();
          const event = (res.events ?? []).find(
            (e) => e.event === "TransactionCreated"
          );
          const args = event?.args ?? [];
          const transactionId = args[0];
          await contractsWithSigners[1].confirm(transactionId);
          await contractsWithSigners[0].executeTransaction(transactionId);
        }
        {
          // Remove the account
          const tx = await multisigWallet.removeAccount(targetAddress);
          const res = await tx.wait();
          const event = (res.events ?? []).find(
            (e) => e.event === "TransactionCreated"
          );
          const args = event?.args ?? [];
          const transactionId = args[0];

          await contractsWithSigners[0].executeTransaction(transactionId);
        }

        await expect(
          contractsWithSigners[0].executeTransaction(transactionId)
        ).to.be.revertedWith("The account doesn't exist in wallet");
      });

      it("should success", async () => {
        await expect(contractsWithSigners[0].executeTransaction(transactionId))
          .to.emit(multisigWallet, "AccountRemoval")
          .withArgs(targetAddress);
      });
    });

    describe("change number of required confirmations", async () => {
      it("should fail if new required confirmations is greater than number of current accounts", async () => {
        const numberOfRequiredConfirmations = initialAccounts.length;

        const tx = await multisigWallet.changeRequiredConfirmations(
          numberOfRequiredConfirmations
        );
        const res = await tx.wait();
        const event = (res.events ?? []).find(
          (e) => e.event === "TransactionCreated"
        );
        const args = event?.args ?? [];
        const transactionId = args[0];
        await contractsWithSigners[1].confirm(transactionId);

        {
          // remove account
          const tx = await multisigWallet.removeAccount(
            initialAccounts[initialAccounts.length - 1].address
          );
          const res = await tx.wait();
          const event = (res.events ?? []).find(
            (e) => e.event === "TransactionCreated"
          );
          const args = event?.args ?? [];
          const transactionId = args[0];
          await contractsWithSigners[1].confirm(transactionId);
          await contractsWithSigners[0].executeTransaction(transactionId);
        }

        await expect(
          contractsWithSigners[0].executeTransaction(transactionId)
        ).to.revertedWith(
          "Number of required confirmations must be equal or less than number of accounts"
        );
      });

      it("should success", async () => {
        const numberOfRequiredConfirmations = 1;

        const tx = await multisigWallet.changeRequiredConfirmations(
          numberOfRequiredConfirmations
        );
        const res = await tx.wait();
        const event = (res.events ?? []).find(
          (e) => e.event === "TransactionCreated"
        );
        const args = event?.args ?? [];
        const transactionId = args[0];

        await contractsWithSigners[1].confirm(transactionId);

        await expect(contractsWithSigners[0].executeTransaction(transactionId))
          .to.emit(multisigWallet, "RequiredConfirmationChange")
          .withArgs(numberOfRequiredConfirmations);
      });
    });

    describe("transfer", async () => {
      const initialAmount = ethers.utils.parseEther("5");
      const transferAmount = ethers.utils.parseEther("3");
      let target: SignerWithAddress;

      beforeEach(async () => {
        target = signers[numberOfInitialAccounts + 1];

        const tx = await multisigWallet.transfer(
          target.address,
          transferAmount
        );
        const res = await tx.wait();
        const event = (res.events ?? []).find(
          (e) => e.event === "TransactionCreated"
        );
        const args = event?.args ?? [];
        transactionId = args[0];

        await contractsWithSigners[1].confirm(transactionId);
      });

      it("should fail if the contract doesn't have enough balance", async () => {
        await expect(contractsWithSigners[0].executeTransaction(transactionId))
          .to.be.reverted;
      });

      it("should success and emit event", async () => {
        await sendEther(signers[0], multisigWallet.address, initialAmount);

        await expect(contractsWithSigners[0].executeTransaction(transactionId))
          .to.emit(multisigWallet, "Transfer")
          .withArgs(target.address, transferAmount);
      });

      it("should success and change the balances", async () => {
        await sendEther(signers[0], multisigWallet.address, initialAmount);

        await expect(() =>
          contractsWithSigners[0].executeTransaction(transactionId)
        ).to.changeEtherBalances(
          [multisigWallet, target],
          [transferAmount.mul("-1"), transferAmount]
        );
      });
    });
  });
});
