import { ethers } from "hardhat";

const name = "[YOUR_TOKEN_NAME]";
const symbol = "[YOUR_TOKEN_SYMBOL]";
const totalSupply = 0;
const decimals = 0;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("ERC20");
  const token = await Token.deploy(
    ethers.utils.formatBytes32String(name),
    ethers.utils.formatBytes32String(symbol),
    totalSupply,
    decimals
  );

  console.log("Token address:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
