const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const submitCloseError = require('./helpers/submitCloseError');

module.exports = [

  //=======================================
  // INVALID PARTIAL CLOSE MARGIN
  //=======================================

  submitCloseError({
    id: '[Open => Submit Close Error] [long => short] [invalid close margin]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('41'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    },
    error: '!margin'
  }),

  submitCloseError({
    id: '[Open => Submit Close Error] [short => long] [invalid close margin]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('41'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    },
    error: '!margin'
  }),

  //===============================
  // POSITION NOT YET OPENED
  //===============================

  submitCloseError({
    id: '[Open => Submit Close Error] [long => short] [position not yet opened]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('40'),
      leverage: to8Units('10')
      // skipping openPrice => doesn't open position
    },
    error: '!found'
  }),

  //===============================
  // CLOSE OTHER USER'S POSITION
  //===============================

  submitCloseError({
    id: '[Open => Submit Close Error] [long => short] [unauthorized user]',
    user: 'user_1',
    closeUser: 'user_2',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('41'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    },
    error: '!authorized'
  }),

]
