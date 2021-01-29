# Cap

## Introduction

Cap is a synthetic trading protocol built on Ethereum. Traders submit orders that are priced by an oracle dark feed network. A treasury receives trader losses and pays out their profits.

CAP is Cap's governance token. CAP holders vote on system upgrades and how to use treasury funds. CAP's supply is fixed at 120,000.

## Contracts

### Governance

Receives staked CAP and keeps track of votes and proposals. A proposal can be executed once enough _for_ votes are reached by the end of the voting period. More info on Cap's governance apparatus can be found in the [Governance](#governance-1) section.

### Treasury

Holds system and trader assets. These include trader deposits and assets bought by governance. Trader deposits are segregated from funds available for use by governance.

### Products

Used to register and keep track of products available to trade. Maximum leverage, spread, and funding rate per block can be set by governance for each individual product.

### Trading

Receives orders from clients. These can be of two types: new position or position close.

### Queue

Queues orders for processing by the oracle network. Once a price is provided, the order is sent back to the trading contract for execution.

## Networks
	
The Cap protocol is currently deployed on the following networks.

### Ropsten

| Contract      | Address       |
| ------------- |---------------|
| Governance | [0xa6Dd9D2d978F76F9f325E79207570eD233104106](https://ropsten.etherscan.io/address/0xa6Dd9D2d978F76F9f325E79207570eD233104106) |
| Treasury | [0x88F4B165EAB80d3607678d54CF9dA2E1EAE17986](https://ropsten.etherscan.io/address/0x88F4B165EAB80d3607678d54CF9dA2E1EAE17986) |
| Products | [0x2DDd0ce3aCb5e5F5d6B9D754E733b3eFFb3C1Ab8](https://ropsten.etherscan.io/address/0x2DDd0ce3aCb5e5F5d6B9D754E733b3eFFb3C1Ab8) |
| Trading | [0x4ecd1C5b4E7b990F7d9bD76fF88cc616fCBdFfd4](https://ropsten.etherscan.io/address/0x4ecd1C5b4E7b990F7d9bD76fF88cc616fCBdFfd4) |
| Queue | [0xe189cD61CCC093258Ec20E00821efb854b8D9B7F](https://ropsten.etherscan.io/address/0xe189cD61CCC093258Ec20E00821efb854b8D9B7F) |
| Oracle | [0x445c3facc21cc4ef09ee07e476c8b823c1434fdb](https://ropsten.etherscan.io/address/0x445c3facc21cc4ef09ee07e476c8b823c1434fdb) |

```bash
# list ropsten proposals
npx hardhat --network ropsten gov:listProposals --governance $GOVERNANCE_ADDRESS

# get the details of a particular ropsten proposal
npx hardhat --network ropsten gov:getProposal --governance $GOVERNANCE_ADDRESS
```

### Mainnet

| Contract      | Address       |
| ------------- |---------------|
| Governance      | [0x16F8637360e88a8C2fDA90dAD68a3dE816eF0162](https://etherscan.io/address/0x16F8637360e88a8C2fDA90dAD68a3dE816eF0162) |
| Treasury      | [0x6eB80143761ddfE75D5EA87D913EBc1ebd68DE81](https://etherscan.io/address/0x6eB80143761ddfE75D5EA87D913EBc1ebd68DE81) |
| Products | [0x5777dc3Cc06D55104C63ECDd48CC88908B6ca3d9](https://etherscan.io/address/0x5777dc3Cc06D55104C63ECDd48CC88908B6ca3d9) |
| Trading | [0x5e4974ca44830f6418c286b4117cf2cee5ce3e47](https://etherscan.io/address/0x5e4974ca44830f6418c286b4117cf2cee5ce3e47) |
| Queue | [0x80334765d437e8e6eac5377FB37a0028D71e0167](https://etherscan.io/address/0x80334765d437e8e6eac5377FB37a0028D71e0167) |
| Oracle | [0x54A5675B467aB765F12609d4E95AcF0e3e893676](https://etherscan.io/address/0x54A5675B467aB765F12609d4E95AcF0e3e893676) |

## Protocol Math

Amounts are represented by unsigned integers scaled by `10^18`, except in the trading contract where margin, leverage, and price are represented by unsigned integers scaled by `10^8`.

## Gas Costs

| Method      | Gas       |
| ------------- |---------------:|
| deposit      | 180000 |
| withdraw      | 95000 |
| submitOrder      | 114000 |
| submitOrderUpdate      | 85000      |
| liquidatePosition | 103000      |

## Running Cap locally

Start by cloning this repo and running:

```
npm ci
```

Then start a local ethereum node by running:

```
npx hardhat node
```

Finally deploy the system locally by running:

```
npx hardhat deploy
```

#### Upgrades

After making upgrade-safe changes, you can update the local deployment without redeploying everything:

```
npx hardhat upgrade
```

## Placing trades

### Submit an order

```
Trading.submitOrder(true, bytes32('BTC'), 500 * 10^8, 20 * 10^8);
```
- bool isBuy
- bytes32 symbol
- uint256 margin
- uint256 leverage

Submitted orders are queued while awaiting a price from the oracle network. Once that price is available, they are executed and a new position is opened.

### Fully or partially close a position

```
Trading.submitOrderUpdate(1, 200 * 10^8);
```

- uint256 positionId
- uint256 margin

## Governance

### Creating a proposal

Proposals are executable code containing up to 10 transactions. Each of those consists of a method call with the address of the contract being called, the method signature and the encoded params.

On submission, proposals define a discoverability period meant to allow enough time for CAP holders to discover the proposal, to learn about it and to discuss it before the voting period starts. Voting lasts for 40320 blocks (around 1 week) during which any CAP holder can stake their tokens and cast their vote. Staked CAP will be locked until the voting period is over.

Proposals can only be executed after the voting period is over if the voting result is positive and if a quorum is reached (4% of CAP supply). Some proposals can be expedited if they meet certain criteria. These should contain at most 3 transactions and they should only contain whitelisted method signatures (set by governance). If a proposal is expedited, it can be executed immediately if the voting is positive and a quorum of 15% of CAP supply is reached.

Proposals can be written manually and submitted using the Governance ABI. Or you could use the hardhat tasks provided in this repo to submit JSON proposals which make things more accessible.

#### JSON Proposal Format
```json
{
  "title": "proposal title",
  "description": "proposal description",
  "discoverabilityPeriod": "1",
  "transactions": [
    {
      "type": "method",
      "contract": "0x1111111111111111111111111111111111111111",
      "method": "methodName",
      "params": [
        { "name": "name", "type": "address", "value": "0x2222222222222222222222222222222222222222"}
      ]
    }
  ]
}
```

Task files can also be in javascript allowing you to write certain values more easily.

```js
module.exports = {
  title: 'proposal title',
  description: 'proposal description',
  discoverabilityPeriod: '1',
  transactions: [
    {
      type: 'method',
      contract: '0x1111111111111111111111111111111111111111',
      method: 'methodName',
      params: [
        { name: 'name', type: 'address', value: '0x2222222222222222222222222222222222222222'}
      ]
    }
  ]
}
```

### Stake CAP

In order to submit a proposal you need to stake at least 10 CAP tokens. You can do that easily using the `gov:stakeAmount` hardhat task. Note that the CAP token uses 18 decimals so make sure to multiply your amounts by 1e18. (e.g. 1 CAP becomes 1000000000000000000)

```bash
# approve governance to access a certain amount of your CAP tokens
npx hardhat capToken:approve --cap "${CAP_TOKEN_ADDRESS}"

# stake your tokens
npx hardhat gov:stakeAmount --governance "${GOVERNANCE_ADDRESS}"

# check your staked balance
npx hardhat gov:getStakedBalance --governance "${GOVERNANCE_ADDRESS}"
```

### Submitting a proposal

Now that we have the JSON proposal and 10 CAP tokens staked, we can go ahead and submit the proposal. There are multiple ways to submit it (e.g. programmatically using web3 or similar libraries, manually on etherscan, or using a community webpage...). At this time, the simplest way is to use the `gov:submitProposal` task available in this repo. Just run the task and it will guide you through the submission process.

```bash
npx hardhat gov:submitProposal --governance "${GOVERNANCE_ADDRESS}"
```

### Voting

Once a proposal is submitted and the discoverability period is over, the proposal becomes open for voting. If you don't have any CAP staked, you will need to stake some as described in the 'Stake CAP' section above. Once you have tokens staked, you can go ahead and cast your vote using the `gov:castVote` task.

```
npx hardhat gov:castVote --governance "${GOVERNANCE_ADDRESS}"
```

This task will ask you to provide the ID of the proposal you're voting on and to select whether you want to support the proposal or vote against it.

### Executing a proposal

Once voting is complete and the proposal is accepted and executable, anyone can execute it using the `gov:executeProposal` task.

```
npx hardhat gov:executeProposal --governance "${GOVERNANCE_ADDRESS}"
```

### Examples of common proposals

- [Register new products](./example_proposals/register_products.js)
- [Pause users](./example_proposals/pause_users.js)
- [Update daily withdrawal limit](./example_proposals/update_daily_withdrawal_limit.js)
- [Swap treasury funds on Uniswap](./example_proposals/swap_treasury_funds.js)
- [Upgrade Contract To Latest Implementation](./example_proposals/upgrade_contract.js)

## Scripts

### Deploy

```
npx hardhat deploy
```

### Update

```
npx hardhat upgrade
```

On Ropsten and Mainnet, upgrades can only be executed through governance proposals.

### Liquidator

A sample liquidator bot can be found in `scripts/liquidator.js`. This script fetches events from the trading contract every 60 seconds and builds a cache of open positions across the system. 

It then uses 3rd party price APIs to determine whether any open positions should be liquidated. If so, it calls the `liquidatePositions` method of the trading contract with the ids of the positions to liquidate.

## Testing

```
npm test
```

## More

[Cap Telegram](https://t.me/capfin)
