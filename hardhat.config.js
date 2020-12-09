require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-web3');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-gas-reporter');

require('./tasks/accounts');
require('./tasks/deployment');
require('./tasks/governance');
require('./tasks/capToken');

const ropsten_secrets = require('./.secrets/ropsten.json');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "development",
  networks: {
    development: {
      url: 'http://127.0.0.1:8545',
      hardfork: "istanbul"
    },
    ropsten: {
      url: ropsten_secrets.url,
      accounts: ropsten_secrets.accounts
    }
  },
  solidity: {
    compilers: [{
      version: "0.7.3",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }]
  }
};

