const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndClose = require('./helpers/openAndClose');
const invalidExtraClose = require('./helpers/invalidExtraClose');

module.exports = [

  //=======================================
  // MARKET CLOSED
  //=======================================

  openAndClose({
    id: '[Open => Close Error] [long => short] [market closed]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('40'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('0')
    }
  }),

  //=======================================
  // INVALID EXTRA CLOSE
  //=======================================

  invalidExtraClose({
    id: '[Open => Submit Close (x2) => Process Close Error] [long => short]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('30'), // extra close would go over the open margin
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('400')
    }
  }),

]