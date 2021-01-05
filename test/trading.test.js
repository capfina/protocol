const { ethers, upgrades, waffle } = require("hardhat");
const { expect } = require("chai");
const { deployContract } = waffle;
const provider = waffle.provider;

const { privateKeys } = require('./lib/helpers.js');
const { toBytes32, toUnits, to8Units, address0 } = require('./lib/utils.js');

const account_names = [ 'deployer', 'oracle', 'account1' ];
const [ deployer_pk, oracle_pk, account1_pk ] = privateKeys;

const defaults = {
  id: 1,
  positionId: 1,
  symbol: toBytes32('BTC'),
  price: to8Units(400),
  margin: to8Units(40),
  leverage: to8Units(10)
}

describe("Trading", () => {

  before(async () => {

    this.signers = await ethers.getSigners();

    for (account_name of account_names) {
      this[account_name] = this.signers[account_names.indexOf(account_name)];
    }

    const Trading = await ethers.getContractFactory('Trading');
    const Products = await ethers.getContractFactory('Products');
    const Queue = await ethers.getContractFactory('Queue');
    const Treasury = await ethers.getContractFactory('Treasury');
    const DaiMock = await ethers.getContractFactory('DaiMock');

    this.dai = await DaiMock.deploy();
    await this.dai.deployed();

    this.products = await Products.deploy();
    await this.products.deployed();
    await this.products.initialize();

    this.queue = await Queue.deploy();
    await this.queue.deployed();
    await this.queue.initialize();

    this.trading = await Trading.deploy();
    await this.trading.deployed();
    await this.trading.initialize(this.dai.address);
    
    this.treasury = await Treasury.deploy();
    await this.treasury.deployed();
    await this.treasury.initialize(this.dai.address);

    await this.queue.registerContracts(this.oracle.address, this.trading.address);
    await this.treasury.registerContracts(this.oracle.address, this.trading.address);
    await this.trading.registerContracts(this.products.address, this.queue.address, this.treasury.address);

    // register currencies
    await this.trading.setCurrencyMin(to8Units(10));
    await this.treasury.setWithdrawalLimit(toUnits(10000));

    // register products
    await this.products.register(
      [toBytes32('BTC'), toBytes32('BBG000B9XRY4')],
      [to8Units(100), to8Units(20)],
      [1e5, 1e5],
      [2, 2]
    );

  });

  it('admin is the owner', async () => {
    expect(await this.trading.owner()).to.equal(this.deployer.address);
  });

  it('can only process orders from the queue', async () => {
    await expect(this.trading.processOrder(
      defaults.id,
      defaults.symbol,
      defaults.price,
      defaults.margin,
      defaults.positionId,
      address0
    )).to.be.revertedWith('!authorized');
  });

  it('can only cancel orders from the queue', async () => {
    await expect(this.trading.cancelOrder(
      defaults.id,
      defaults.positionId,
      address0,
      '[reason]'
    )).to.be.revertedWith('!authorized');
  });

  it('can pause and unpause', async () => {
    expect(await this.trading.paused()).to.equal(false);
    await this.trading.pause();
    expect(await this.trading.paused()).to.equal(true);
    await this.trading.unpause();
    expect(await this.trading.paused()).to.equal(false);
  });

  it('can only pause from admin', async () => {
    await expect(this.trading.connect(this.account1).pause()).to.be.revertedWith('!authorized');
  });

  it('cannot submit order when paused', async () => {
    await this.trading.pause();
    await expect(this.trading.submitOrder(
      true,
      defaults.symbol,
      defaults.margin,
      defaults.leverage
    )).to.be.revertedWith('!paused');
  });

  it('cannot submit order update when paused', async () => {
    await this.trading.pause();
    await expect(this.trading.submitOrderUpdate(
      defaults.positionId,
      defaults.margin
    )).to.be.revertedWith('!paused');
  });

});
