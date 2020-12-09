const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { execPrice, calculateAmountToReturn } = require('./calculations');
const openActions = require('./openActions');
const closeActions = require('./closeActions');

module.exports = function(params) {
  const {
    only,
    id,
    user,
    init, // { amount }
    data,
    finalize
  } = params;

  const withdrawAmount = (finalize || { withdrawAmount: toBN('0') }).withdrawAmount || toBN('0');

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

  const marketClosed = data.closePrice && data.closePrice.eq(toBN('0'));

  const amountToReturn = data.liquidated ? toBN('0') : calculateAmountToReturn({
    isBuy: data.isBuy,
    closeMargin: data.closeMargin,
    leverage: data.leverage,
    entryPrice: execPrice({ isBuy: data.isBuy, price: data.openPrice }),
    price: execPrice({ isBuy: !data.isBuy, price: data.closePrice }),
    blocks: toBN(2)
  });

  return {
    only,
    id,
    actions: [
      ...openActions(params),
      ...closeActions(params),
      {
        type: 'withdraw',
        skip: withdrawAmount.eq(toBN('0')),
        user,
        data: {
          amount: finalize && finalize.withdrawAmount,
        }
      },
      {
        type: 'check-balances',
        skip: withdrawAmount.eq(toBN('0')),
        data: {
          user
        },
        expected: {
          freeMargin: init.amount.sub(data.margin).add(marketClosed ? toBN('0') : amountToReturn).sub(withdrawAmount),
          balance: (!marketClosed && (data.closeMargin).gt(amountToReturn)) ? init.amount.add(amountToReturn.sub(data.liquidated ? data.margin : data.closeMargin)).sub(withdrawAmount).mul(UNIT).div(UNIT8) : init.amount.sub(withdrawAmount).mul(UNIT).div(UNIT8),
          currencyBalance: withdrawAmount.mul(UNIT).div(UNIT8)
        }
      }
    ]
  };
}