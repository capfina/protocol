const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndCloseActions = require('./helpers/openAndCloseActions');
const invalidExtraClose = require('./helpers/invalidExtraClose');

module.exports = [

  //=======================================
  // DAILY LIMIT
  //=======================================

  {
    id: '[User_1 => Makes Huge Profit => Withdaw Daily Limit]',
    actions: [
      // fund the treasury with 100K
      {
        type: 'mint',
        user: 'treasury',
        data: {
          amount: toUnits(100e3)
        }
      },
      // user_1 deposits 10K => makes a winning trade
      ...openAndCloseActions({
        user: 'user_1',
        init: {
          amount: to8Units(10e3),
          treasuryBalance: toUnits(100e3)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(10e3),
          closeMargin: to8Units(10e3),
          leverage: to8Units('20'),
          openPrice: to8Units('100'),
          closePrice: to8Units('200')
        }
      }),
      {
        type: 'withdraw',
        user: 'user_1',
        data: {
          amount: to8Units(20e3).add(toBN(1))
        },
        expected: {
          error: '!daily_limit'
        }
      }
    ]
  },

  {
    id: '[User_1 + User_2 => Make Large Profit => Withdaw Daily Limit]',
    actions: [
      // fund the treasury with 100K
      {
        type: 'mint',
        user: 'treasury',
        data: {
          amount: toUnits(100e3)
        }
      },
      // user_1 deposits 10K => makes a winning trade
      ...openAndCloseActions({
        user: 'user_1',
        init: {
          amount: to8Units(10e3),
          treasuryBalance: toUnits(100e3)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(10e3),
          closeMargin: to8Units(10e3),
          leverage: to8Units('20'),
          openPrice: to8Units('100'),
          closePrice: to8Units('150')
        }
      }),
      // user_2 deposits 10K => makes a winning trade
      ...openAndCloseActions({
        user: 'user_2',
        init: {
          amount: to8Units(10e3),
          treasuryBalance: toUnits(100e3).add(toUnits(10e3)),
          queueId: toBN(2)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(10e3),
          closeMargin: to8Units(10e3),
          leverage: to8Units('20'),
          openPrice: to8Units('100'),
          closePrice: to8Units('150')
        }
      }),
      {
        type: 'withdraw',
        user: 'user_1',
        data: {
          amount: to8Units(15e3)
        }
      },
      {
        type: 'withdraw',
        user: 'user_2',
        data: {
          amount: to8Units(15e3).add(toBN(1))
        },
        expected: {
          error: '!daily_limit'
        }
      }
    ]
  },

  {
    id: '[User_1 => Makes Huge Profit => Withdaws All Daily Limit] [User_2 => Makes Profit => Withdraws Margin]',
    actions: [
      // fund the treasury with 100K
      {
        type: 'mint',
        user: 'treasury',
        data: {
          amount: toUnits(100e3)
        }
      },
      // user_1 deposits 10K => makes a winning trade
      ...openAndCloseActions({
        user: 'user_1',
        init: {
          amount: to8Units(10e3),
          treasuryBalance: toUnits(100e3)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(10e3),
          closeMargin: to8Units(10e3),
          leverage: to8Units('20'),
          openPrice: to8Units('100'),
          closePrice: to8Units('200')
        }
      }),
      // user_2 deposits 10K => makes a winning trade
      ...openAndCloseActions({
        user: 'user_2',
        init: {
          amount: to8Units(10e3),
          treasuryBalance: toUnits(100e3).add(toUnits(10e3)),
          queueId: toBN(2)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(10e3),
          closeMargin: to8Units(10e3),
          leverage: to8Units('20'),
          openPrice: to8Units('100'),
          closePrice: to8Units('150')
        }
      }),
      // user_1 withdraws all daily limit
      {
        type: 'withdraw',
        user: 'user_1',
        data: {
          amount: to8Units(20e3)
        }
      },
      // user_2 withdraws margin
      {
        type: 'withdraw',
        user: 'user_2',
        data: {
          amount: to8Units(10e3)
        }
      },
      // user_1 cannot withdraw above limit
      {
        type: 'withdraw',
        user: 'user_1',
        data: {
          amount: toBN(1)
        },
        expected: {
          error: '!daily_limit'
        }
      },
      // user_2 cannot withdraw above limit
      {
        type: 'withdraw',
        user: 'user_2',
        data: {
          amount: toBN(1)
        },
        expected: {
          error: '!daily_limit'
        }
      }
    ]
  },


]