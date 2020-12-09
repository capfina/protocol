const open_close = require('./open_close');
const open_partial_close = require('./open_partial_close');
const submit_open_error = require('./submit_open_error');
const submit_close_error = require('./submit_close_error');
const open_error = require('./open_error');
const close_error = require('./close_error');
const add_margin = require('./add_margin');
const add_margin_error = require('./add_margin_error');
const liquidate = require('./liquidate');
const liquidate_error = require('./liquidate_error');
const withdraw = require('./withdraw');
const risks = require('./risks');

module.exports = [
	...open_close,
	...open_partial_close,
	...submit_open_error,
	...submit_close_error,
	...open_error,
	...close_error,
	...add_margin,
	...add_margin_error,
	...liquidate,
	...liquidate_error,
	...withdraw,
	...risks
]