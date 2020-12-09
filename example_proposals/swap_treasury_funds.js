// The treasury can contain multiple types of funds such as user funds in the trading currency (e.g. DAI), CAP token funds from the buy back
// Governance can decide to swap parts of the funds to other tokens for various reasons

const ethers = require('ethers');
const to18Decimals = (value) => ethers.utils.parseUnits(`${value}`, 18).toString();

module.exports = {
  title: 'Swap 100K DAI to USDC',
  description: 'reasons: X, Y, Z...',
  discoverabilityPeriod: `${24 * 60 * 60 / 15}`, // 1 day assuming a block every 15 seconds
  transactions: [
    {
      type: 'method',
      contract: process.env.TREASURY_CONTRACT_ADDRESS,
      method: 'swapOnUniswap',
      params: [
        {
          // this a normal uniswap path parameter (for more details check uniswap documentation)
          name: 'path',
          type: 'address[]',
          value: [
            process.env.DAI_ADDRESS, // swap DAI
            process.env.USDC_ADDRESS // to USDC
          ]
        },
        {
          // amount of DAI to swap
          name: 'amount',
          type: 'uint256',
          value: to18Decimals('100000') // 100K DAI in 18 decimals
        }
      ]
    }
  ]
}