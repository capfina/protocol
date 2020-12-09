const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openActions = require('./helpers/openActions');

module.exports = [

  //=======================================
  // DAILY LIMIT
  //=======================================

  {
    id: '[User_1 => opens long position] [User_2 => opens long position] [User_3 => opens long position] [risk accumulates]',
    actions: [
      // user_1 deposits 10K => makes a winning trade
      ...openActions({
        user: 'user_1',
        init: {
          amount: to8Units(10e3)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(10e3),
          leverage: to8Units('20'),
          openPrice: to8Units('100')
        }
      }),
      ...openActions({
        user: 'user_2',
        init: {
          amount: to8Units(10e3),
          treasuryBalance: toUnits(10e3),
          queueId: toBN(1),
          risk: to8Units(10e3).mul(to8Units('20')).div(UNIT8)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(10e3),
          leverage: to8Units('10'),
          openPrice: to8Units('100')
        }
      }),
      ...openActions({
        user: 'user_3',
        init: {
          amount: to8Units(10e3),
          treasuryBalance: toUnits(20e3),
          queueId: toBN(2),
          risk: to8Units(10e3).mul(to8Units('20')).add(to8Units(10e3).mul(to8Units('10'))).div(UNIT8)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(10e3),
          leverage: to8Units('20'),
          openPrice: to8Units('100')
        }
      }),
    ]
  },

  {
    id: '[User_1 => opens short position] [User_2 => opens short position] [User_3 => opens short position] [risk accumulates]',
    actions: [
      // user_1 deposits 10K => makes a winning trade
      ...openActions({
        user: 'user_1',
        init: {
          amount: to8Units(10e3)
        },
        data: {
          isBuy: false,
          product: 'BTC',
          margin: to8Units(10e3),
          leverage: to8Units('20'),
          openPrice: to8Units('100')
        }
      }),
      ...openActions({
        user: 'user_2',
        init: {
          amount: to8Units(10e3),
          treasuryBalance: toUnits(10e3),
          queueId: toBN(1),
          risk: to8Units(10e3).mul(to8Units('20')).div(UNIT8).mul(-1)
        },
        data: {
          isBuy: false,
          product: 'BTC',
          margin: to8Units(10e3),
          leverage: to8Units('10'),
          openPrice: to8Units('100')
        }
      }),
      ...openActions({
        user: 'user_3',
        init: {
          amount: to8Units(10e3),
          treasuryBalance: toUnits(20e3),
          queueId: toBN(2),
          risk: to8Units(10e3).mul(to8Units('20')).add(to8Units(10e3).mul(to8Units('10'))).div(UNIT8).mul(-1)
        },
        data: {
          isBuy: false,
          product: 'BTC',
          margin: to8Units(10e3),
          leverage: to8Units('20'),
          openPrice: to8Units('100')
        }
      }),
    ]
  },

  //=======================================
  // MAX RISK
  //=======================================

  {
    id: '[User_1 => opens long position] [User_2 => opens long position] [User_3 => opens long position => max risk error]',
    actions: [
      // user_1 deposits 10K => makes a winning trade
      ...openActions({
        user: 'user_1',
        init: {
          amount: to8Units(100e3)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(100e3),
          leverage: to8Units('10'),
          openPrice: to8Units('100')
        }
      }),
      ...openActions({
        user: 'user_2',
        init: {
          amount: to8Units(100e3),
          treasuryBalance: toUnits(100e3),
          queueId: toBN(1),
          risk: to8Units(100e3).mul(to8Units('10')).div(UNIT8)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(100e3),
          leverage: to8Units('10'),
          openPrice: to8Units('100')
        }
      }),
      ...openActions({
        user: 'user_3',
        init: {
          amount: to8Units(100e3),
          treasuryBalance: toUnits(200e3),
          queueId: toBN(2),
          risk: to8Units(100e3).mul(to8Units('10')).add(to8Units(100e3).mul(to8Units('10'))).div(UNIT8)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(100e3),
          leverage: to8Units('11'), // this goes above 3M risk
          openPrice: to8Units('100')
        },
        openError: '!risk_reached'
      }),
    ]
  },

  {
    id: '[User_1 => opens short position] [User_2 => opens short position] [User_3 => opens short position => max risk error]',
    actions: [
      // user_1 deposits 10K => makes a winning trade
      ...openActions({
        user: 'user_1',
        init: {
          amount: to8Units(100e3)
        },
        data: {
          isBuy: false,
          product: 'BTC',
          margin: to8Units(100e3),
          leverage: to8Units('10'),
          openPrice: to8Units('100')
        }
      }),
      ...openActions({
        user: 'user_2',
        init: {
          amount: to8Units(100e3),
          treasuryBalance: toUnits(100e3),
          queueId: toBN(1),
          risk: to8Units(100e3).mul(to8Units('10')).div(UNIT8).mul(toBN(-1))
        },
        data: {
          isBuy: false,
          product: 'BTC',
          margin: to8Units(100e3),
          leverage: to8Units('10'),
          openPrice: to8Units('100')
        }
      }),
      ...openActions({
        user: 'user_3',
        init: {
          amount: to8Units(100e3),
          treasuryBalance: toUnits(200e3),
          queueId: toBN(2),
          risk: to8Units(100e3).mul(to8Units('10')).add(to8Units(100e3).mul(to8Units('10'))).div(UNIT8).mul(toBN(-1))
        },
        data: {
          isBuy: false,
          product: 'BTC',
          margin: to8Units(100e3),
          leverage: to8Units('11'), // this goes above 3M risk
          openPrice: to8Units('100')
        },
        openError: '!risk_reached'
      }),
    ]
  },
]