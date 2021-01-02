# day1

## Biding target

- To know how to start smart contract project with latest tools

## New Tools

### Hardhat

A develop environment for Ethereum.  
Helps developers manage and automate the recurring tasks  
Allows developer to use console debugging

### Ethers.js
A replacement of web3.js  
Has a rich functions like ABICoder, HDNode, BigNumber and various formatting utilities

### Waffle
A lightweight test runner for Ethereum smart contracts  
Typescript native
Allows developer to write test like Chai (known as a one of popular JS/TS test tool)

### TypeChain
The tool to generate typescript interface for contract

## Note

### Project setup

```bash
npm init
npm install --save-dev hardhat
npx hardhat
# Select "Create an empty hardhat.config.js"

mkdir contracts test scripts
npm install --save-dev ts-node typescript @types/node @types/mocha
```

Add tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "resolveJsonModule": true
  },
  "include": ["./scripts", "./test"],
  "files": [
    "./hardhat.config.ts"
  ]
}
```

Convert hardhat.config.js to typescript code

```bash
mv hardhat.config.js hardhat.config.ts
```

```ts
import { HardhatUserConfig } from "hardhat/types";

const config: HardhatUserConfig = {
  solidity: "0.6.8",
};

export default config;
```

### Write code

Write contract code in contracts/Calculator.sol

Compile

```bash
npx hardhat compile
```

### Set up test environment

```bash
npm install --save-dev chai ethers @nomiclabs/hardhat-waffle @nomiclabs/hardhat-ethers ethereum-waffle hardhat-typechain typechain ts-generator @typechain/ethers-v5
```

Update hardset.config.ts

```ts
import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: "0.6.8", settings: {} }],
  },
};

export default config;
```

### Write test

Write test code in test/counter.ts

Update hardset.config.ts

```ts
import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{ version: "0.6.8", settings: {} }],
  },
};

export default config;
```

Execute test

```bash
npx hardhat test
```

### Deploy contracts via infura

Create infura account and ropsten wallet via metamask

Update hardhat.config.ts

```ts
import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{ version: "0.6.8", settings: {} }],
  },
  networks: {
    hardhat: {},
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`${ROPSTEN_PRIVATE_KEY}`],
    },
  },
};

export default config;
```

Add deploy scripts into scripts/deploy.ts

Deploy contract

```bash
npx hardhat run --network ropsten scripts/deploy.ts
```

### Verify On Etherscan

```bash
npm install --save-dev @nomiclabs/hardhat-etherscan
```

Create Etherscan account and get a API key  
Update hardhat.config.ts

```ts
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
      url: `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`${ROPSTEN_PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: "ETHERSCAN_API_KEY",
  },
};

export default config;
```

```bash
npx hardhat verify --network ropsten [CONTRACT_ADDRESS] 
```

## References

- https://rahulsethuram.medium.com/the-new-solidity-dev-stack-buidler-ethers-waffle-typescript-tutorial-f07917de48ae
- https://hardhat.org/tutorial/
