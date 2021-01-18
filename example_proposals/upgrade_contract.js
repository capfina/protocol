// this proposal allows upgrading the trading proxy to the latest implementation
// Warning: Make sure you're familiar with the transparent proxy pattern before making this type of upgrade.

module.exports = {
  title: 'Upgrade Trading',
  description: 'reasons: X, Y, Z...',
  discoverabilityPeriod: '1',
  transactions: [
    {
      type: 'upgrade',
      contract: process.env.TRADING_CONTRACT_ADDRESS,
      new_implementation: process.env.NEW_TRADING_IMPL_ADDRESS
    }
  ]
}
