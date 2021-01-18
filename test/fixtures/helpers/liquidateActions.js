const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { execPrice, zeroIfNegative } = require('./calculations');
const { LIQUIDATOR_REWARD } = require('./constants');

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

  const initialFreeMargin = init.freeMargin || toBN('0');
  const initialBalance = init.balance || toBN('0');
  const marketClosed = data.liquidationPrice && data.liquidationPrice.eq(toBN('0'));
  const positionId = data.positionId || toBN(1);

  return [
    {
      type: 'liquidate-positions',
      user: liquidator,
      data: {
        positionIds: [ positionId ]
      },
      expected: {
        events:
          (error ?
              [ /* no events */ ]
            :
              [
                {
                  id: positionId.add(toBN(1)),
                  positionId,
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
        firstId: positionId.add(toBN(1))
      },
      expected: {
        events: 
        (marketClosed ?
            /* market closed */
            {
              'OrderCancelled': [
                {
                  id: positionId.add(toBN(1)),
                  positionId,
                  reason: '!unavailable'
                }
              ]
            }
          :
            {
              'PositionLiquidated': [
                {
                  positionId,
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
        freeMargin: initialFreeMargin.add(init.amount).sub(data.margin),
        balance: !(marketClosed || error) ? zeroIfNegative(initialBalance.add(init.amount.sub(data.margin).mul(UNIT).div(UNIT8))) : zeroIfNegative(initialBalance.add(init.amount.mul(UNIT).div(UNIT8))),
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
        balance: toBN('0'),
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
  ];
}