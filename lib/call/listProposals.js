const util = require('util');
const inquirer = require('inquirer');
const { PROPOSAL_STATES } = require('../constants');

module.exports = async function (params, { web3, artifacts }) {

  const Governance = await artifacts.readArtifact('Governance');
  const governance = new web3.eth.Contract(Governance.abi, params.governance);

  // get proposal count
  const proposalCount = await governance.methods.proposalCount().call();
  console.log('Proposals found:', proposalCount);

  for(let lastIndex = proposalCount ; lastIndex > 0; lastIndex-=5) {

    if (lastIndex != proposalCount) {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'load_more',
          message: 'fetch more',
          default: true
        }
      ])

      if (!answers.load_more) break;
    }

    const length = lastIndex > 5 ? 5 : lastIndex;
    const toFetch =Array.from({length}, (x, i) => lastIndex - i);

    const proposalsBatch = await Promise.all(toFetch.map(i => governance.methods.proposals(i).call()));
    const statesBatch = await Promise.all(toFetch.map(i => governance.methods.proposalState(i).call()));
    const { minBlock, maxBlock } = proposalsBatch.reduce(
      (t, c, i) => ({ minBlock: Math.min(c.startBlock, t.minBlock), maxBlock: Math.max(c.startBlock, t.maxBlock) }),
      { minBlock: Infinity, maxBlock: 0 }
    );

    const events = await governance.getPastEvents('ProposalCreated', {
      filter: { id: toFetch },
      fromBlock: (minBlock - 50000) < 0 ? 'earliest' : minBlock - 50000,
      toBlock: maxBlock
    })

    const eventsById = {}
    for (const event of events) {
      eventsById[event.returnValues.id] = event.returnValues;
    }

    const result = proposalsBatch.map((p, i) => ({
      proposalId: p.id,
      description: eventsById[p.id].description,
      state: PROPOSAL_STATES[statesBatch[i]],
      forVotes: Number(BigInt(p.forVotes) / BigInt(1e18)),
      againstVotes: Number(BigInt(p.againstVotes) / BigInt(1e18)),
      proposer: p.proposer
    }))

    console.log(util.inspect(result, false, null, true));
  }

}