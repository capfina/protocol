const util = require('util');
const inquirer = require('inquirer');
const { defaults } = require('../constants');
const { selectAccount } = require('../utils');

module.exports = async function (params, { web3, artifacts }) {

  // select account
  const account = await selectAccount(web3);

  const GovernanceTokenMock = await artifacts.readArtifact('GovernanceTokenMock');
  const cap = new web3.eth.Contract(GovernanceTokenMock.abi, params.cap);

  const balance = await cap.methods.balanceOf(account).call();

  const result = {
    account,
    balance: Number(BigInt(balance) / BigInt(1e14)) / 10000.0
  }

  console.log(util.inspect(result, false, null, true));

}