const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { execPrice, calculateAmountToReturn } = require('./calculations');
const { LIQUIDATOR_REWARD } = require('./constants');
const openActions = require('./openActions');

module.exports = function(params) {
  const {
    only,
    id,
    user,
    liquidator,
    init, // { amount }
    data,
    error
  } = params;

  // const {
  //   isBuy,
  //   product,
  //   margin,
  //   leverage,
  //   openPrice,
  //   liquidationPrice
  // } = data;

  const marketClosed = data.liquidationPrice && data.liquidationPrice.eq(toBN('0'));

  return {
    only,
    id,
    actions: [
      ...openActions(params),
      {
        type: 'liquidate-positions',
        user: liquidator,
        data: {
          positionIds: [ data.positionId || toBN(1) ]
        },
        expected: {
          events:
            (error ?
                [ /* no events */ ]
              :
                [
                  {
                    id: toBN(2),
                    positionId: toBN(1),
                    sender: liquidator
                  }
                ]
            )
        }
      },
      {
        type: 'set-prices',
        skip: !!error,
        user: 'oracle',
        data: {
          prices: [ data.liquidationPrice ],
          firstId: toBN(2)
        },
        expected: {
          events: 
          (marketClosed ?
              /* market closed */
              {
                'OrderCancelled': [
                  {
                    id: toBN(2),
                    positionId: toBN(1),
                    reason: '!unavailable'
                  }
                ]
              }
            :
              {
                'PositionLiquidated': [
                  {
                    positionId: toBN(1),
                    sender: user,
                    liquidator: liquidator,
                    marginLiquidated: data.margin
                  }
                ]
              }
          )
        }
      },
      {
        type: 'check-balances',
        data: {
          user
        },
        expected: {
          freeMargin: init.amount.sub(data.margin),
          balance: !(marketClosed || error) ? init.amount.sub(data.margin).mul(UNIT).div(UNIT8) : init.amount.mul(UNIT).div(UNIT8),
          currencyBalance: toBN('0')
        }
      },
      {
        type: 'check-balances',
        data: {
          user: liquidator
        },
        expected: {
          freeMargin: !(marketClosed || error) ? data.margin.mul(LIQUIDATOR_REWARD).div(toBN(100)) : toBN('0'),
          balance: !(marketClosed || error) ? data.margin.mul(UNIT).div(UNIT8).mul(LIQUIDATOR_REWARD).div(toBN(100)) : toBN('0'),
          currencyBalance: toBN('0')
        }
      },
      {
        type: 'check-user-positions',
        data: {
          user,
        },
        expected: !(marketClosed || error) ? [] : [
          {
            id: toBN(1),
            isBuy: data.isBuy,
            symbol: toBytes12_padded(data.product),
            margin: data.margin,
            leverage: data.leverage,
            price: execPrice({ isBuy: data.isBuy, price: data.openPrice })
          }
        ]
      }
    ]
  };
}
