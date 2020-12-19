const { task, subtask } = require('hardhat/config');
// calls
const getProposal = require('../lib/call/getProposal');
const getStakedBalance = require('../lib/call/getStakedBalance');
const listProposals = require('../lib/call/listProposals');
// send-tx
const stakeAmount = require('../lib/send-tx/stakeAmount');
const releaseStaked = require('../lib/send-tx/releaseStaked');
const submitProposal = require('../lib/send-tx/submitProposal');
const castVote = require('../lib/send-tx/castVote');
const executeProposal = require('../lib/send-tx/executeProposal');

//==============
// calls
//==============

task('gov:getProposal', 'prints proposal info')
  .addParam("governance", "governance contract address")
  .setAction(getProposal);

task('gov:getStakedBalance', 'prints staked CAP balance')
  .addParam("governance", "governance contract address")
  .setAction(getStakedBalance);

task('gov:listProposals', 'lists all proposals')
  .addParam("governance", "governance contract address")
  .setAction(listProposals);

//==============
// send-tx
//==============

task('gov:stakeAmount', 'stake a CAP amount')
  .addParam("governance", "governance contract address")
  .addOptionalParam("gas", "gas limit")
  .addOptionalParam("gasprice", "gas price")
  .setAction(stakeAmount);

task('gov:releaseStaked', 'release staked CAP amount')
  .addParam("governance", "governance contract address")
  .addOptionalParam("gas", "gas limit")
  .addOptionalParam("gasprice", "gas price")
  .setAction(releaseStaked);

task('gov:submitProposal', 'submit a proposal')
  .addParam("governance", "governance contract address")
  .addOptionalParam("gas", "gas limit")
  .addOptionalParam("gasprice", "gas price")
  .setAction(submitProposal);

task('gov:castVote', 'cast vote using staked CAP')
  .addParam("governance", "governance contract address")
  .addOptionalParam("gas", "gas limit")
  .addOptionalParam("gasprice", "gas price")
  .setAction(castVote);

task('gov:executeProposal', 'execute a proposal')
  .addParam("governance", "governance contract address")
  .addOptionalParam("gas", "gas limit")
  .addOptionalParam("gasprice", "gas price")
  .setAction(executeProposal);
