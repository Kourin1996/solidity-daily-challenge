import { ethers } from "hardhat";
import { TokenMarket } from "../typechain/TokenMarket";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const tokenMarketFactory = await ethers.getContractFactory("TokenMarket");
  const tokenMarket = (await tokenMarketFactory.deploy(
    "TestToken",
    "TT",
    ethers.BigNumber.from("1" + "0".repeat(30)),
    // Oracle for ETH/USD in Kovan
    "0x9326BFA02ADD2366b30bacB125260Af641031331",
    ethers.BigNumber.from(1),
    ethers.BigNumber.from(18)
  )) as TokenMarket;

  console.log("Contract address:", tokenMarket.address);
  console.log("Token Address: ", await tokenMarket.tokenAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
