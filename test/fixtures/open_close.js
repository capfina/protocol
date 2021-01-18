const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const openAndClose = require('./helpers/openAndClose');
const openAndCloseActions = require('./helpers/openAndCloseActions');

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


  {
    id: '[Open => Close (huge profits) => Large Open => Close (huge losses > margin)] [price goes down => liquidated]',
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
      ...openAndCloseActions({
        user: 'user_1',
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
          margin: toBN(1806003988003), // max free margin available (> balance)
          closeMargin: toBN(1806003988003),
          leverage: to8Units('20'),
          openPrice: to8Units('100'),
          closePrice: to8Units('10'),
          liquidated: true
        }
      })
    ]
  },

  {
    id: '[Open => Close (huge profits) => Large Open => Close (huge losses > margin)] [price goes down => more than balance]',
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
      ...openAndCloseActions({
        user: 'user_1',
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
          margin: toBN(1806003988003), // max free margin available (> balance)
          closeMargin: toBN(1806003988003),
          leverage: to8Units('20'),
          openPrice: to8Units('100'),
          closePrice: to8Units('98'),
        }
      })
    ]
  },
]
