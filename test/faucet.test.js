const { ethers, upgrades, waffle } = require('hardhat');
const chai = require('chai');
const { deployContract } = waffle;
const provider = waffle.provider;

const { accounts, privateKeys, expectIncludes, expectEvents, expectContractEvents, isBN } = require('./lib/helpers.js');
const { toBytes32, toBytes32_padded, toBN, toUnits, to8Units, address0, MAX_UINT256, signPermit } = require('./lib/utils.js');

chai.use(require('chai-string'));
chai.use(require('./lib/chai-bignumber'));

const { expect } = chai;

const account_names = [ 'deployer', 'user_1', 'user_2' ];

const getAccountPrivateKey = (name) => privateKeys[account_names.indexOf(name)];

describe('Faucet', function () {

  const MAX_LEVERAGE = to8Units('100');
  const SPREAD = toBN(1e5);
  const FUNDING_RATE = toBN(2);

  beforeEach(async function () {
    this.signers = await ethers.getSigners();

    for (account_name of account_names) {
      this[account_name] = this.signers[account_names.indexOf(account_name)];
    }

    const DaiMock = await ethers.getContractFactory('DaiMock');

    this.dai = await DaiMock.deploy();
    await this.dai.deployed();
  });

  describe('faucetRequest()', async function () {
    it('should successfully provide tokens once', async function () {
      expect(await this.dai.balanceOf(this.user_1.address)).to.be.bignumber.equal('0');

      await this.dai.connect(this.user_1).faucetRequest();
      expect(await this.dai.balanceOf(this.user_1.address)).to.be.bignumber.equal(toUnits('10000'));

      await expect(this.dai.connect(this.user_1).faucetRequest()).to.be.revertedWith('!allowed');

      await this.dai.connect(this.user_2).faucetRequest();
      expect(await this.dai.balanceOf(this.user_1.address)).to.be.bignumber.equal(toUnits('10000'));
      expect(await this.dai.balanceOf(this.user_2.address)).to.be.bignumber.equal(toUnits('10000'));
    });
  });

});
















