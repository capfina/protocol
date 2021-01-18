const openActions = require('./openActions');
const liquidateActions = require('./liquidateActions');

module.exports = function(params) {
  return [
    ...openActions(params),
    ...liquidateActions(params)
  ]
}