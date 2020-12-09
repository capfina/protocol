const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndLiquidate = require('./helpers/openAndLiquidate');

module.exports = [

  //=======================================
  // POSITION NOT FOUND
  //=======================================

  openAndLiquidate({
    id: '[Open => Liquidate Error] [long] [position not found]',
    user: 'user_1',
    liquidator: 'user_2',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      positionId: toBN('5'), // non-existant position
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      liquidationPrice: to8Units('300')
    },
    error: true
  }),

]