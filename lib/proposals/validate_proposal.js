const Ajv = require('ajv');
const web3 = require('web3');

const ajv = new Ajv({$data: true});

ajv.addFormat('eth-address', {
	validate: (string) => web3.utils.isAddress(string)
});

for (const bits of [8, 256]) {
	ajv.addFormat(`uint${bits}`, {
		validate: (value) => {
			let bigIntValue = null;
			try { bigIntValue = BigInt(value) }
			catch (e) { return false; }
			return bigIntValue != null && bigIntValue >= 0n && bigIntValue <= BigInt('0x' + 'F'.repeat(bits / 4));
		}
	});
}

const method_name = {
	type: 'string',
	pattern: '^[_a-zA-Z][_a-zA-Z0-9]*$'
}

const param_schema = (type, value) => ({
	required: ['name', 'type', 'value'],
	additionalProperties: false,
	properties: {
		name: method_name,
		type: {
			type: 'string',
			enum: [type]
		},
		value: value
	}
});

const params_array = function (value_ref_depth) {
	return {
		type: 'array',
		items: {
			type: 'object',
			oneOf: [
				param_schema('uint256', { type: 'string', format: 'uint256' }),
				param_schema('uint8', { type: 'string', format: 'uint8' }),
				param_schema('bytes32', { type: 'string', pattern: '^0x[0-9A-Fa-f]{64}$' }),
				param_schema('bytes', { type: 'string', pattern: '^0x[0-9A-Fa-f]+$' }),
				param_schema('string', { type: 'string' }),
				param_schema('bool', { type: 'boolean' }),
				// arrays
				param_schema('uint256[]', { type: 'array', items: { type: 'string', format: 'uint256' }}),
				param_schema('uint8[]', { type: 'array', items: { type: 'string', format: 'uint8' }}),
				param_schema('bytes32[]', { type: 'array', items: { type: 'string', pattern: '^0x[0-9A-Fa-f]{64}$' }}),
				param_schema('bytes[]', { type: 'array', items: { type: 'string', pattern: '^0x[0-9A-Fa-f]+$' }}),
				param_schema('string[]', { type: 'array', items: { type: 'string' }}),

				// addresses
				param_schema('address', { type: 'string', format: 'eth-address' }),
				param_schema('address[]', {
					type: 'array',
					items: { type: 'string', format: 'eth-address' }
				})
			]
		}
	}
}

/*
	{
		type: 'method'
		contract: '0x283712893728173891273918',
		method: 'mint(address,uint256)',
		params: [
			{ type: 'address', value: '0x12871831786178213871283'},
			{ type: 'uint256', value: '1291200000000000000000' }
		],
		value: '0'
	}
*/

const method_call_transaction = {
	type: 'object',
	required: [ 'type', 'contract', 'method', 'params' ],
	additionalProperties: false,
	properties: {
		type: {
			type: 'string',
			enum: ['method']
		},
		contract: {
			type: 'string',
			format: 'eth-address'
		},
		method: method_name,
		params: params_array(5),
		value: {
			type: 'string',
			format: 'uint256'
		}
	}
}

/*
	{
		id: 'upgrade_assets',
		type: 'upgrade',
		contract: '0x1238127389127389123',
		new_implementation: '0x283712893728173891273918',
		initialize: {
			method: 'initialize',
			params: [
				{ type: 'address', value: '0x12871831786178213871283'},
				{ type: 'uint256', value: '1291200000000000000000' }
			]
		},
		value: '...'
	}
*/

const upgrade_transaction = {
	type: 'object',
	required: [ 'type', 'contract', 'new_implementation' ],
	additionalProperties: false,
	properties: {
		type: {
			type: 'string',
			enum: ['upgrade']
		},
		contract: {
			type: 'string',
			format: 'eth-address'
		},
		new_implementation: {
			type: 'string',
			format: 'eth-address'
		},
		initialize: {
			type: 'object',
			required: [
				'method',
				'params'
			],
			additionalProperties: false,
			properties: {
				method: method_name,
				params: params_array(6)
			}
		},
		value: {
			type: 'string',
			format: 'uint256'
		}
	}
}

const transactions_array = {
	type: 'array',
	items: {
		type: 'object',
		oneOf: [
			method_call_transaction,
			upgrade_transaction
		]
	},
	minItems: 1,
	maxItems: 10
}

const proposal_schema = {
	$async: true,
	type: 'object',
	required: [
		'title',
		'description',
		'discoverabilityPeriod',
		'transactions'
	],
	additionalProperties: false,
	properties: {
		title: {
			type: 'string',
			minLength: 3,
			maxLength: 100
		},
		description: {
			type: 'string',
			maxLength: 1000
		},
		discoverabilityPeriod: {
			type: 'string',
			format: 'uint256'
		},
		expedited: {
			type: 'boolean'
		},
		transactions: transactions_array
	}
};

module.exports = ajv.compile(proposal_schema);