// There could be multiple reasons why governance could decide to pause a user (e.g. to protect the treasury funds from being drained)

module.exports = {
  title: 'Pause Users',
  description: 'reasons: X, Y, Z...',
  discoverabilityPeriod: '1', // given the nature of the proposal, setting the discoverability perdiod to the minimum
  expedited: true, // pausing users is whitelisted in governance and can be submitted through expedited proposals
  transactions: [
    {
      type: 'method',
      contract: process.env.TRADING_CONTRACT_ADDRESS,
      method: 'pauseUsers',
      params: [
        {
          name: 'users',
          type: 'address[]',
          value: [
            '0x1111111111111111111111111111111111111111', // address of user_1 to pause
            '0x2222222222222222222222222222222222222222'  // address of user_2 to pause
            //...
          ]
        }
      ]
    }
  ]
}