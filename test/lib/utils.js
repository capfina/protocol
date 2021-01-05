const { ethers } = require('hardhat');
const BigNumber = require('bignumber.js');
const { ecsign } = require('ethereumjs-util');
const { isBN } = require('./helpers');
const { toUtf8Bytes, defaultAbiCoder, solidityPack } = ethers.utils;

exports.toBytes32 = function(string) {
	return ethers.utils.formatBytes32String(string);
}

exports.toBytes32_padded = function(string) {
	return ethers.utils.formatBytes32String(string).padEnd(66, '0');
}

exports.toBytes12_padded = function (string) {
	return ethers.utils.formatBytes32String(string).padEnd(26, '0').substring(0, 26);
}

const toUnits = function(value) {
  return ethers.utils.parseUnits(`${value}`, 18);
}

exports.toUnits = toUnits;

const to8Units = function(value) {
  return ethers.utils.parseUnits(`${value}`, 8);
}

exports.to8Units = to8Units;

const toDecimal = function(value) {
  return BigNumber(value.toString());
}

exports.toDecimal = toDecimal;

const toDecimal8 = function(value) {
  return BigNumber(value.toString()).dividedBy(BigNumber(1e8));
}

exports.toDecimal8 = toDecimal8;

exports.toBN = function(value) {
  return ethers.utils.parseUnits(`${value}`, 0);
}

const UNIT = toUnits('1');
exports.UNIT = UNIT;

const UNIT8 = to8Units('1');
exports.UNIT8 = UNIT8;

exports.address0 = '0x' + '0'.repeat(40);

const MAX_UINT256 = '0x' + 'F'.repeat(40);
exports.MAX_UINT256 = MAX_UINT256;

const getABIHash = function (params) {
	const PARAMS_TO_SIGN = ['PERMIT_TYPEHASH', 'owner', 'spender', 'nonce', 'deadline', 'allowed'];
	const ABI_HASH_TYPES = {
		PERMIT_TYPEHASH: 'bytes32',
		owner: 'address',
		spender: 'address',
		amount: 'uint256',
		nonce: 'uint256',
		deadline: 'uint256',
		allowed: 'bool'
	}

	return ethers.utils.keccak256(
		defaultAbiCoder.encode(
			// keys
			PARAMS_TO_SIGN.map(i => ABI_HASH_TYPES[i]),
			// values
			PARAMS_TO_SIGN.map(i => {
				if (isBN(params[i])) return params[i].toString();
				return params[i];
			})
		)
	);
}

const getPermitDigest = function (params) {
	const { DOMAIN_SEPARATOR } = params;
	return ethers.utils.keccak256(
		solidityPack(
			['bytes1', 'bytes1', 'bytes32', 'bytes32'],
			['0x19', '0x01', DOMAIN_SEPARATOR, getABIHash(params)]
		)
	);
}

exports.signPermit = async function (params) {
	const { private_key } = params;

	// set defaults
	params.amount = params.amount || MAX_UINT256;
	params.deadline = params.deadline || MAX_UINT256;
	params.allowed = (params.allowed == undefined || params.allowed == null) ? true : params.allowed;

	params.DOMAIN_SEPARATOR = await params.currencyContract.DOMAIN_SEPARATOR();
	params.PERMIT_TYPEHASH = await params.currencyContract.PERMIT_TYPEHASH();
	params.nonce = await params.currencyContract.nonces(params.owner);

	const digest = getPermitDigest(params);
	return ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(private_key.slice(2), 'hex'));
}
