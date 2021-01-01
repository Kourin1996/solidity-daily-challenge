import { ethers } from "ethers";

const artifacts = require("../artifacts/contracts/Calculator.sol/Calculator.json");
const abi = artifacts.abi;
const contractAddress = "[YOUR_CONTRACT_ADDRESS]";
const privateKey = "[YOUR_WALLET_PRIVATE_KEY]";

const provider = ethers.getDefaultProvider("ropsten");
const contract = new ethers.Contract(contractAddress, abi, provider);
const wallet = new ethers.Wallet(privateKey, provider);

async function main() {
  const currentValue = await contract.getResult();
  const subtractedNumber = 10;

  const contractWithSigner = contract.connect(wallet);

  const tx = await contractWithSigner.subtracts(subtractedNumber);
  console.log(`called subtracts(${subtractedNumber}), hash=${tx.hash}`);

  await tx.wait();

  const newValue = await contract.getResult();
  console.log("done", { oldValue: currentValue, subtractedNumber, newValue });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
