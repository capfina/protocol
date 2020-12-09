const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { execPrice, calculateAmountToReturn } = require('./calculations');

module.exports = function(params) {
  const {
    init,
    user,
    data
  } = params;

  // const {
  //   isBuy,
  //   product,
  //   margin,
  //   leverage,
  //   openPrice
  // } = data;

  const initialQueueId = init.queueId || toBN('0');
  const initialRisk = init.risk || toBN('0');
  const marketClosed = data.closePrice && data.closePrice.eq(toBN('0'));

  const amountToReturn = data.liquidated ? toBN('0') : calculateAmountToReturn({
    isBuy: data.isBuy,
    closeMargin: data.closeMargin,
    leverage: data.leverage,
    entryPrice: execPrice({ isBuy: data.isBuy, price: data.openPrice }),
    price: execPrice({ isBuy: !data.isBuy, price: data.closePrice }),
    blocks: toBN(2)
  });

  return [
    {
      type: 'submit-order-update',
      user,
      data: {
        positionId: initialQueueId.add(toBN(1)),
        isBuy: !data.isBuy,
        margin: data.closeMargin
      },
      expected: {
        event: {
          name: 'OrderSubmitted',
          body: {
            id: initialQueueId.add(toBN(2)),
            positionId: initialQueueId.add(toBN(1)),
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
        prices: [ data.closePrice ],
        firstId: initialQueueId.add(toBN(2))
      },
      expected: {
        events: 
        (marketClosed ?
            /* market closed */
            {
              'OrderCancelled': [
                {
                  id: initialQueueId.add(toBN(2)),
                  positionId: initialQueueId.add(toBN(1)),
                  reason: '!unavailable'
                }
              ]
            }
          :
            {
              'PositionClosed': [
                {
                  positionId: initialQueueId.add(toBN(1)),
                  entryPrice: execPrice({ isBuy: data.isBuy, price: data.openPrice }),
                  price: execPrice({ isBuy: !data.isBuy, price: data.closePrice }),
                  leverage: data.leverage,
                  marginClosed: data.closeMargin,
                  amountToReturn
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
        freeMargin: init.amount.sub(data.margin).add(marketClosed ? toBN('0') : amountToReturn),
        balance: (!marketClosed && (data.closeMargin).gt(amountToReturn)) ? init.amount.add(amountToReturn.sub(data.liquidated ? data.margin : data.closeMargin)).mul(UNIT).div(UNIT8) : init.amount.mul(UNIT).div(UNIT8),
        currencyBalance: toBN('0')
      }
    },
    {
      type: 'check-user-positions',
      data: {
        user,
      },
      expected: (!marketClosed && (data.liquidated || (data.closeMargin).eq(data.margin))) ? [] : [
        // partial close
        {
          id: initialQueueId.add(toBN(1)),
          isBuy: data.isBuy,
          symbol: toBytes12_padded(data.product),
          margin: data.margin.sub(marketClosed ? toBN('0') : data.closeMargin),
          leverage: data.leverage,
          price: execPrice({ isBuy: data.isBuy, price: data.openPrice })
        }
      ]
    },
    {
      type: 'check-risks',
      data: {
        product: data.product,
      },
      expected: {
        amount: 
          ((!marketClosed && (data.liquidated || (data.closeMargin).eq(data.margin))) ?
            initialRisk
          : 
            initialRisk.add(data.margin.sub(marketClosed ? toBN('0') : data.closeMargin).mul(data.leverage).div(UNIT8).mul(data.isBuy ? toBN(1) : toBN(-1)))
          )
      }
    }
  ];
}