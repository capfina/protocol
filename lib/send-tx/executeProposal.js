const util = require('util');
const inquirer = require('inquirer');
const { defaults } = require('../constants');
const { selectAccount } = require('../utils');

module.exports = async function (params, { web3, artifacts }) {

  // select account
  const account = await selectAccount(web3);

  const { proposalId } = await inquirer.prompt([
    {
      type: 'number',
      name: 'proposalId',
      message: 'proposal id'
    }
  ]);

  const Governance = await artifacts.readArtifact('Governance');
  const governance = new web3.eth.Contract(Governance.abi, params.governance);

  const receipt = await governance.methods.executeProposal(proposalId).send({
    from: account,
    gas: params.gas || defaults.GAS,
    gasPrice: params.gasprice || defaults.GAS_PRICE
  });

  console.log(util.inspect(receipt, false, null, true));

}