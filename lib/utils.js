const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');

exports.validate_uint256 = (value) => {
  let bigIntValue = null;
  try { bigIntValue = BigInt(value) }
  catch (e) { return false; }
  return bigIntValue != null && bigIntValue >= 0n && bigIntValue <= BigInt('0x' + 'F'.repeat(64));
}

exports.validateFilePath = (value) => fs.existsSync(path.resolve(__dirname, '..', value));

exports.selectAccount = async function (web3) {
  const accounts = await web3.eth.getAccounts();
  const { account } = await inquirer.prompt([
    {
      type: 'list',
      name: 'account',
      message: 'account',
      choices: accounts,
      default: accounts[0]
    }
  ]);

  return account;
}

exports.inquireAddress = async (web3, name, message) => {
  const result = await inquirer.prompt([
    {
      type: 'input',
      name,
      message,
      validate: (value) => web3.utils.isAddress(value)
    }
  ]);
  return result[name];
}