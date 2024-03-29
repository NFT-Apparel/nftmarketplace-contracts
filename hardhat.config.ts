import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
          url: process.env.METIS_URL || "",
      },
      allowUnlimitedContractSize: true,
    },
    stardust: {
      url: process.env.METIS_URL || "",
      accounts:
        process.env.METIS_PRIVATE_KEY !== undefined
          ? [process.env.METIS_PRIVATE_KEY]
          : [],
    },
    testnet: {
      url: "https://stardust.metis.io/?owner=588",
      accounts:
        process.env.METIS_PRIVATE_KEY !== undefined
          ? [process.env.METIS_PRIVATE_KEY]
          : [],
    }
  },
  etherscan: {
    // just use api-key
    apiKey: "api-key",
  },
};

export default config;
