// this proposal allows registering new products for trading

const ethers = require('ethers');
const toBytes32 = (symbol) => ethers.utils.formatBytes32String(symbol).padEnd(66, '0')
const to8Decimals = (value) => ethers.utils.parseUnits(`${value}`, 8).toString();

module.exports = {
  title: 'Register BTC, AAPL',
  description: 'reasons: X, Y, Z...',
  discoverabilityPeriod: '1',
  transactions: [
    {
      type: 'method',
      contract: process.env.PRODUCTS_CONTRACT_ADDRESS,
      method: 'register',
      params: [
        {
          name: 'symbols',
          type: 'bytes32[]',
          value: [
            'BTC',        // for crypto, you can directly use the symbol
            'BBG000B9XRY4'    // for non-crypto, use openfigi e.g. AAPL's FIGI symbol https://www.openfigi.com/id/BBG000B9XRY4
          ].map(toBytes32) // converts values to bytes32
        },
        {
          name: 'maxLeverages',
          type: 'uint256[]',
          value: [
            '100',        // max leverage 100 for BTC
            '20'        // max leverage 20 for AAPL
          ].map(to8Decimals) // converts values to 8 decimals
        },
        {
          // values are in basis points. 1 UNIT = 100%
          name: 'spreads',
          type: 'uint256[]',
          value: [
            '0.001',
            '0.001'
          ].map(to8Decimals) // converts values to 8 decimals
        },
        {
          // values are in basis points (per block). 1 UNIT = 100%. 5760 blocks in a day for 15s blocks
          name: 'fundingRates',
          type: 'uint256[]',
          value: [
            '2',
            '2'
          ]
        }
      ]
    }
  ]
}
