const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const { FUNDING_RATE } = require('./constants');

const execPrice = (data) => data.price && (data.isBuy ? data.price.mul(1001).div(1000) : data.price.mul(999).div(1000));
exports.execPrice = execPrice;

const leveragedAmount = (params) => (params.closeMargin).mul(params.leverage).div(UNIT8);
exports.leveragedAmount = leveragedAmount;

const preFundingPnL = (params) => leveragedAmount(params).mul((params.price.sub(params.entryPrice)).mul(UNIT8).mul(params.isBuy ? toBN('1') : toBN('-1')).div(params.entryPrice)).div(UNIT8);
exports.preFundingPnL = preFundingPnL;

const pnl = (params) => preFundingPnL(params).sub(leveragedAmount(params).mul(FUNDING_RATE).div(UNIT8).mul(params.blocks));
exports.pnl = pnl;

const calculateAmountToReturn = (params) => params.closeMargin.add(pnl(params));
exports.calculateAmountToReturn = calculateAmountToReturn;