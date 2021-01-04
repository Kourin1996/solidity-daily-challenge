# Day2 Voting - Expanded from the official example

## Target

- To know modifier
- To know how to run locally with ganache

## New Tools

### Ganache
The tools to run Ethereum blockchain locally for debug


## Note

### Project setup

Inherit project structure from day1

Update hardhat.config.ts
```ts
import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";
import "@nomiclabs/hardhat-ganache";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{ version: "0.8.0", settings: {} }],
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:7545",
      accounts: [
        "[GANACHE_ACCOUNT_PRIVATE_KEY]",
      ],
    },
  },
};

export default config;
```

### Deploy

Deploy to ganache

```bash
npx hardhat run --network localhost scripts/deploy.ts
```


## References
- https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
- https://hardhat.org/
- https://www.trufflesuite.com/ganache
