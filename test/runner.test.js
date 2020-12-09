const { ethers, upgrades, waffle } = require('hardhat');
const chai = require('chai');
const { deployContract } = waffle;
const provider = waffle.provider;
const test_data = require('./fixtures/all_tests.js');
const only_test_data = test_data.filter(test => test.only);

const { accounts, privateKeys, expectIncludes, expectEvents, expectContractEvents, isBN } = require('./lib/helpers.js');
const { toBytes32, toBytes32_padded, toBN, toUnits, to8Units, address0, MAX_UINT256, signPermit } = require('./lib/utils.js');

chai.use(require('chai-string'));
chai.use(require('./lib/chai-bignumber'));

const { expect } = chai;

const account_names = [ 'deployer', 'oracle', 'user_1', 'user_2', 'user_3' ];
const [ deployer_pk, oracle_pk, user_1_pk, user_2_pk, user_3_pk ] = privateKeys;

const getAccountInfo = (name, signers) => {
  const index = account_names.indexOf(name);

  return {
    account_pk: privateKeys[index],
    signer: signers[index]
  };
}

const getAccountAddress = (name) => accounts[account_names.indexOf(name)];

const getAccountPrivateKey = (name) => privateKeys[account_names.indexOf(name)];

describe('Trading Tests', function () {

  for (test of (only_test_data.length ? only_test_data : test_data)) {
    describe(test.id, function () {

      before(async function () {
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
        await this.trading.setMaxRisk([toBytes32('BTC'), toBytes32('BBG000B9XRY4')], [to8Units(3e6), to8Units(3e6)]);
        await this.treasury.setWithdrawalLimit(toUnits(10000));

        // register products
        await this.products.register(
          [toBytes32('BTC'), toBytes32('BBG000B9XRY4')],
          [to8Units(100), to8Units(20)],
          [1e5, 1e5],
          [2, 2]
        );
      });

      for (action of test.actions) {
        const { type, skip, user, data, expected } = action;

        if (skip) continue;

        describe(`> [${type}]${ user ? '[' + user + ']' : ''}`, function () {

          before(async function () {
            if (user) {
              Object.assign(this, getAccountInfo(user, this.signers));
            }
          });

          if (type == 'mint') {
            const { amount } = data;

            it(`mints ${amount} to ${user}`, async function () {
              const deployerInfo = getAccountInfo('deployer', this.signers);

              if (user == 'treasury') {
                await this.dai.connect(deployerInfo.signer).mint(this.treasury.address, amount);
              } else {
                await this.dai.connect(deployerInfo.signer).mint(this.signer.address, amount);
              }
            });

          } else if (type == 'check-balances') {
            const { freeMargin, balance, currencyBalance } = expected;
            
            it(`check ${data.user} balance - expected: [freeMargin: ${freeMargin}] [balance: ${balance}] [currencyBalance: ${currencyBalance}]`, async function () {
              const userInfo = getAccountInfo(data.user, this.signers);

              freeMargin && expect(await this.trading.getUserFreeMargin(userInfo.signer.address)).to.be.bignumber.equal(freeMargin);
              balance && expect(await this.treasury.getUserBalance(userInfo.signer.address)).to.be.bignumber.equal(balance);
              currencyBalance && expect(await this.dai.balanceOf(userInfo.signer.address)).to.be.bignumber.equal(currencyBalance);
            });

          } else if (type == 'check-treasury-balance') {
            const { balance } = expected;

            it(`check treasury balance - expected: [balance: ${balance}]`, async function () {
              expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(balance);
            });

          } else if (type == 'check-trading-balance') {
            const { balance } = expected;

            it(`check trading balance`, async function () {
              expect(await this.dai.balanceOf(this.trading.address)).to.be.bignumber.equal(balance);
            });

          } else if (type == 'deposit') {
            const { amount } = data;

            it(`${user} deposits ${amount}`, async function () {
              const { v, r, s } = await signPermit({
                currencyContract: this.dai,
                owner: this.signer.address,
                spender: this.treasury.address,
                private_key: this.account_pk
              });

              await this.trading.connect(this.signer).deposit(amount, MAX_UINT256, v, r, s);

            });

          } else if (type == 'withdraw') {
            const { amount } = data;
            const { error } = (expected || {});

            it(`${user} withdraws ${amount}`, async function () {

              if (error) {
                await expect(this.trading.connect(this.signer).withdraw(amount)).to.be.revertedWith(error);
              } else {
                await this.trading.connect(this.signer).withdraw(amount);
              }

            });

          } else if (type == 'submit-order') {
            const { isBuy, product, margin, leverage, price } = data;
            const { error, event } = expected;

            it(`${user} submits ${isBuy ? 'buy' : 'sell'} order: [margin: ${margin}][leverage: ${leverage}]`, async function () {

              if (error) {
                await expect(this.trading.connect(this.signer).submitOrder(isBuy, toBytes32(product), margin, leverage)).to.be.revertedWith(error);
              } else {
                const tx = await this.trading.connect(this.signer).submitOrder(isBuy, toBytes32(product), margin, leverage);
                await expectEvents(tx, 'OrderSubmitted', [ event ]);
              }

            });

          } else if (type == 'check-queue') {

            it('checks queue', async function () {
              expectIncludes(await this.queue.getQueuedOrders(), expected);
            });

          } else if (type == 'set-prices') {
            const { prices, firstId } = data;
            const { events } = expected;
            const eventTypes = Object.keys(events);

            it(`${user} sets prices: ${prices}`, async function () {
              const tx = await this.queue.connect(this.signer).setPricesAndProcessQueue(prices, firstId, firstId.add(toBN(prices.length)));

              for (let eventType of eventTypes) {
                // replace addresses such as 'user_1' with the real address
                const completedEvents = events[eventType].map(event => {
                  const updatedEvent = Object.assign({}, event);
                  const address_keys = Object.keys(event).filter(key => ['sender', 'liquidator'].includes(key));
                  for (let key of address_keys) {
                    updatedEvent[key] = getAccountAddress(event[key]);
                  }
                  return updatedEvent;
                })
                await expectContractEvents(this.trading, eventType, tx.blockNumber, tx.blockNumber, completedEvents);
              }

            });

          } else if (type == 'check-user-positions') {

            it(`checks positions for user: ${data.user}`, async function () {
              const userInfo = getAccountInfo(data.user, this.signers);

              const userPositions = await this.trading.getUserPositions(userInfo.signer.address);

              const keys = [ 'id', 'symbol', 'isBuy', 'currencyId', 'margin', 'leverage', 'price', 'block', 'sender' ];
              const actual = userPositions.map(p => Object.assign({}, ...keys.map(k => ({[k]: p[k]}))));

              expect(actual.length).to.equal(expected.length);
              for (let i = 0 ; i < expected.length ; i++) {
                expectIncludes(actual[i], expected[i]);
              }
            });

          } else if (type == 'submit-order-update') {
            const { positionId, isBuy, margin, price } = data;
            const { error, event } = expected;

            it(`${user} submits ${isBuy ? 'buy' : 'sell'} order update to position: [positionId: ${positionId}][margin: ${margin}]`, async function () {

              if (error) {
                await expect(this.trading.connect(this.signer).submitOrderUpdate(positionId, isBuy, margin)).to.be.revertedWith(error);
              } else {
                const tx = await this.trading.connect(this.signer).submitOrderUpdate(positionId, isBuy, margin);
                await expectEvents(tx, event.name, [ event.body ]);
              }

            });

          } else if (type == 'liquidate-positions') {
            const { positionIds } = data;
            const { error, events } = expected;

            it(`${user} submits liquidation request for positions: [${positionIds.map(p => p.toString()).join(', ')}]`, async function () {

              if (error) {
                await expect(this.trading.connect(this.signer).liquidatePositions(positionIds)).to.be.revertedWith(error);
              } else {
                const tx = await this.trading.connect(this.signer).liquidatePositions(positionIds);

                const completedEvents = events.map(e => Object.assign({}, e, {sender: getAccountAddress(e.sender)}))
                await expectContractEvents(this.trading, 'LiquidationSubmitted', tx.blockNumber, tx.blockNumber, completedEvents);
              }

            });

          } else if (type ==  'check-risks') {
            const { product } = data;
            const { amount } = expected;

            it(`checks risk for ${product}`, async function () {
              expect(await this.trading.risks(toBytes32(product))).to.be.bignumber.equal(amount.lt(toBN(0)) ? amount.mul(toBN(-1)) : amount);
              expect(await this.trading.riskDirections(toBytes32(product))).to.equal(amount.lt(toBN(0)) ? true : false);
            });

          } else {
            console.log('WARNING: unsupported action type', type);
          }

        });
      }

    });
  }

});
