const { ethers, upgrades, waffle } = require('hardhat');
const chai = require('chai');
const { deployContract } = waffle;
const provider = waffle.provider;

const { accounts, privateKeys, expectIncludes, expectEvents, expectContractEvents, isBN } = require('./lib/helpers.js');
const { toBytes32, toBytes32_padded, toBN, toUnits, to8Units, address0, MAX_UINT256, signPermit } = require('./lib/utils.js');

chai.use(require('chai-string'));
chai.use(require('./lib/chai-bignumber'));

const { expect } = chai;

const account_names = [ 'deployer', 'oracle', 'trading', 'user_1', 'user_2', 'receiver' ];
const [ deployer_pk, oracle_pk, trading_pk, user_1_pk ] = privateKeys;

const getAccountPrivateKey = (name) => privateKeys[account_names.indexOf(name)];

describe('Treasury', function () {

  const MAX_LEVERAGE = to8Units('100');
  const SPREAD = toBN(1e5);
  const FUNDING_RATE = toBN(2);
  const DAILY_BLOCK_COUNT = toBN(5760);

  beforeEach(async function () {
    this.signers = await ethers.getSigners();

    for (account_name of account_names) {
      this[account_name] = this.signers[account_names.indexOf(account_name)];
    }

    const Treasury = await ethers.getContractFactory('Treasury');
    const DaiMock = await ethers.getContractFactory('DaiMock');

    this.dai = await DaiMock.deploy();
    await this.dai.deployed();

    this.treasury = await Treasury.deploy();
    await this.treasury.deployed();
    await this.treasury.initialize(this.dai.address);

    await this.treasury.registerContracts(this.oracle.address, this.trading.address);
  });

  describe('owner()', function () {
    it('deployer is the owner', async function () {
      expect(await this.treasury.owner()).to.equalIgnoreCase(this.deployer.address);
    });
  });

  describe('setWithdrawalLimit()', function () {
    it('successfully sets withdrawal limit', async function () {
      expect(await this.treasury.dailyWithdrawalLimit()).to.be.bignumber.equal(toUnits(0));

      const tx = await this.treasury.setWithdrawalLimit(toUnits(10000));
      await expectEvents(tx, 'NewWithdrawalLimit', [ { amount: toUnits(10000) } ]);
      expect(await this.treasury.dailyWithdrawalLimit()).to.be.bignumber.equal(toUnits(10000));
    });

    it('fails to set withdrawal limit if not owner', async function () {
      await expect(
        this.treasury.connect(this.user_1).setWithdrawalLimit(toUnits(10000)),
      ).to.be.revertedWith('!authorized');
    });
  });

  describe('setOracleFundingLimit()', function () {
    it('successfully sets oracle funding limit', async function () {
      expect(await this.treasury.dailyOracleFundingLimit()).to.be.bignumber.equal(toUnits(0));

      const tx = await this.treasury.setOracleFundingLimit(toUnits(10000));
      await expectEvents(tx, 'NewOracleFundingLimit', [ { amount: toUnits(10000) } ]);
      expect(await this.treasury.dailyOracleFundingLimit()).to.be.bignumber.equal(toUnits(10000));
    });

    it('fails to set oracle funding limit if not owner', async function () {
      await expect(
        this.treasury.connect(this.user_1).setOracleFundingLimit(toUnits(10000)),
      ).to.be.revertedWith('!authorized');
    });
  });

  describe('payToUser/collectFromUser(user, amount)', function () {
    it('successfully updates user balance', async function () {
      const user_1 = this.user_1.address;
      const user_2 = this.user_2.address;

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(0));

      await this.treasury.connect(this.trading).payToUser(user_1, toUnits(10000));
      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));

      await this.treasury.connect(this.trading).payToUser(user_2, toUnits(10000));
      expect(await this.treasury.getUserBalance(user_2)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(20000));

      await this.treasury.connect(this.trading).collectFromUser(user_1, toUnits(10000));
      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));

      await this.treasury.connect(this.trading).collectFromUser(user_2, toUnits(10000));
      expect(await this.treasury.getUserBalance(user_2)).to.be.bignumber.equal(toUnits(0));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(0));
    });

    it('fails to update user balance if not owner', async function () {
      await expect(
        this.treasury.connect(this.user_1).payToUser(this.user_1.address, toUnits(10000)),
      ).to.be.revertedWith('!authorized');

      await expect(
        this.treasury.connect(this.user_1).collectFromUser(this.user_1.address, toUnits(10000)),
      ).to.be.revertedWith('!authorized');
    });
  });

  describe('userDeposit(user, amount)', function () {
    beforeEach(async function () {
      await this.dai.mint(this.user_1.address, toUnits(10000));
      await this.dai.connect(this.user_1).approve(this.treasury.address, toUnits(10000));
    })

    it('successfully deposits', async function () {
      const user_1 = this.user_1.address;

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(0));

      await this.treasury.connect(this.trading).userDeposit(user_1, toUnits(10000));
      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(10000));
    });

    it('fails to deposit if not owner', async function () {
      const user_1 = this.user_1.address;

      await expect(
        this.treasury.connect(this.user_1).userDeposit(user_1, toUnits(10000)),
      ).to.be.revertedWith('!authorized');
    });

    it('fails to deposit if not enough balance', async function () {
      const user_1 = this.user_1.address;

      await expect(
        this.treasury.connect(this.trading).userDeposit(user_1, toUnits(10001)),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });
  });

  describe('userWithdraw(user, amount)', function () {
    beforeEach(async function () {
      await this.dai.mint(this.user_1.address, toUnits(10000));
      await this.dai.connect(this.user_1).approve(this.treasury.address, toUnits(10000));
      // user_1 deposits 10K
      await this.treasury.connect(this.trading).userDeposit(this.user_1.address, toUnits(10000));

      await this.dai.mint(this.user_2.address, toUnits(10000));
      await this.dai.connect(this.user_2).approve(this.treasury.address, toUnits(10000));
    })

    it('successfully withdraws margin (independently of system funds)', async function () {
      const user_1 = this.user_1.address;

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.withdrawalCheckpoint()).to.be.bignumber.equal(toBN(0));
      expect(await this.treasury.withdrawalsSinceCheckpoint()).to.be.bignumber.equal(toBN(0));

      await this.treasury.connect(this.trading).userWithdraw(user_1, toUnits(10000));
      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(0));
      expect(await this.treasury.withdrawalCheckpoint()).to.be.bignumber.equal(toBN(0));
      expect(await this.treasury.withdrawalsSinceCheckpoint()).to.be.bignumber.equal(toUnits(0));
    });

    it('successfully withdraws above balance (up to daily limit)', async function () {
      const user_1 = this.user_1.address;

      // set daily limit to 100
      await this.treasury.setWithdrawalLimit(toUnits(100));
      // mint extra funds in the treasury
      await this.dai.mint(this.treasury.address, toUnits(100000));

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(110000));
      expect(await this.treasury.withdrawalCheckpoint()).to.be.bignumber.equal(toBN(0));
      expect(await this.treasury.withdrawalsSinceCheckpoint()).to.be.bignumber.equal(toBN(0));

      const tx = await this.treasury.connect(this.trading).userWithdraw(user_1, toUnits(10100));
      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(10100));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(99900));
      if (toBN(tx.blockNumber).gt(DAILY_BLOCK_COUNT)) {
        expect(await this.treasury.withdrawalCheckpoint()).to.be.bignumber.equal(tx.blockNumber);
      } else {
        expect(await this.treasury.withdrawalCheckpoint()).to.be.bignumber.equal(toBN(0));
      }
      expect(await this.treasury.withdrawalsSinceCheckpoint()).to.be.bignumber.equal(toUnits(100));
    });

    it('successfully withdraws above balance (up to daily limit + within system funds)', async function () {
      const user_1 = this.user_1.address;
      const user_2 = this.user_2.address;

      // set daily limit to 100
      await this.treasury.setWithdrawalLimit(toUnits(10e3));
      // set system funds limit to 1K
      await this.treasury.setSystemFundsLimit(toUnits(1e3));
      // mint extra funds in the treasury (more than the system funds)
      await this.dai.mint(this.treasury.address, toUnits(100e3));
      // user_2 deposits 10K
      await this.treasury.connect(this.trading).userDeposit(this.user_2.address, toUnits(10000));

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getUserBalance(user_2)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(20000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(user_2)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(120000));
      expect(await this.treasury.withdrawalCheckpoint()).to.be.bignumber.equal(toBN(0));
      expect(await this.treasury.withdrawalsSinceCheckpoint()).to.be.bignumber.equal(toBN(0));

      const tx = await this.treasury.connect(this.trading).userWithdraw(user_1, toUnits(20000));
      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.treasury.getUserBalance(user_2)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(20000));
      expect(await this.dai.balanceOf(user_2)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(100e3));
      if (toBN(tx.blockNumber).gt(DAILY_BLOCK_COUNT)) {
        expect(await this.treasury.withdrawalCheckpoint()).to.be.bignumber.equal(tx.blockNumber);
      } else {
        expect(await this.treasury.withdrawalCheckpoint()).to.be.bignumber.equal(toBN(0));
      }
      expect(await this.treasury.withdrawalsSinceCheckpoint()).to.be.bignumber.equal(toUnits(10000));
    });

    it('fails to withdraw if not owner', async function () {
      const user_1 = this.user_1.address;

      await expect(
        this.treasury.connect(this.user_1).userWithdraw(user_1, toUnits(10000)),
      ).to.be.revertedWith('!authorized');
    });

    it('fails to withdraw above balance + daily limit', async function () {
      const user_1 = this.user_1.address;

      // set daily limit to 100
      await this.treasury.setWithdrawalLimit(toUnits(100));
      // mint extra funds in the treasury
      await this.dai.mint(this.treasury.address, toUnits(100000));

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(110000));

      await expect(
        this.treasury.connect(this.trading).userWithdraw(user_1, toUnits(10101))
      ).to.be.revertedWith('!daily_limit');
    });

    it('fails to withdraw other user margins', async function () {
      const user_1 = this.user_1.address;
      const user_2 = this.user_2.address;

      // set daily limit to 100
      await this.treasury.setWithdrawalLimit(toUnits(100));
      // user_2 deposits 10K
      await this.treasury.connect(this.trading).userDeposit(this.user_2.address, toUnits(10000));

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getUserBalance(user_2)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(20000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(user_2)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(20000));

      await expect(
        this.treasury.connect(this.trading).userWithdraw(user_1, toUnits(10001))
      ).to.be.revertedWith('!system_threshold');
    });

    it('fails to withdraw below system threshold', async function () {
      const user_1 = this.user_1.address;
      const user_2 = this.user_2.address;

      // set daily limit to 100
      await this.treasury.setWithdrawalLimit(toUnits(10e3));
      // set system funds limit to 1K
      await this.treasury.setSystemFundsLimit(toUnits(1e3));
      // mint extra funds in the treasury (exactly the system funds limit)
      await this.dai.mint(this.treasury.address, toUnits(1e3));
      // user_2 deposits 10K
      await this.treasury.connect(this.trading).userDeposit(this.user_2.address, toUnits(10000));

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getUserBalance(user_2)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(20000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(user_2)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(21000)); // total user funds + system funds

      await expect(
        this.treasury.connect(this.trading).userWithdraw(user_1, toUnits(10001))
      ).to.be.revertedWith('!system_threshold');
    });
  });

  describe('withdraw(amount, to, all)', function () {
    beforeEach(async function () {
      await this.dai.mint(this.user_1.address, toUnits(10000));
      await this.dai.connect(this.user_1).approve(this.treasury.address, toUnits(10000));
      // user_1 deposits 10K
      await this.treasury.connect(this.trading).userDeposit(this.user_1.address, toUnits(10000));
    })

    it('successfully withdraws funds from treasury', async function () {
      const user_1 = this.user_1.address;
      const receiver = this.receiver.address;

      // mint extra funds in the treasury (exactly the system funds limit)
      await this.dai.mint(this.treasury.address, toUnits(100e3));

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(receiver)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(110e3));

      await this.treasury.withdraw(toUnits(100e3), receiver, false);
      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(receiver)).to.be.bignumber.equal(toUnits(100e3));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(10000));
    });

    it('successfully withdraws all funds from treasury (all: true)', async function () {
      const user_1 = this.user_1.address;
      const receiver = this.receiver.address;

      // mint extra funds in the treasury (exactly the system funds limit)
      await this.dai.mint(this.treasury.address, toUnits(100e3));

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(receiver)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(110e3));

      await this.treasury.withdraw(toUnits(110e3), receiver, true);
      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(receiver)).to.be.bignumber.equal(toUnits(110e3));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(0));
    });

    it('fails to withdraw user funds from treasury', async function () {
      const user_1 = this.user_1.address;
      const receiver = this.receiver.address;

      // mint extra funds in the treasury (exactly the system funds limit)
      await this.dai.mint(this.treasury.address, toUnits(100e3));

      expect(await this.treasury.getUserBalance(user_1)).to.be.bignumber.equal(toUnits(10000));
      expect(await this.treasury.getTotalUserBalance()).to.be.bignumber.equal(toUnits(10000));
      expect(await this.dai.balanceOf(user_1)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(receiver)).to.be.bignumber.equal(toUnits(0));
      expect(await this.dai.balanceOf(this.treasury.address)).to.be.bignumber.equal(toUnits(110e3));

      await expect(
        this.treasury.withdraw(toUnits(100e3).add(toBN(1)), receiver, false)
      ).to.be.revertedWith('!balance2');
    });

    it('fails to withdraw if not owner', async function () {
      const user_1 = this.user_1.address;
      const receiver = this.receiver.address;

      await expect(
        this.treasury.connect(this.user_1).withdraw(toUnits(10000), receiver, true)
      ).to.be.revertedWith('!authorized');
    });
  });

});

/*
- fundOracle
- swapOnUniswap
*/