import { ethers } from "ethers";

const artifacts = require("../artifacts/contracts/Ballot.sol/Ballot.json");
const abi = artifacts.abi;
const contractAddress = "[CONTRACT_ADDRESS]";
const chairpersonPrivateKey = "[CHAIRPERSON_PRIVATE_KEY]";
const account1PrivateKey = "[ACCOUNT_1_PRIVATE_KEY";

const url = "http://localhost:7545";
const provider = new ethers.providers.JsonRpcProvider(url);
const contract = new ethers.Contract(contractAddress, abi, provider);
const chairpersonWallet = new ethers.Wallet(chairpersonPrivateKey, provider);
const account1Wallet = new ethers.Wallet(account1PrivateKey, provider);

async function main() {
  const contractWithChairperson = contract.connect(chairpersonWallet);
  const contractWithAccount1 = contract.connect(account1Wallet);

  await (
    await contractWithChairperson.giveRightToVote(account1Wallet.address)
  ).wait();
  console.log(`Gave right to vote to ${account1Wallet.address}`);

  await (await contractWithAccount1.vote(1)).wait();
  console.log("Account 1 vote to 2");

  await (await contractWithChairperson.close()).wait();
  console.log("Closed");

  const result = await contractWithChairperson.winnerName();
  console.log("result", result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
