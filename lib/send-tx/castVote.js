const util = require('util');
const inquirer = require('inquirer');
const { defaults } = require('../constants');
const { selectAccount } = require('../utils');

module.exports = async function (params, { web3, artifacts }) {

  // select account
  const account = await selectAccount(web3);

  const { proposalId, support } = await inquirer.prompt([
    {
      type: 'number',
      name: 'proposalId',
      message: 'proposal id'
    },
    {
      type: 'confirm',
      name: 'support',
      message: 'support proposal',
      default: false
    }
  ]);
  
  const Governance = await artifacts.readArtifact('Governance');
  const governance = new web3.eth.Contract(Governance.abi, params.governance);

  const receipt = await governance.methods.castVote(proposalId, support).send({
    from: account,
    gas: params.gas || defaults.GAS,
    gasPrice: params.gasprice || defaults.GAS_PRICE
  });

  console.log(util.inspect(receipt, false, null, true));

}