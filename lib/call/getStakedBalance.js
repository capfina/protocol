const util = require('util');
const inquirer = require('inquirer');
const { selectAccount } = require('../utils');

module.exports = async function (params, { web3, artifacts }) {

  // select account
  const account = await selectAccount(web3);

  const Governance = await artifacts.readArtifact('Governance');
  const governance = new web3.eth.Contract(Governance.abi, params.governance);

  const balance = await governance.methods.balanceOf(account).call();

  const result = {
    account,
    balance: Number(BigInt(balance) / BigInt(1e14)) / 10000.0
  }

  console.log(util.inspect(result, false, null, true));

}