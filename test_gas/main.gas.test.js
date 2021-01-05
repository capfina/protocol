const { ethers, upgrades, waffle } = require('hardhat');
const chai = require('chai');
const { deployContract } = waffle;
const provider = waffle.provider;

const { accounts, privateKeys, expectIncludes, expectEvents, expectContractEvents, isBN } = require('../test/lib/helpers.js');
const { toBytes32, toBytes32_padded, toBN, toUnits, to8Units, address0, UNIT, UNIT8, MAX_UINT256, signPermit } = require('../test/lib/utils.js');

chai.use(require('../test/lib/chai-bignumber'));

const { expect } = chai;

const account_names = [ 'deployer', 'dai_deployer', 'usdc_deployer', 'admin', 'oracle', 'cap', 'user_1', 'user_2' ];
const [ deployer_pk, dai_deployer_pk, usdc_deployer_pk, admin_pk, oracle_pk, cap_pk, user_1_pk, user_2_pk ] = privateKeys;

const getAccountPrivateKey = (name) => privateKeys[account_names.indexOf(name)];

const DEFAULT_USER_FUNDS = to8Units(1000);
const DEFAULT_TREASURY_FUNDS = toUnits(100000);

describe('Gas Profiler', function () {

  beforeEach(async function () {
    this.signers = await ethers.getSigners();
    this.signer = (name) => this.signers[account_names.indexOf(name)];

    for (account_name of account_names) {
      this[account_name] = this.signer(account_name);
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
      [toBytes32('BTC')],
      [to8Units(100)],
      [1e5],
      [2]
    );

    for (let user_name of ['user_1', 'user_1']) {
      const user = this.signer(user_name);

      // mint initial funds for user
      await this.dai.mint(user.address, DEFAULT_USER_FUNDS.mul(UNIT).div(UNIT8));

      // sign permit for deposit
      const { v, r, s } = await signPermit({
        currencyContract: this.dai,
        owner: user.address,
        spender: this.treasury.address,
        private_key: getAccountPrivateKey(user_name)
      });

      // deposit user funds
      await this.trading.connect(user).deposit(DEFAULT_USER_FUNDS, MAX_UINT256, v, r, s);
    }

    // mint initial funds for the treasury
    await this.dai.mint(this.treasury.address, DEFAULT_TREASURY_FUNDS);
  });

  describe('[submit order]', async function () {

    describe('submitOrder', async function () {
      const expectedGas = 113401 + 1;
      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });

    describe('submitOrderUpdate [close position]', async function () {
      const expectedGas = 84977 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
        // set prices and process
        await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(1), toBN(2));
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.trading.connect(this.user_1).submitOrderUpdate(toBN(1), to8Units('40'));
        await expectContractEvents(this.trading, 'OrderSubmitted', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });

  });

  describe('[setPricesAndProcessQueue] [open position]', async function () {

    describe('[open position]', async function () {
      const expectedGas = 135277 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(1), toBN(2));
        await expectContractEvents(this.trading, 'PositionOpened', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });

    describe('[open position] [market closed]', async function () {
      const expectedGas = 31635 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('0')], toBN(1), toBN(2));
        await expectContractEvents(this.trading, 'OrderCancelled', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });

  });

  describe('[setPricesAndProcessQueue] [close position]', async function () {

    describe('[close position]', async function () {
      const expectedGas = 64653 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
        // set prices and process
        await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(1), toBN(2));
        // queue close order
        await this.trading.connect(this.user_1).submitOrderUpdate(toBN(1), to8Units('40'));
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(2), toBN(3));
        await expectContractEvents(this.trading, 'PositionClosed', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });

    describe('[close position] [market closed]', async function () {
      const expectedGas = 24870 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
        // set prices and process
        await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(1), toBN(2));
        // queue close order
        await this.trading.connect(this.user_1).submitOrderUpdate(toBN(1), to8Units('40'));
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('0')], toBN(2), toBN(3));
        await expectContractEvents(this.trading, 'OrderCancelled', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });

    describe('[close position] [liquidated]', async function () {
      const expectedGas = 61497 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
        // set prices and process
        await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(1), toBN(2));
        // queue close order
        await this.trading.connect(this.user_1).submitOrderUpdate(toBN(1), to8Units('40'));
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('1')], toBN(2), toBN(3));
        await expectContractEvents(this.trading, 'PositionClosed', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });

  });

  describe('[setPricesAndProcessQueue] [partial close position]', async function () {
    describe('[partial close position]', async function () {
      const expectedGas = 72385 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
        // set prices and process
        await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(1), toBN(2));
        // queue close order
        await this.trading.connect(this.user_1).submitOrderUpdate(toBN(1), to8Units('20'));
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(2), toBN(3));
        await expectContractEvents(this.trading, 'PositionClosed', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });

    describe('[partial close position] [market closed]', async function () {
      const expectedGas = 24870 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
        // set prices and process
        await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(1), toBN(2));
        // queue close order
        await this.trading.connect(this.user_1).submitOrderUpdate(toBN(1), to8Units('20'));
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('0')], toBN(2), toBN(3));
        await expectContractEvents(this.trading, 'OrderCancelled', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });
  });

  describe('[liquidatePosition]', async function () {
    describe('[liquidatePosition] [submit]', async function () {
      const expectedGas = 102519 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
        // set prices and process
        await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(1), toBN(2));
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.trading.connect(this.user_2).liquidatePositions([toBN(1)]);
        await expectContractEvents(this.trading, 'LiquidationSubmitted', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });

    describe('[liquidatePosition]', async function () {
      const expectedGas = 86509 + 1;
      beforeEach(async function () {
        // queue order
        await this.trading.connect(this.user_1).submitOrder(true, toBytes32('BTC'), to8Units('40'), to8Units('10'));
        // set prices and process
        await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('400')], toBN(1), toBN(2));
        // queue close order
        await this.trading.connect(this.user_2).liquidatePositions([toBN(1)]);
      });

      it(`should consume less than ${expectedGas} gas`, async function () {
        const tx = await this.queue.connect(this.oracle).setPricesAndProcessQueue([to8Units('1')], toBN(2), toBN(3));
        await expectContractEvents(this.trading, 'PositionLiquidated', tx.blockNumber, tx.blockNumber, [{}]);
        const receipt = await tx.wait(0);
        console.log('        gasUsed:', receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.bignumber.lt(toBN(expectedGas));
      });
    });
  });
});
