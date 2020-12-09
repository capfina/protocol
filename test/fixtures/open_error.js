const { toBytes32, toBytes32_padded, toBytes12_padded, to8Units, toBN, UNIT8, UNIT } = require('../lib/utils.js');
const open = require('./helpers/open');

module.exports = [

  //=======================================
  // MARKET CLOSED => CANCEL
  //=======================================

  open({
    id: '[Open Error] [long] [market closed]',
    user: 'user_1',
    init: {
      amount: to8Units('100')
    },
    data: {
      isBuy: true,
      product: 'BTC',
      margin: to8Units('40'),
      leverage: to8Units('10'),
      openPrice: to8Units('0')
    }
  }),

]
