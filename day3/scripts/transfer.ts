import { ethers } from "ethers";

const artifacts = require("../artifacts/contracts/ERC20.sol/ERC20.json");
const abi = artifacts.abi;
const contractAddress = "[YOUR_ERC20_CONTRACT_ADDRESS]";
const privateKey = "[PRIVATE_KEY_OF_SOURCE_ACCOUNT]";
const target = "[TARGET_ACCOUNT_ADDRESS]";
const amount = 100;

const provider = ethers.getDefaultProvider("ropsten");
const contract = new ethers.Contract(contractAddress, abi, provider);
const wallet = new ethers.Wallet(privateKey, provider);

async function main(targetAddress: string, amount: number) {
  const contractWithSigner = contract.connect(wallet);

  const tx = await contractWithSigner.transfer(targetAddress, amount);
  console.log(`called mint(${targetAddress}, ${amount}), hash=${tx.hash}`);

  await tx.wait();

  const sourceBalance = await contract.balanceOf(wallet.address);
  const targetBalance = await contract.balanceOf(targetAddress);
  console.log("done", { sourceBalance, targetBalance });
}

main(target, amount)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
