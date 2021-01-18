const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toDecimal, toDecimal8, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { FUNDING_RATE } = require('./constants');

const execPrice = (data) => data.price && (data.isBuy ? data.price.mul(1001).div(1000) : data.price.mul(999).div(1000));
exports.execPrice = execPrice;

const leveragedAmount = (params) => toDecimal8(params.closeMargin).multipliedBy(toDecimal8(params.leverage));

const preFundingPnL = (params) => leveragedAmount(params).multipliedBy(toDecimal8(params.price).minus(toDecimal8(params.entryPrice))).dividedBy(toDecimal8(params.entryPrice)).multipliedBy(params.isBuy ? toDecimal('1') : toDecimal('-1'));

const pnl = (params) => to8Units(preFundingPnL(params).minus(leveragedAmount(params).multipliedBy(toDecimal8(FUNDING_RATE)).multipliedBy(toDecimal(params.blocks))).toFixed(20).slice(0, -12));
exports.pnl = pnl;

const calculateAmountToReturn = (params) => params.closeMargin.add(pnl(params));
exports.calculateAmountToReturn = calculateAmountToReturn;

exports.zeroIfNegative = (amount) => amount.lt(toBN(0)) ? toBN(0) : amount;