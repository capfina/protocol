const util = require('util');
const inquirer = require('inquirer');
const { defaults } = require('../constants');
const { selectAccount, inquireAddress } = require('../utils');

module.exports = async function (params, { web3, artifacts }) {

  // select account
  const account = await selectAccount(web3);
  const receiver = await inquireAddress(web3, 'receiver', 'contract or wallet to approve for spending');

  const GovernanceTokenMock = await artifacts.readArtifact('GovernanceTokenMock');
  const cap = new web3.eth.Contract(GovernanceTokenMock.abi, params.cap);

  const receipt = await cap.methods.approve(receiver, BigInt('0x' + 'F'.repeat(64)).toString()).send({
    from: account,
    gas: params.gas || defaults.GAS,
    gasPrice: params.gasPrice || defaults.GAS_PRICE
  });

  console.log(util.inspect(receipt, false, null, true));

}