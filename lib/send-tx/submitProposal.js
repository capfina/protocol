const util = require('util');
const inquirer = require('inquirer');
const path = require('path');
const { getProvider, validateFilePath, validate_uint256, selectAccount, inquireAddress } = require('../utils');
const { defaults } = require('../constants');
const Proposal = require('../proposals/Proposal.js');

module.exports = async function (params, { web3, artifacts, network }) {

  // select account
  const account = await selectAccount(web3);

  const { proposal_path } = await inquirer.prompt([
    {
      type: 'input',
      name: 'proposal_path',
      message: 'proposal relative path (from root of repo)',
      validate: validateFilePath
    }
  ]);

  let proposal_data = require(path.join('../..', proposal_path));

  // proposal data can be a function
  if (typeof(proposal_data) === 'function') {
    proposal_data = await proposal_data(params);
  }

  // print raw proposal data
  console.log(util.inspect(proposal_data, false, null, true));

  const proposal = new Proposal(proposal_data, {
    web3,
    artifacts,
    governanceAddress: params.governance
  });

  try {
    const txhash = await proposal.submit({
      from: account,
      gas: params.gas || defaults.GAS,
      gasPrice: params.gasprice || defaults.GAS_PRICE
    });
    console.log('Proposal submission succeeded: ', txhash);
  } catch (e) {
    throw new Error('Proposal submission failed: ' + e.message);
  }
}
