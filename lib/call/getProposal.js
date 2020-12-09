const util = require('util');
const inquirer = require('inquirer');
const { PROPOSAL_STATES } = require('../constants');

module.exports = async function (params, { web3, artifacts }) {

  const { proposalId } = params.proposalId || await inquirer.prompt([
    {
      type: 'number',
      name: 'proposalId',
      message: 'proposal id'
    }
  ]);

  const Governance = await artifacts.readArtifact('Governance');
  const governance = new web3.eth.Contract(Governance.abi, params.governance);

  const proposal = await governance.methods.proposals(proposalId).call();
  const state = await governance.methods.proposalState(proposalId).call();

  const events = await governance.getPastEvents('ProposalCreated', {
    filter: { id: [ proposalId ] },
    fromBlock: (proposal.startBlock - 50000) < 0 ? 'earliest' : proposal.startBlock - 50000,
    toBlock: proposal.startBlock
  })

  const event = events[0].returnValues;

  const transactions = event.signatures.map((signature, i) => {
    const paramTypes = signature.match(/^[^(]+\(([^)]+)\)$/)[1].split(',');
    const decodedParams = web3.eth.abi.decodeParameters(paramTypes, event.calldatas[i]);
    const params = paramTypes.map((p, i) => ({type: p, value: decodedParams[`${i}`]}));

    return {
      contract: event.contracts[i],
      signature,
      params
    }    
  })

  const result = {
    proposalId,
    description: event.description,
    state: PROPOSAL_STATES[state],
    forVotes: Number(BigInt(proposal.forVotes) / BigInt(1e18)),
    againstVotes: Number(BigInt(proposal.againstVotes) / BigInt(1e18)),
    proposer: proposal.proposer,
    transactions
  }

  console.log(util.inspect(result, false, null, true));

}