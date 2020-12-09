const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndLiquidate = require('./helpers/openAndLiquidate');

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

]