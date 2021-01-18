const openAndLiquidateActions = require('./openAndLiquidateActions');

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

  return {
    only,
    id,
    actions: [
      ...openAndLiquidateActions(params)
    ]
  };
}
