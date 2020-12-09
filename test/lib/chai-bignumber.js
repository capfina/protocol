const { toBN } = require('./utils');
const { isBN } = require('./helpers');
const { BigNumber } = require('@ethersproject/bignumber');

const isEqualTo = BigNumber.prototype.eq;

module.exports = function (chai, utils) {
  chai.Assertion.addProperty('bignumber', function () {
    utils.flag(this, 'bignumber', true);
  });

  var convert = function (value, dp, rm) {
    var number;

    if (typeof value === 'string' || typeof value === 'number') {
      number = toBN(value);
    } else if (isBN(value)) {
      number = value;
    } else {
      new chai.Assertion(value).assert(false,
        'expected #{act} to be an instance of string, number or BigNumber');
    }

    return number;
  };

  var overwriteMethods = function (names, fn) {
    function overwriteMethod(original) {
      return function (value, dp, rm) {
        if (utils.flag(this, 'bignumber')) {
          var expected = convert(value, dp, rm);
          var actual = convert(this._obj, dp, rm);
          fn.apply(this, [expected, actual]);
        } else {
          original.apply(this, arguments);
        }
      };
    }
    for (var i = 0; i < names.length; i++) {
      chai.Assertion.overwriteMethod(names[i], overwriteMethod);
    }
  };

  // BigNumber.eq
  overwriteMethods(['equal', 'equals', 'eq'], function (expected, actual) {
    this.assert(
      isEqualTo.bind(expected)(actual),
      'expected #{act} to equal #{exp}',
      'expected #{act} to be different from #{exp}',
      expected.toString(),
      actual.toString()
    );
  });
};