const { ethers, upgrades, waffle } = require('hardhat');
const chai = require('chai');
const { deployContract } = waffle;
const provider = waffle.provider;

const { accounts, privateKeys, expectIncludes, expectEvents, expectContractEvents, isBN } = require('./lib/helpers.js');
const { toBytes32, toBytes32_padded, toBN, toUnits, to8Units, address0, MAX_UINT256, signPermit } = require('./lib/utils.js');

chai.use(require('chai-string'));
chai.use(require('./lib/chai-bignumber'));

const { expect } = chai;

const account_names = [ 'deployer', 'oracle', 'user_1', 'user_2' ];
const [ deployer_pk, oracle_pk, user_1_pk, user_2_pk ] = privateKeys;

const getAccountPrivateKey = (name) => privateKeys[account_names.indexOf(name)];

describe('Queue', function () {

  beforeEach(async function () {
    this.signers = await ethers.getSigners();

    for (account_name of account_names) {
      this[account_name] = this.signers[account_names.indexOf(account_name)];
    }

    const Queue = await ethers.getContractFactory('QueueMock');
    const Trading = await ethers.getContractFactory('TradingMock');
    
    this.queue = await Queue.deploy();
    await this.queue.deployed();
    await this.queue.initialize();

    this.trading = await Trading.deploy();
    await this.trading.deployed();
    await this.trading.initialize(this.queue.address);

    await this.queue.registerContracts(this.oracle.address, this.trading.address);

  });

  describe('owner()', function () {
    it('deployer is the owner', async function () {
      expect(await this.queue.owner()).to.equalIgnoreCase(this.deployer.address);
    });
  });

  describe('queuePendingOrder()', function () {
    it('successfully queues an order', async function () {
      // check initial state
      expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(0));
      expectIncludes(await this.queue.getQueuedOrders(), {
        symbols: [],
        firstId: toBN(1),
        lastId: toBN(1)
      });

      // queue an order
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('500'), to8Units('0'), address0);

      // check state post order
      expect(await this.queue.queueLength()).to.be.bignumber.equal('1');
      expectIncludes(await this.queue.getQueuedOrders(), {
        symbols: [toBytes32_padded('SYMBOL')],
        firstId: toBN(1),
        lastId: toBN(2)
      });
    });

    it('successfully queues multiple orders', async function () {
      // check initial state
      expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(0));
      expectIncludes(await this.queue.getQueuedOrders(), {
        symbols: [],
        firstId: toBN(1),
        lastId: toBN(1)
      });

      const expected_symbols = function () {
        return [...arguments].map(n => toBytes32_padded(`SYMBOL_${n}`));
      }

      for (i=1;i<10;i++) {
        // queue an order
        await this.trading.__queueOrder(toBytes32(`SYMBOL_${i}`), to8Units('500'), to8Units('0'), address0);
        // check state post order
        expect(await this.queue.queueLength()).to.be.bignumber.equal(`${i}`);
        expectIncludes(await this.queue.getQueuedOrders(), {
          symbols: expected_symbols(1, 2, 3, 4, 5, 6, 7, 8, 9).slice(0,i),
          firstId: toBN(1),
          lastId: toBN(`${i+1}`)
        });
      }
    });

    it('prevents queuing more orders than max allowed', async function () {
      // check initial state
      expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(0));
      expectIncludes(await this.queue.getQueuedOrders(), {
        symbols: [],
        firstId: toBN(1),
        lastId: toBN(1)
      });

      for (i=0;i<10;i++) {
        // queue an order
        await this.trading.__queueOrder(toBytes32(`SYMBOL_${i}`), to8Units('500'), to8Units('0'), address0);
      }

      await expect(this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('500'), to8Units('0'), address0)).to.be.revertedWith('!full');
    });
  });

  describe('setPrices()', function () {
    it('successfully sets price for 1 submitOrder', async function () {
      const prices = {
        [toBytes32_padded('SYMBOL')]: to8Units('10')
      }
      // queue an order
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('500'), to8Units('0'), address0);
      // get an order from the queue
      const queuedOrders = await this.queue.getQueuedOrders();
      const {symbols, firstId, lastId} = queuedOrders;
      expectIncludes(queuedOrders, {
        symbols: [toBytes32_padded('SYMBOL')],
        firstId: toBN(1),
        lastId: toBN(2)
      });
      // set prices
      const executionPrices = symbols.map((s, i) => prices[s]);
      const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue(executionPrices, firstId, lastId);
      await expectContractEvents(this.trading, 'ProcessOrderTriggered', tx.blockNumber, tx.blockNumber, [{
        symbol: toBytes32_padded('SYMBOL'),
        price: to8Units('10'),
        amount: to8Units('0'), // this is only set if positionId is set
        positionId: toBN(0),
        liquidator: address0
      }]);
      // check state post set price
      expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(0));
    });

    it('successfully cancels order when market is closed', async function () {
      const prices = {
        [toBytes32_padded('SYMBOL')]: to8Units('0') // price == 0 when market is closed
      }
      // queue an order
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('500'), toBN(1), address0);
      // get an order from the queue
      const queuedOrders = await this.queue.getQueuedOrders();
      const {symbols, firstId, lastId} = queuedOrders;
      expectIncludes(queuedOrders, {
        symbols: [toBytes32_padded('SYMBOL')],
        firstId: toBN(1),
        lastId: toBN(2)
      });
      // set prices
      const executionPrices = symbols.map((s, i) => prices[s]);
      const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue(executionPrices, firstId, lastId);
      await expectContractEvents(this.trading, 'OrderCancelled', tx.blockNumber, tx.blockNumber, [{ positionId: toBN(1), reason: '!unavailable' }]);
      // check state post set price
      expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(0));
    });

    it('successfully triggers error flow - with reason', async function () {
      const prices = {
        [toBytes32_padded('SYMBOL')]: to8Units('10')
      }
      // queue an order
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('500'), toBN(1), this.user_2.address /* setting the liquidator triggers an error */);
      // get an order from the queue
      const queuedOrders = await this.queue.getQueuedOrders();
      const {symbols, firstId, lastId} = queuedOrders;
      expectIncludes(queuedOrders, {
        symbols: [toBytes32_padded('SYMBOL')],
        firstId: toBN(1),
        lastId: toBN(2)
      });
      // set prices
      const executionPrices = symbols.map((s, i) => prices[s]);
      const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue(executionPrices, firstId, lastId);
      await expectContractEvents(this.trading, 'OrderCancelled', tx.blockNumber, tx.blockNumber, [{positionId: toBN(1), reason: 'TEST_ERROR_FLOW'}]);
      // check state post set price
      expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(0));
    });

    it('successfully triggers error flow - without reason', async function () {
      // queue an order
      await this.trading.__queueOrder(toBytes32('') /* triggers an error */, to8Units('500'), toBN(1), address0);
      // get an order from the queue
      const queuedOrders = await this.queue.getQueuedOrders();
      const {symbols, firstId, lastId} = queuedOrders;
      expectIncludes(queuedOrders, {
        symbols: [toBytes32_padded('')],
        firstId: toBN(1),
        lastId: toBN(2)
      });
      // set prices
      const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('10')], firstId, lastId);
      await expectContractEvents(this.trading, 'OrderCancelled', tx.blockNumber, tx.blockNumber, [{positionId: toBN(1), reason: '!failed'}]);
      // check state post set price
      expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(0));
    });

    it('successfully sets price for 5 orders + error', async function () {
      const prices = {
        [toBytes32_padded('SYMBOL')]: to8Units('10'),
        [toBytes32_padded('SYMBOL_2')]: to8Units('20')
      }
      // queue orders
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('0'), to8Units('0'), address0);
      await this.trading.__queueOrder(toBytes32('SYMBOL_2'), to8Units('0'), to8Units('0'), address0);
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('10'), toBN(1), address0);
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('10'), toBN(2), /* error */ this.user_2.address);
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('0'), to8Units('0'), address0);
      // get orders from the queue
      const queuedOrders = await this.queue.getQueuedOrders();
      const {symbols, firstId, lastId} = queuedOrders;
      expectIncludes(queuedOrders, {
        symbols: [toBytes32_padded('SYMBOL'), toBytes32_padded('SYMBOL_2'), toBytes32_padded('SYMBOL'), toBytes32_padded('SYMBOL'), toBytes32_padded('SYMBOL')],
        firstId: toBN(1),
        lastId: toBN(6)
      });
      // set prices
      const executionPrices = symbols.map((s, i) => prices[s]);
      const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue(executionPrices, firstId, lastId);
      await expectContractEvents(this.trading, 'ProcessOrderTriggered', tx.blockNumber, tx.blockNumber, [
        {symbol: toBytes32_padded('SYMBOL'), price: to8Units('10'), amount: to8Units('0'), positionId: toBN(0), liquidator: address0},
        {symbol: toBytes32_padded('SYMBOL_2'), price: to8Units('20'), amount: to8Units('0'), positionId: toBN(0), liquidator: address0},
        {symbol: toBytes32_padded('SYMBOL'), price: to8Units('10'), amount: to8Units('10'), positionId: toBN(1), liquidator: address0},
        {symbol: toBytes32_padded('SYMBOL'), price: to8Units('10'), amount: to8Units('0'), positionId: toBN(0), liquidator: address0}
      ]);

      await expectContractEvents(this.trading, 'OrderCancelled', tx.blockNumber, tx.blockNumber, [
        {id: toBN(4), positionId: toBN(2), reason: 'TEST_ERROR_FLOW'}
      ]);
      // check state post set price
      expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(0));
    });

    it('successfully sets price (in 2 shots) for 4 orders', async function () {
      const prices = {
        [toBytes32_padded('SYMBOL')]: to8Units('10'),
        [toBytes32_padded('SYMBOL_2')]: to8Units('20')
      }
      // queue orders
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('0'), toBN(0), address0);
      await this.trading.__queueOrder(toBytes32('SYMBOL_2'), to8Units('0'), toBN(0), address0);
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('10'), toBN(1), address0);
      await this.trading.__queueOrder(toBytes32('SYMBOL'), to8Units('0'), toBN(0), address0);
      // set prices (round 1)
      {
        // get 3 orders from the queue
        const queuedOrders = await this.queue.getQueuedOrders();
        const {symbols, firstId, lastId} = queuedOrders;
        expectIncludes(queuedOrders, {
          symbols: [toBytes32_padded('SYMBOL'), toBytes32_padded('SYMBOL_2'), toBytes32_padded('SYMBOL'), toBytes32_padded('SYMBOL')],
          firstId: toBN(1),
          lastId: toBN(5)
        });

        // set prices
        const executionPrices = symbols.map((s, i) => prices[s]);
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue(executionPrices.slice(0, -1), firstId, lastId.sub(toBN(1)));
        await expectContractEvents(this.trading, 'ProcessOrderTriggered', tx.blockNumber, tx.blockNumber, [
          {symbol: toBytes32_padded('SYMBOL'), price: to8Units('10'), amount: to8Units('0'), positionId: toBN(0), liquidator: address0},
          {symbol: toBytes32_padded('SYMBOL_2'), price: to8Units('20'), amount: to8Units('0'), positionId: toBN(0), liquidator: address0},
          {symbol: toBytes32_padded('SYMBOL'), price: to8Units('10'), amount: to8Units('10'), positionId: toBN(1), liquidator: address0}
        ]);
        // ensure the queue still has 1 element
        expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(1));
      }
      // set prices (round 2)
      {
        // get 3 orders from the queue (only 1 available)
        const queuedOrders = await this.queue.getQueuedOrders();
        const {symbols, firstId, lastId} = queuedOrders;
        expectIncludes(queuedOrders, {
          symbols: [toBytes32_padded('SYMBOL')],
          firstId: toBN(4),
          lastId: toBN(5)
        });
        // set prices
        const executionPrices = symbols.map((s, i) => prices[s]);
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue(executionPrices, firstId, lastId);
        await expectContractEvents(this.trading, 'ProcessOrderTriggered', tx.blockNumber, tx.blockNumber, [
          {symbol: toBytes32_padded('SYMBOL'), price: to8Units('10'), amount: to8Units('0'), positionId: toBN(0), liquidator: address0}
        ]);
        // ensure the queue is now empty
        expect(await this.queue.queueLength()).to.be.bignumber.equal(toBN(0));
      }
    });
  });

});
















