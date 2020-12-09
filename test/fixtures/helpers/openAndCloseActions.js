const openActions = require('./openActions');
const closeActions = require('./closeActions');

module.exports = function(params) {
  return [
    ...openActions(params),
    ...closeActions(params)
  ]
}