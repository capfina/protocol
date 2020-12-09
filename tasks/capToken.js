const { task, subtask } = require('hardhat/config');
const faucetRequest = require('../lib/capToken/faucetRequest');
const getBalance = require('../lib/capToken/getBalance');
const approve = require('../lib/capToken/approve');

task('capToken:faucetRequest', 'makes faucet request for CAP')
  .addParam("cap", "cap contract address")
  .setAction(faucetRequest);

task('capToken:getBalance', 'gets CAP balance')
  .addParam("cap", "cap contract address")
  .setAction(getBalance);

task('capToken:approve', 'gets CAP balance')
  .addParam("cap", "cap contract address")
  .setAction(approve);