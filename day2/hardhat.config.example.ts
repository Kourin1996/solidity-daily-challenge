import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{ version: "0.8.0", settings: {} }],
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:7545",
      accounts: ["[GANACHE_ACCOUNT_PRIVATE_KEY]"],
    },
  },
};

export default config;
