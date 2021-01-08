import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { DomainNameServer } from "../typechain/DomainNameServer";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.use(solidity);
const { expect } = chai;

describe("DomainNameServer", () => {
  let domainNameServer: DomainNameServer;
  let signers: SignerWithAddress[] = [];

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const domainNameServerFactory = await ethers.getContractFactory(
      "DomainNameServer",
      signers[0]
    );

    domainNameServer = (await domainNameServerFactory.deploy()) as DomainNameServer;
    await domainNameServer.deployed();

    expect(domainNameServer.address).to.properAddress;
  });

  describe("register", () => {
    it("should fail because of insufficient of value", async () => {
      await expect(
        domainNameServer.register("test", {
          value: ethers.utils.parseEther("0.5"),
        })
      ).to.be.reverted;
    });

    it("should fail after second time", async () => {
      await domainNameServer.register("test", {
        value: ethers.utils.parseEther("1"),
      });

      await expect(
        domainNameServer.register("test", {
          value: ethers.utils.parseEther("1"),
        })
      ).to.be.reverted;
    });

    it("should success", async () => {
      await expect(
        domainNameServer.register("test", {
          value: ethers.utils.parseEther("1"),
        })
      )
        .to.emit(domainNameServer, "Register")
        .withArgs("test", signers[0].address);
    });

    it("should success in expired domain", async () => {
      const domainName = "test";
      const domainNameServerWithAccount1 = domainNameServer.connect(signers[0]);
      const domainNameServerWithAccount2 = domainNameServer.connect(signers[1]);

      await domainNameServerWithAccount1.register(domainName, {
        value: ethers.utils.parseEther("1"),
      });

      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_increaseTime", [1000 * 3600 * 24 * 366]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        domainNameServerWithAccount2.register(domainName, {
          value: ethers.utils.parseEther("1"),
        })
      )
        .to.emit(domainNameServer, "Register")
        .withArgs("test", signers[1].address);
    });
  });

  describe("renew", () => {
    const domainName = "test";

    beforeEach(async () => {
      await domainNameServer.register(domainName, {
        value: ethers.utils.parseEther("1"),
      });
    });

    it("should fail because of insufficient of value", async () => {
      await expect(
        domainNameServer.renew(domainName, {
          value: ethers.utils.parseEther("0.4"),
        })
      ).to.be.reverted;
    });

    it("should fail if not owner", async () => {
      const domainNameServerWithAccount2 = domainNameServer.connect(signers[1]);
      await expect(
        domainNameServerWithAccount2.renew(domainName, {
          value: ethers.utils.parseEther("0.5"),
        })
      ).to.be.reverted;
    });

    it("should fail if domain is expired", async () => {
      await ethers.provider.send("evm_increaseTime", [1000 * 3600 * 24 * 366]);
      await ethers.provider.send("evm_mine", []);
      await expect(
        domainNameServer.renew(domainName, {
          value: ethers.utils.parseEther("0.5"),
        })
      ).to.be.reverted;
    });

    it("should success", async () => {
      await expect(
        domainNameServer.renew(domainName, {
          value: ethers.utils.parseEther("0.5"),
        })
      ).not.to.reverted;
    });
  });

  describe("setPath", () => {
    const domainName = "test";
    const path = "/hoge";

    beforeEach(async () => {
      await domainNameServer.register(domainName, {
        value: ethers.utils.parseEther("1"),
      });
    });

    it("should fail if not owner", async () => {
      const target = signers[0].address;

      const domainNameServerWithAccount2 = domainNameServer.connect(signers[1]);
      await expect(
        domainNameServerWithAccount2.setPath(domainName, path, target)
      ).to.be.reverted;
    });

    it("should fail if domain is expired", async () => {
      const target = signers[0].address;

      await ethers.provider.send("evm_increaseTime", [1000 * 3600 * 24 * 366]);
      await ethers.provider.send("evm_mine", []);
      await expect(domainNameServer.setPath(domainName, path, target)).to.be
        .reverted;
    });

    it("should success", async () => {
      const target = signers[0].address;

      await expect(domainNameServer.setPath(domainName, path, target)).not.to
        .reverted;
    });
  });

  describe("lookup", () => {
    const domainName = "test";
    const path = "/hoge";
    const fakeDomainName = "fake";
    const fakePath = "/fuga";
    let target: string = "";

    beforeEach(async () => {
      target = signers[0].address;
      await domainNameServer.register(domainName, {
        value: ethers.utils.parseEther("1"),
      });
      await domainNameServer.setPath(domainName, path, target);
    });

    it("should not find domain", async () => {
      await expect(domainNameServer.lookUp(fakeDomainName, path)).to.be
        .reverted;
    });

    it("should not find domain because of expired domain", async () => {
      await ethers.provider.send("evm_increaseTime", [1000 * 3600 * 24 * 366]);
      await ethers.provider.send("evm_mine", []);
      await expect(domainNameServer.lookUp(domainName, path)).to.be.reverted;
    });

    it("should not find path", async () => {
      await expect(domainNameServer.lookUp(domainName, fakePath)).to.be
        .reverted;
    });

    it("should success", async () => {
      expect(await domainNameServer.lookUp(domainName, path)).to.eq(target);
    });
  });
});
