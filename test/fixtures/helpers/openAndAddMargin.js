const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { execPrice, calculateAmountToReturn } = require('./calculations');
const openActions = require('./openActions');

module.exports = function(params) {
  const {
    only,
    id,
    user,
    addMarginUser,
    init, // { amount }
    data,
    error
  } = params;

  // const {
  //   positionId,
  //   isBuy,
  //   product,
  //   margin,
  //   marginToAdd,
  //   leverage,
  //   openPrice
  // } = data;

  const newMargin = data.margin.add(data.marginToAdd);
  const marginRatio = newMargin.mul(UNIT8).div(data.margin);
  const newLeverage = data.leverage.mul(UNIT8).div(marginRatio);

  return {
    only,
    id,
    actions: [
      ...openActions(params),
      {
        type: 'submit-order-update',
        user: addMarginUser || user,
        data: {
          positionId: data.positionId || toBN(1),
          isBuy: data.isBuy,
          margin: data.marginToAdd
        },
        expected: error ? { error } : {
          event: {
            name: 'PositionMarginAdded',
            body: {
              positionId: toBN(1),
              newMargin: newMargin,
              oldMargin: data.margin,
              newLeverage: newLeverage
            }
          }
        }
      },
      {
        type: 'check-balances',
        data: {
          user
        },
        expected: {
          freeMargin: init.amount.sub(data.margin).sub(error ? toBN('0') : data.marginToAdd),
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
            margin: error ? data.margin : newMargin,
            leverage: error ? data.leverage : newLeverage,
            price: execPrice({ isBuy: data.isBuy, price: data.openPrice })
          }
        ]
      },
      {
        type: 'check-risks',
        skip: !data.openPrice,
        data: {
          product: data.product,
        },
        expected: {
          amount: data.margin.mul(data.leverage).div(UNIT8).mul(data.isBuy ? toBN(1) : toBN(-1))
        }
      }
    ]
  };
}