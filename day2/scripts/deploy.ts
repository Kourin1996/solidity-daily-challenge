import { ethers } from "hardhat";

async function main(proposals: string[]) {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("Ballot");
  const token = await Token.deploy(
    proposals.map((n) => ethers.utils.formatBytes32String(n))
  );

  console.log("Token address:", token.address);
}

const PROPOSALS = ["Proposal1", "Proposal2", "Proposal3"];

main(PROPOSALS)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
