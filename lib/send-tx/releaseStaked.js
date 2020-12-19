const util = require('util');
const inquirer = require('inquirer');
const { validate_uint256, selectAccount } = require('../utils');
const { defaults } = require('../constants');

module.exports = async function (params, { web3, artifacts }) {

  // select account
  const account = await selectAccount(web3);

  const { amount } = await inquirer.prompt([
    {
      type: 'input',
      name: 'amount',
      message: 'amount to stake',
      validate: validate_uint256,
      default: BigInt(1e18).toString()
    }
  ]);

  const Governance = await artifacts.readArtifact('Governance');
  const governance = new web3.eth.Contract(Governance.abi, params.governance);

  const receipt = await governance.methods.releaseStaked(amount).send({
    from: account,
    gas: params.gas || defaults.GAS,
    gasPrice: params.gasprice || defaults.GAS_PRICE
  });

  console.log(util.inspect(receipt, false, null, true));

}
