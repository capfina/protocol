const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const submitOpenError = require('./helpers/submitOpenError');

module.exports = [

  //=======================================
  // UNSUPPORTED_PRODUCT
  //=======================================

  submitOpenError({
    id: '[Submit Open Error] [long] [unsupported product]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'UNSUPPORTED',
      margin: to8Units('40'),
      leverage: to8Units('20')
    },
    error: '!found'
  }),

  //=======================================
  // MIN LEVERAGE
  //=======================================

  submitOpenError({
    id: '[Submit Open Error] [long] [min leverage]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      leverage: to8Units('0')
    },
    error: '!leverage'
  }),

  //=======================================
  // MAX LEVERAGE
  //=======================================

  submitOpenError({
    id: '[Submit Open Error] [long] [max leverage]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      leverage: to8Units('101')
    },
    error: '!max_leverage'
  }),

  submitOpenError({
    id: '[Submit Open Error] [short] [max leverage]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      leverage: to8Units('101')
    },
    error: '!max_leverage'
  }),

  //=======================================
  // MIN MARGIN
  //=======================================

  submitOpenError({
    id: '[Submit Open Error] [long] [min margin]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('9'),
      leverage: to8Units('10')
    },
    error: '!margin'
  }),

  submitOpenError({
    id: '[Submit Open Error] [short] [min margin]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('9'),
      leverage: to8Units('10')
    },
    error: '!margin'
  }),

  //=======================================
  // NOT ENOUGH FUNDS
  //=======================================

  submitOpenError({
    id: '[Submit Open Error] [long] [not enough funds]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('101'),
      leverage: to8Units('10')
    },
    error: '!balance'
  }),

  submitOpenError({
    id: '[Submit Open Error] [short] [not enough funds]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('101'),
      leverage: to8Units('10')
    },
    error: '!balance'
  }),

]
