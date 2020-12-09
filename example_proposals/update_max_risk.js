// maxRisk per product allows us to define the system exposure to this product
// these values could need to updated depeding on market conditions to protect treasury funds

const ethers = require('ethers');
const toBytes32 = (symbol) => ethers.utils.formatBytes32String(symbol).padEnd(66, '0')
const to8Decimals = (value) => ethers.utils.parseUnits(`${value}`, 8).toString();

module.exports = {
  title: 'Update maxRisk for BTC',
  description: 'increasing max risk for BTC due to X, Y, Z',
  discoverabilityPeriod: '1', // given the nature of the proposal, setting the discoverability perdiod to the minimum
  expedited: true, // updating maxRisk is whitelisted in governance and can be submitted through expedited proposals
  transactions: [
    {
      type: 'method',
      contract: process.env.TRADING_CONTRACT_ADDRESS,
      method: 'setMaxRisk',
      params: [
        {
          name: 'symbols',
          type: 'bytes32[]',
          value: [
            'BTC'
            //...
          ].map(toBytes32) // converts to bytes32
        },
        {
          name: 'maxRisks',
          type: 'uint256[]',
          value: [
            3000000 // 3 million DAI
          ].map(to8Decimals) // converts values to 8 decimals
        }
      ]
    }
  ]
}
