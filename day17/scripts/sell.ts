import { ethers } from "hardhat";
import { TokenMarket } from "../typechain/TokenMarket";
import { TestToken } from "../typechain/TestToken";

const tokenMarketArtifacts = require("../artifacts/contracts/TokenMarket.sol/TokenMarket.json");
const tokenMarketAbi = tokenMarketArtifacts.abi;
const testTokenArtifacts = require("../artifacts/contracts/TestToken.sol/TestToken.json");
const testTokenAbi = testTokenArtifacts.abi;

const contractAddress = "";
const amount = ethers.BigNumber.from("1" + "0".repeat(18)).mul(2);

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = ethers.getDefaultProvider("kovan");
  const tokenMarket = new ethers.Contract(
    contractAddress,
    tokenMarketAbi,
    provider
  ).connect(deployer) as TokenMarket;

  const testToken = new ethers.Contract(
    await tokenMarket.tokenAddress(),
    testTokenAbi,
    provider
  ).connect(deployer) as TestToken;

  console.log("approve", amount);
  const approveTx = await testToken.approve(tokenMarket.address, amount);
  console.log("approve tx", approveTx.hash);

  await approveTx.wait();

  console.log("sell token", amount);
  const tx = await tokenMarket.sell(amount, {
    gasLimit: 100000,
  });
  console.log("sell tx", tx.hash);
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
