const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndClose = require('./helpers/openAndClose');

module.exports = [

  openAndClose({
    id: '[Open => Close] [long => short] [same price => loses spread on close]',
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
      closePrice: to8Units('400')
    },
    finalize: {
      withdrawAmount: to8Units('99')
    }
  }),

  openAndClose({
    id: '[Open => Close] [short => long] [same price => loses spread on close]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('40'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('400')
    },
    finalize: {
      withdrawAmount: to8Units('99')
    }
  }),

  openAndClose({
    id: '[Open => Close] [long => short] [price goes up]',
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
      closePrice: to8Units('500')
    },
    finalize: {
      withdrawAmount: to8Units('100')
    }
  }),

  openAndClose({
    id: '[Open => Close] [long => short] [price goes down]',
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
      closePrice: to8Units('380')
    },
    finalize: {
      withdrawAmount: to8Units('79')
    }
  }),

  openAndClose({
    id: '[Open => Close] [long => short] [price goes down => liquidated]',
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
      closePrice: to8Units('300'),
      liquidated: true
    },
    finalize: {
      withdrawAmount: to8Units('60')
    }
  }),

  openAndClose({
    id: '[Open => Close] [short => long] [price goes up]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('40'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('420')
    },
    finalize: {
      withdrawAmount: to8Units('79')
    }
  }),

  openAndClose({
    id: '[Open => Close] [short => long] [price goes down]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('40'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('300')
    },
    finalize: {
      withdrawAmount: to8Units('100')
    }
  }),

  openAndClose({
    id: '[Open => Close] [short => long] [price goes up => liquidated]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: false,
      product: 'BTC',
      margin: to8Units('40'),
      closeMargin: to8Units('40'),
      leverage: to8Units('10'),
      openPrice: to8Units('400'),
      closePrice: to8Units('500'),
      liquidated: true
    },
    finalize: {
      withdrawAmount: to8Units('60')
    }
  }),

]
