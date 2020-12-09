const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { execPrice, calculateAmountToReturn } = require('./calculations');
const openActions = require('./openActions');

module.exports = function(params) {
  const {
    only,
    id,
    user,
    closeUser,
    init, // { amount }
    data,
    error
  } = params;

  // const {
  //   isBuy,
  //   product,
  //   margin,
  //   closeMargin,
  //   leverage,
  //   openPrice,
  //   liquidated
  // } = data;

  return {
    only,
    id,
    actions: [
      ...openActions(params),
      {
        type: 'submit-order-update',
        user: closeUser || user,
        data: {
          positionId: toBN(1),
          isBuy: !data.isBuy,
          margin: data.closeMargin
        },
        expected: {
          error
        }
      },
      {
        type: 'check-balances',
        data: {
          user
        },
        expected: {
          freeMargin: init.amount.sub(data.margin),
          balance: init.amount.mul(UNIT).div(UNIT8),
          currencyBalance: toBN('0')
        }
      },
      {
        type: 'check-user-positions',
        data: {
          user,
        },
        expected: !data.openPrice ? [] : [
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