const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndLiquidate = require('./helpers/openAndLiquidate');
const openAndCloseActions = require('./helpers/openAndCloseActions');
const openAndLiquidateActions = require('./helpers/openAndLiquidateActions');

module.exports = [

  openAndLiquidate({
    id: '[Open => Liquidate] [long]',
    user: 'user_1',
    liquidator: 'user_2',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      liquidationPrice: to8Units('300')
    }
  }),

  openAndLiquidate({
    id: '[Open => Liquidate] [short]',
    user: 'user_1',
    liquidator: 'user_2',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      leverage: to8Units('10'),
      openPrice: to8Units('300'),
      liquidationPrice: to8Units('400')
    }
  }),

  {
    id: '[Open => Close (huge profits) => Large Open => Liquidate] [long]',
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
          amount: to8Units(100),
          treasuryBalance: toUnits(100e3)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          margin: to8Units(100),
          closeMargin: to8Units(100),
          leverage: to8Units('20'),
          openPrice: to8Units('100'),
          closePrice: to8Units('1000')
        }
      }),
      // user_1 deposits 10K => makes a winning trade
      ...openAndLiquidateActions({
        user: 'user_1',
        liquidator: 'user_2',
        init: {
          amount: toBN(0),
          freeMargin: toBN(1806003988003),
          balance: toUnits(100),
          treasuryBalance: toUnits(100100),
          queueId: toBN(2)
        },
        data: {
          isBuy: true,
          product: 'BTC',
          positionId: toBN('3'),
          margin: toBN(1806003988003), // max free margin available (> balance)
          leverage: to8Units('20'),
          openPrice: to8Units('100'),
          liquidationPrice: to8Units('10')
        }
      })
    ]
  },

]