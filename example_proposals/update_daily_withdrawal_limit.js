// daily withdraw limit is the maximum profit that can be withdrew from the treasury within 24 hours

const ethers = require('ethers');
const to18Decimals = (value) => ethers.utils.parseUnits(`${value}`, 18).toString();

module.exports = {
  title: 'Update dailyWithdrawalLimit',
  description: 'increase limit to 12K DAI',
  discoverabilityPeriod: `${24 * 60 * 60 / 15}`, // 1 day assuming a block every 15 seconds
  transactions: [
    {
      type: 'method',
      contract: process.env.TREASURY_CONTRACT_ADDRESS,
      method: 'setWithdrawalLimit',
      params: [
        {
          name: 'amount',
          type: 'uint256',
          value: to18Decimals('12000') // 12K DAI in 18 decimals
        }
      ]
    }
  ]
}
