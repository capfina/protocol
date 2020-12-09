const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { execPrice, calculateAmountToReturn } = require('./calculations');
const openActions = require('./openActions');

module.exports = function(params) {
  const {
    only,
    id,
    user,
    init, // { amount }
    data
  } = params;

  // const {
  //   isBuy,
  //   product,
  //   margin,
  //   closeMargin,
  //   leverage,
  //   openPrice,
  //   closePrice,
  //   liquidated
  // } = data;

  const amountToReturn = data.liquidated ? toBN('0') : calculateAmountToReturn({
    isBuy: data.isBuy,
    closeMargin: data.closeMargin,
    leverage: data.leverage,
    entryPrice: execPrice({ isBuy: data.isBuy, price: data.openPrice }),
    price: execPrice({ isBuy: !data.isBuy, price: data.closePrice }),
    blocks: toBN(3)
  });

  return {
    only,
    id,
    actions: [
      ...openActions(params),
      {
        /* 1st order update */
        type: 'submit-order-update',
        user,
        data: {
          positionId: toBN(1),
          isBuy: !data.isBuy,
          margin: data.closeMargin
        },
        expected: {
          event: {
            name: 'OrderSubmitted',
            body: {
              id: toBN(2),
              positionId: toBN(1),
              isBuy: !data.isBuy,
              symbol: toBytes32_padded(data.product),
              margin: data.closeMargin,
              leverage: data.leverage
            }
          }
        }
      },
      {
        /* 2nd order update */
        type: 'submit-order-update',
        user,
        data: {
          positionId: toBN(1),
          isBuy: !data.isBuy,
          margin: data.closeMargin
        },
        expected: {
          event: {
            name: 'OrderSubmitted',
            body: {
              id: toBN(3),
              positionId: toBN(1),
              isBuy: !data.isBuy,
              symbol: toBytes32_padded(data.product),
              margin: data.closeMargin,
              leverage: data.leverage
            }
          }
        }
      },
      {
        type: 'set-prices',
        user: 'oracle',
        data: {
          prices: [ data.closePrice, data.closePrice ],
          firstId: toBN(2)
        },
        expected: {
          events: {
            'PositionClosed': [
              {
                positionId: toBN(1),
                entryPrice: execPrice({ isBuy: data.isBuy, price: data.openPrice }),
                price: execPrice({ isBuy: !data.isBuy, price: data.closePrice }),
                leverage: data.leverage,
                marginClosed: data.closeMargin,
                amountToReturn
              }
            ],
            'OrderCancelled': [
              {
                id: toBN(3),
                positionId: toBN(1),
                reason: '!margin'
              }
            ]
          }
        }
      },
      {
        type: 'check-balances',
        data: {
          user
        },
        expected: {
          freeMargin: init.amount.sub(data.margin).add(amountToReturn),
          balance: (data.closeMargin).gt(amountToReturn) ? init.amount.add(amountToReturn.sub(data.liquidated ? data.margin : data.closeMargin)).mul(UNIT).div(UNIT8) : init.amount.mul(UNIT).div(UNIT8),
          currencyBalance: toBN('0')
        }
      },
      {
        type: 'check-user-positions',
        data: {
          user,
        },
        expected: (data.liquidated || (data.closeMargin).eq(data.margin)) ? [] : [
          // partial close
          {
            id: toBN(1),
            isBuy: data.isBuy,
            symbol: toBytes12_padded(data.product),
            margin: data.margin.sub(data.closeMargin),
            leverage: data.leverage,
            price: execPrice({ isBuy: data.isBuy, price: data.openPrice })
          }
        ]
      }
    ]
  };
}