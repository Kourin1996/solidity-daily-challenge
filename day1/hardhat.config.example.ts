import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";
import "@nomiclabs/hardhat-etherscan";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{ version: "0.6.8", settings: {} }],
  },
  networks: {
    hardhat: {},
    ropsten: {
      url: "https://ropsten.infura.io/v3/[YOUR_PROJECT_ID]",
      accounts: ["[YOUR_WALLET_PRIVATE_KEY]"],
    },
  },
  etherscan: {
    apiKey: "[YOUR_ETHERSCAN_API_KEY]",
  },
};

export default config;
