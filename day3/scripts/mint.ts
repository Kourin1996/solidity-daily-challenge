import { ethers } from "ethers";

const artifacts = require("../artifacts/contracts/ERC20.sol/ERC20.json");
const abi = artifacts.abi;
const contractAddress = "[YOUR_ERC20_CONTRACT_ADDRESS]";
const privateKey = "[ERC20_OWNERS_PRIVATE_KEY]";
const address = "[TARGET_ADDRESS]";
const amount = 10000;

const provider = ethers.getDefaultProvider("ropsten");
const contract = new ethers.Contract(contractAddress, abi, provider);
const wallet = new ethers.Wallet(privateKey, provider);

async function main(address: string, amount: number) {
  const contractWithSigner = contract.connect(wallet);

  const tx = await contractWithSigner.mint(address, amount);
  console.log(`called mint(${amount}), hash=${tx.hash}`);

  await tx.wait();

  const newBalance = await contract.balanceOf(address);
  console.log("done", { newBalance });
}

main(address, amount)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
