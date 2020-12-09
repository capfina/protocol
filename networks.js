const web3 = require('web3');
const ropsten_secrets = require('./.secrets/ropsten.json');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      // custom port using networkId 100
      provider: () => new web3.providers.HttpProvider('http://localhost:8585'),
      gas: 8e6,
      gasPrice: 5e9,
      networkId: '*',
    },
    development_ws: {
      // custom port using networkId 100
      provider: () => new web3.providers.WebsocketProvider('ws://localhost:8585'),
      gas: 8e6,
      gasPrice: 5e9,
      networkId: '*',
    },
    ropsten: {
      provider: () => new HDWalletProvider(ropsten_secrets.accounts.mnemonic || ropsten_secrets.accounts, ropsten_secrets.url),
      networkId: 3,
      gasPrice: 180e9
    }
  },
};
