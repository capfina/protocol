const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndAddMargin = require('./helpers/openAndAddMargin');

module.exports = [

  //=======================================
  // MAX MARGIN
  //=======================================

  openAndAddMargin({
    id: '[Open => Add Margin Error] [long] [above max allowed]',
    user: 'user_1',
    init: {
      amount: to8Units('500')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      marginToAdd: to8Units('361'), // above max allowed
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    },
    error: '!too_much_margin'
  }),

  //=======================================
  // USER UNAUTHORIZED
  //=======================================

  openAndAddMargin({
    id: '[Open => Add Margin Error] [long] [unauthorized user]',
    user: 'user_1',
    addMarginUser: 'user_2',
    init: {
      amount: to8Units('500')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      marginToAdd: to8Units('60'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    },
    error: '!authorized'
  }),

  //=======================================
  // POSITION NOT FOUND
  //=======================================

  openAndAddMargin({
    id: '[Open => Add Margin Error] [long] [position not found]',
    user: 'user_1',
    init: {
      amount: to8Units('500')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      positionId: toBN('5'),
      marginToAdd: to8Units('60'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    },
    error: '!found'
  }),

  //=======================================
  // POSITION NOT YET OPENED
  //=======================================

  openAndAddMargin({
    id: '[Open => Add Margin Error] [long] [position not yet opened]',
    user: 'user_1',
    init: {
      amount: to8Units('500')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      marginToAdd: to8Units('60'),
      leverage: to8Units('10'),
      // skipping openPrice => doesn't open position
    },
    error: '!found'
  }),

]