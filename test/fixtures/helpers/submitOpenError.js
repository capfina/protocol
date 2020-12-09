const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { execPrice, calculateAmountToReturn } = require('./calculations');

module.exports = function(params) {
  const {
    only,
    id,
    user,
    init, // { amount }
    data,
    error
  } = params;

  // const {
  //   isBuy,
  //   product,
  //   margin,
  //   leverage
  // } = data;

  return {
    only,
    id,
    actions: [
      {
        type: 'mint',
        user,
        data: {
          amount: init.amount.mul(UNIT).div(UNIT8)
        }
      },
      {
        type: 'check-balances',
        data: {
          user
        },
        expected: {
          freeMargin: toBN('0'),
          balance: toBN('0'),
          currencyBalance: init.amount.mul(UNIT).div(UNIT8)
        }
      },
      {
        type: 'deposit',
        user,
        data: {
          amount: init.amount,
        }
      },
      {
        type: 'check-balances',
        data: {
          user
        },
        expected: {
          freeMargin: init.amount,
          balance: init.amount.mul(UNIT).div(UNIT8),
          currencyBalance: toBN('0')
        }
      },
      {
        type: 'submit-order',
        user,
        data: {
          isBuy: data.isBuy,
          product: data.product,
          margin: data.margin,
          leverage: data.leverage
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
          freeMargin: init.amount,
          balance: init.amount.mul(UNIT).div(UNIT8),
          currencyBalance: toBN('0')
        }
      },
      {
        type: 'check-queue',
        expected: {
          symbols: [].map(toBytes32),
          firstId: toBN(1),
          lastId: toBN(1)
        }
      }
    ]
  };
}