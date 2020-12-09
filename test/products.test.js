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
const [ deployer, oracle, user_1 ] = accounts;
const [ deployer_pk, oracle_pk, user_1_pk ] = privateKeys;

const getAccountPrivateKey = (name) => privateKeys[account_names.indexOf(name)];

describe('Products', function () {

  const MAX_LEVERAGE = to8Units('100');
  const SPREAD = toBN(1e5);
  const FUNDING_RATE = toBN(2);

  beforeEach(async function () {
    this.signers = await ethers.getSigners();

    for (account_name of account_names) {
      this[account_name] = this.signers[account_names.indexOf(account_name)];
    }

    const Products = await ethers.getContractFactory('Products');

    this.products = await Products.deploy();
    await this.products.deployed();
    await this.products.initialize();

  });

  describe('owner()', function () {
    it('deployer is the owner', async function () {
      expect(await this.products.owner()).to.equalIgnoreCase(deployer);
    });
  });

  describe('registerProducts()', function () {
    it('successfully registers a product', async function () {
      const tx = await this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], [SPREAD], [FUNDING_RATE]);
      await expectEvents(tx, 'ProductRegistered', [ { symbol: toBytes32_padded('SYMBOL'), leverage: MAX_LEVERAGE, spread: SPREAD, fundingRate: FUNDING_RATE } ]);
    });

    it('successfully registers a product with leverage 1', async function () {
      const tx = await this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [to8Units('1')], [SPREAD], [FUNDING_RATE]);
      await expectEvents(tx, 'ProductRegistered', [ { symbol: toBytes32_padded('SYMBOL'), leverage: to8Units('1'), spread: SPREAD, fundingRate: FUNDING_RATE } ]);
    });

    it('cannot register if not owner', async function () {
      await expect(
        this.products.connect(this.user_1).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], [SPREAD], [FUNDING_RATE])
      ).to.be.revertedWith('!authorized');
    });

    it('cannot register a previoulsy registered product', async function () {
      await this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], [SPREAD], [FUNDING_RATE]);
      await expect(
        this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], [SPREAD], [FUNDING_RATE])
      ).to.be.revertedWith('!duplicate');
    });

    it('cannot register a product with no leverage', async function () {
      await expect(
        this.products.connect(this.deployer).register([toBytes32('SYMBOL')], ['0'], [SPREAD], [FUNDING_RATE])
      ).to.be.revertedWith('!leverage');
    });

    it('cannot register a product with leverage < 1', async function () {
      await expect(
        this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [to8Units('1').sub(toBN(1))], [SPREAD], [FUNDING_RATE])
      ).to.be.revertedWith('!leverage');
    });

    it('cannot register a product with no spread', async function () {
      await expect(
        this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], ['0'], [FUNDING_RATE])
      ).to.be.revertedWith('!spread');
    });

    it('successfully registers multiple products', async function () {
      const tx = await this.products.connect(this.deployer).register(
        [toBytes32('SYMBOL'), toBytes32('SYMBOL2'), toBytes32('SYMBOL3')],
        [to8Units('10'), to8Units('20'), to8Units('50')],
        [SPREAD, SPREAD, SPREAD],
        [FUNDING_RATE, FUNDING_RATE, FUNDING_RATE]);
      await expectEvents(tx, 'ProductRegistered', [
        { symbol: toBytes32_padded('SYMBOL'), leverage: to8Units('10'), spread: SPREAD, fundingRate: FUNDING_RATE },
        { symbol: toBytes32_padded('SYMBOL2'), leverage: to8Units('20'), spread: SPREAD, fundingRate: FUNDING_RATE },
        { symbol: toBytes32_padded('SYMBOL3'), leverage: to8Units('50'), spread: SPREAD, fundingRate: FUNDING_RATE }
      ]);
    });
  });

  describe('registerProduct => fetch data', function () {
    beforeEach(async function () {
      await this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], [SPREAD], [FUNDING_RATE]);
    });

    describe('getInfo(symbol, checkDisabled)', function () {
      it('successfully fetches product info', async function () {
        expectIncludes(await this.products.getInfo(toBytes32('SYMBOL'), false), {
          maxLeverage: MAX_LEVERAGE,
          spread: SPREAD,
          fundingRate: FUNDING_RATE
        });
      });

      it('fails to retrieve invalid product', async function () {
        await expect(
          this.products.getInfo(toBytes32('UNSUPPORTED'), false)
        ).to.be.revertedWith('!found');
      });
    });

    describe('getMaxLeverage(symbol, checkDisabled)', function () {
      it('successfully fetches product info', async function () {
        expect(await this.products.getMaxLeverage(toBytes32('SYMBOL'), false)).to.be.bignumber.equal(MAX_LEVERAGE);
      });

      it('fails to retrieve invalid product', async function () {
        await expect(
          this.products.getMaxLeverage(toBytes32('UNSUPPORTED'), false)
        ).to.be.revertedWith('!found');
      });

      describe('[disabled]', function () {
        beforeEach(async function () {
          await this.products.connect(this.deployer).disable(toBytes32('SYMBOL'));
        });

        it('fails to retrieve disabled product', async function () {
          await expect(
            this.products.getMaxLeverage(toBytes32('SYMBOL'), true)
          ).to.be.revertedWith('!disabled');
        });
      });
    });

    describe('getFundingRate(symbol)', function () {
      it('successfully fetches product info', async function () {
        expect(await this.products.getFundingRate(toBytes32('SYMBOL'))).to.be.bignumber.equal(FUNDING_RATE);
      });

      it('fails to retrieve invalid product', async function () {
        await expect(
          this.products.getFundingRate(toBytes32('UNSUPPORTED'))
        ).to.be.revertedWith('!found');
      });
    });

    describe('getSpread(symbol)', function () {
      it('successfully fetches product info', async function () {
        expect(await this.products.getSpread(toBytes32('SYMBOL'))).to.be.bignumber.equal(SPREAD);
      });

      it('fails to retrieve invalid product', async function () {
        await expect(
          this.products.getSpread(toBytes32('UNSUPPORTED'))
        ).to.be.revertedWith('!found');
      });
    });

  });

  describe('setLeverage(symbol, newLeverage)', async function () {
    beforeEach(async function () {
      await this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], [SPREAD], [FUNDING_RATE]);
    });

    it('successfully updates leverage', async function () {
      const newLeverage = to8Units('200');
      const tx = await this.products.connect(this.deployer).setLeverage(toBytes32('SYMBOL'), newLeverage);
      await expectEvents(tx, 'NewLeverage', [ { symbol: toBytes32_padded('SYMBOL'), newLeverage } ]);

      expectIncludes(await this.products.getInfo(toBytes32('SYMBOL'), false), {
        maxLeverage: newLeverage,
        spread: SPREAD,
        fundingRate: FUNDING_RATE
      });
    });

    it('fails to update leverage if not owner', async function () {
      await expect(
        this.products.connect(this.user_1).setLeverage(toBytes32('SYMBOL'), to8Units('200'))
      ).to.be.revertedWith('!authorized');
    });
  });

  describe('updateSpread(symbol, newSpread)', async function () {
    beforeEach(async function () {
      await this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], [SPREAD], [FUNDING_RATE]);
    });

    it('successfully updates spread', async function () {
      const newSpread = to8Units('20');
      const tx = await this.products.connect(this.deployer).updateSpread(toBytes32('SYMBOL'), newSpread);
      await expectEvents(tx, 'NewSpread', [ { symbol: toBytes32_padded('SYMBOL'), newSpread } ]);

      expectIncludes(await this.products.getInfo(toBytes32('SYMBOL'), false), {
        maxLeverage: MAX_LEVERAGE,
        spread: newSpread,
        fundingRate: FUNDING_RATE
      });
    });

    it('fails to update spread if not owner', async function () {
      await expect(
        this.products.connect(this.user_1).updateSpread(toBytes32('SYMBOL'), to8Units('20'))
      ).to.be.revertedWith('!authorized');
    });
  });

  describe('updateFundingRate(symbol, newFundingRate)', async function () {
    beforeEach(async function () {
      await this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], [SPREAD], [FUNDING_RATE]);
    });

    it('successfully updates funding rate', async function () {
      const newFundingRate = to8Units('2');
      const tx = await this.products.connect(this.deployer).updateFundingRate(toBytes32('SYMBOL'), newFundingRate);
      await expectEvents(tx, 'NewFundingRate', [ { symbol: toBytes32_padded('SYMBOL'), newFundingRate } ]);

      expectIncludes(await this.products.getInfo(toBytes32('SYMBOL'), false), {
        maxLeverage: MAX_LEVERAGE,
        spread: SPREAD,
        fundingRate: newFundingRate
      });
    });

    it('fails to update funding rate if not owner', async function () {
      await expect(
        this.products.connect(this.user_1).updateFundingRate(toBytes32('SYMBOL'), to8Units('2'))
      ).to.be.revertedWith('!authorized');
    });
  });

  describe('disable(symbol)', async function () {
    beforeEach(async function () {
      await this.products.connect(this.deployer).register([toBytes32('SYMBOL')], [MAX_LEVERAGE], [SPREAD], [FUNDING_RATE]);
    });

    it('successfully disables product', async function () {
      await this.products.connect(this.deployer).disable(toBytes32('SYMBOL'));
      expectIncludes(await this.products.getInfo(toBytes32('SYMBOL'), false), {
        maxLeverage: MAX_LEVERAGE,
        spread: SPREAD,
        fundingRate: FUNDING_RATE
      });

      await expect(
        this.products.getInfo(toBytes32('SYMBOL'), true)
      ).to.be.revertedWith('!disabled');
    });

    it('fails to disable product if not owner', async function () {
      await expect(
        this.products.connect(this.user_1).disable(toBytes32('SYMBOL')),
      ).to.be.revertedWith('!authorized');
    });
  });

});
