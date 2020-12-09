const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndClose = require('./helpers/openAndClose');

module.exports = [

  //=======================================
  // PARTIAL CLOSE
  //=======================================

  openAndClose({
    id: '[Open => Partial Close] [close 25%] [long => short] [same price => loses spread on close]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('10'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('400')
    }
  }),

  openAndClose({
    id: '[Open => Partial Close] [close 50%] [long => short] [same price => loses spread on close]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('20'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('400')
    }
  }),

  openAndClose({
    id: '[Open => Partial Close] [close 25%] [short => long] [same price => loses spread on close]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('10'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('400')
    }
  }),

  openAndClose({
    id: '[Open => Partial Close] [close 25%] [long => short] [price goes up]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('10'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('500')
    }
  }),

  openAndClose({
    id: '[Open => Partial Close] [close 25%] [long => short] [price goes down]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('10'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('380')
    }
  }),

  openAndClose({
    id: '[Open => Partial Close] [close 25%] [long => short] [price goes down => liquidated]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('10'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('300'),
      liquidated: true
    }
  }),

  openAndClose({
    id: '[Open => Partial Close] [close 25%] [short => long] [price goes up]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('10'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('420')
    }
  }),

  openAndClose({
    id: '[Open => Partial Close] [close 25%] [short => long] [price goes down]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('10'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('300')
    }
  }),

  openAndClose({
    id: '[Open => Partial Close] [close 25%] [short => long] [price goes up => liquidated]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('10'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('500'),
      liquidated: true
    }
  }),

]
