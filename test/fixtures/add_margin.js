const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndAddMargin = require('./helpers/openAndAddMargin');

module.exports = [

  openAndAddMargin({
    id: '[Open => Add Margin] [long]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      marginToAdd: to8Units('60'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    }
  }),

  openAndAddMargin({
    id: '[Open => Add Margin] [short]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      marginToAdd: to8Units('60'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    }
  }),

  //=======================================
  // ADD MARGIN ZERO => NO CHANGE
  //=======================================

  openAndAddMargin({
    id: '[Open => Add Zero Margin] [long]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      marginToAdd: to8Units('0'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    }
  }),

  openAndAddMargin({
    id: '[Open => Add Zero Margin] [short]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      marginToAdd: to8Units('0'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    }
  }),

  //=======================================
  // ADD MAX MARGIN
  //=======================================

  openAndAddMargin({
    id: '[Open => Add Max Margin] [long]',
    user: 'user_1',
    init: {
      amount: to8Units('500')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      marginToAdd: to8Units('360'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    }
  }),

  openAndAddMargin({
    id: '[Open => Add Max Margin] [short]',
    user: 'user_1',
    init: {
      amount: to8Units('500')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      marginToAdd: to8Units('360'),
      leverage: to8Units('10'),
      openPrice: to8Units('400')
    }
  }),

]