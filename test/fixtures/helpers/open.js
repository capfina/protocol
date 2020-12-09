const { toBytes32, toBytes32_padded, toBytes12_padded, toUnits, to8Units, toBN, UNIT8, UNIT } = require('../../lib/utils.js');
const openActions = require('./openActions');

module.exports = function(params) {
  const {
    only,
    id,
    user,
    init, // { amount }
    data
  } = params;

  // const {
  //   isBuy,
  //   product,
  //   margin,
  //   leverage,
  //   openPrice,
  // } = data;

  return {
    only,
    id,
    actions: [
      ...openActions(params)
    ]
  };
}