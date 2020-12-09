const { ethers, upgrades, waffle } = require('hardhat');
const { keccak256, toUtf8Bytes, defaultAbiCoder } = ethers.utils;
const chai = require('chai');
const { deployContract } = waffle;
const provider = waffle.provider;

const { accounts, privateKeys, expectIncludes, expectEvents, expectContractEvents, isBN } = require('./lib/helpers.js');
const { toBytes32, toBytes32_padded, toBN, toUnits, to8Units, address0, MAX_UINT256, signPermit } = require('./lib/utils.js');

chai.use(require('chai-string'));
chai.use(require('./lib/chai-bignumber'));

const { expect } = chai;

const account_names = [ 'deployer', 'deployer_2', 'proposer_1', 'proposer_2', 'holder_1', 'holder_2', 'holder_3', 'holder_4', 'other' ];
const [ deployer_pk, deployer_2_pk, proposer_1_pk, proposer_2_pk, holder_1_pk, holder_2_pk, holder_3_pk, holder_4_pk, other_pk ] = privateKeys;

const getAccountPrivateKey = (name) => privateKeys[account_names.indexOf(name)];

const SIGNATURES = {
  mint: 'mint(address,uint256)'
}

describe('Governance', function () {

  const STATES = ['Pending', 'Active', 'Canceled', 'Rejected', 'Executable', 'Executed', 'Expired'];

  const MINTER_ROLE = keccak256(toUtf8Bytes('MINTER_ROLE'));

  beforeEach(async function () {
    this.signers = await ethers.getSigners();

    for (account_name of account_names) {
      this[account_name] = this.signers[account_names.indexOf(account_name)];
    }

    const Governance = await ethers.getContractFactory('GovernanceMock');
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock');

    this.cap = await ERC20Mock.connect(this.deployer_2).deploy();
    await this.cap.deployed();
    await this.cap.connect(this.deployer_2).initialize('Cap Token', 'CAP');

    this.governance = await Governance.deploy();
    await this.governance.deployed();
    await this.governance.initialize(this.cap.address);

    this.erc20 = await ERC20Mock.connect(this.deployer_2).deploy();
    await this.erc20.deployed();
    await this.erc20.connect(this.deployer_2).initialize('Test Token', 'TEST');
    await this.erc20.connect(this.deployer_2).grantRole(MINTER_ROLE, this.governance.address);
  });

describe('[CAP holders setup #1]', function () {
    beforeEach(async function () {
      for (let account_name of ['proposer_1', 'proposer_2', 'holder_1', 'holder_2', 'holder_3']) {
        await this.cap.connect(this.deployer_2).mint(this[account_name].address, toUnits('1000'));
      }

      // make total supply 100K
      await this.cap.connect(this.deployer_2).mint(this.holder_4.address, toUnits('95000'));
    });

    describe('stakeToVote(amount)', function () {
      it('successfully stakes an amount', async function () {
        await this.cap.connect(this.holder_1).approve(this.governance.address, toUnits('1000'));

        expect(await this.cap.balanceOf(this.holder_1.address)).to.be.bignumber.equal(toUnits('1000'));
        expect(await this.governance.balanceOf(this.holder_1.address)).to.be.bignumber.equal('0');
        await this.governance.connect(this.holder_1).stakeToVote(toUnits('100'));
        expect(await this.governance.balanceOf(this.holder_1.address)).to.be.bignumber.equal(toUnits('100'));
        expect(await this.cap.balanceOf(this.holder_1.address)).to.be.bignumber.equal(toUnits('900'));
        expect(await this.cap.balanceOf(this.governance.address)).to.be.bignumber.equal(toUnits('100'));
      });

      it('successfully updates staked amount', async function () {
        await this.cap.connect(this.holder_1).approve(this.governance.address, toUnits('1000'));

        expect(await this.governance.balanceOf(this.holder_1.address)).to.be.bignumber.equal('0');
        await this.governance.connect(this.holder_1).stakeToVote(toUnits('100'));
        expect(await this.governance.balanceOf(this.holder_1.address)).to.be.bignumber.equal(toUnits('100'));
        await this.governance.connect(this.holder_1).stakeToVote(toUnits('250'));
        expect(await this.governance.balanceOf(this.holder_1.address)).to.be.bignumber.equal(toUnits('350'));
      });

      it('fails to stake an amount without approval', async function () {
        expect(await this.governance.balanceOf(this.holder_1.address)).to.be.bignumber.equal('0');
        await expect(this.governance.connect(this.holder_1).stakeToVote(toUnits('100'))).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
      });
    });

    describe('releaseStaked(amount)', function () {
      it('successfully unstakes a partial amount', async function () {
        await this.cap.connect(this.holder_1).approve(this.governance.address, toUnits('1000'));
        await this.governance.connect(this.holder_1).stakeToVote(toUnits('100'));

        await this.governance.connect(this.holder_1).releaseStaked(toUnits('10'));
        expect(await this.governance.balanceOf(this.holder_1.address)).to.be.bignumber.equal(toUnits('90'));
        expect(await this.cap.balanceOf(this.holder_1.address)).to.be.bignumber.equal(toUnits('910'));
        expect(await this.cap.balanceOf(this.governance.address)).to.be.bignumber.equal(toUnits('90'));
      });

      it('successfully unstakes the full amount', async function () {
        await this.cap.connect(this.holder_1).approve(this.governance.address, toUnits('1000'));
        await this.governance.connect(this.holder_1).stakeToVote(toUnits('100'));

        await this.governance.connect(this.holder_1).releaseStaked(toUnits('100'));
        expect(await this.governance.balanceOf(this.holder_1.address)).to.be.bignumber.equal('0');
        expect(await this.cap.balanceOf(this.holder_1.address)).to.be.bignumber.equal(toUnits('1000'));
        expect(await this.cap.balanceOf(this.governance.address)).to.be.bignumber.equal('0');
      });

      it('fails to unstake a larger amount than what is staked', async function () {
        await this.cap.connect(this.holder_1).approve(this.governance.address, toUnits('1000'));
        await this.governance.connect(this.holder_1).stakeToVote(toUnits('100'));

        await this.governance.connect(this.holder_1).releaseStaked(toUnits('100'));
        await expect(this.governance.connect(this.holder_1).releaseStaked(toUnits('100').add(toBN('1')))).to.be.revertedWith('!insufficient_funds');
      });
    });

    describe('submitProposal', function () {
      it('successfully submits a proposal', async function () {
        await this.cap.connect(this.proposer_1).approve(this.governance.address, toUnits('10'));
        await this.governance.connect(this.proposer_1).stakeToVote(toUnits('10'));

        const data = defaultAbiCoder.encode(['address', 'uint256'], [this.other.address, `${toUnits('12345')}`]);
        const description = 'mint';

        const tx = await this.governance.connect(this.proposer_1).submitProposal('10', [this.erc20.address], ['0'], [SIGNATURES.mint], [data], description, false);
        await expectEvents(tx, 'ProposalCreated', [ { id: toBN(1), proposer: this.proposer_1.address, contracts: [this.erc20.address], /*values: [], */signatures: [SIGNATURES.mint], calldatas: [data], description, expedited: false } ]);

        // check the proposal state
        expect(await this.governance.proposalState('1')).to.be.bignumber.equal(STATES.indexOf('Pending').toString());

        // check the proposal data
        const actualProposalData = await this.governance.proposalData('1');
        expectIncludes(actualProposalData, {
          contracts: [this.erc20.address],
          signatures: [SIGNATURES.mint],
          calldatas: [data]
        });
        expect(actualProposalData).to.have.property('values');

        // check if proposer funds are locked
        const blockNumber = tx.blockNumber;
        const votingPeriod = await this.governance.votingPeriod();
        const expectedLockedUntil = toBN(10).add(toBN(blockNumber)).add(votingPeriod).add(toBN(1)).toString();
        expect(await this.governance.lockedUntil(this.proposer_1.address)).to.be.bignumber.equal(expectedLockedUntil);

        // verify that the user cannot unstake while locked
        await expect(this.governance.connect(this.proposer_1).releaseStaked('10')).to.be.revertedWith('!locked_till_expiry');
      });

      it('fails to submit proposal - not enough staked funds', async function () {
        await this.cap.connect(this.proposer_1).approve(this.governance.address, toUnits('9'));
        await this.governance.connect(this.proposer_1).stakeToVote(toUnits('9'));

        const data = defaultAbiCoder.encode(['address', 'uint256'], [this.other.address, `${toUnits('12345')}`]);
        const description = 'mint';

        await expect(this.governance.connect(this.proposer_1).submitProposal('10', [this.erc20.address], ['0'], [SIGNATURES.mint], [data], description, false)).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
      });

      it('fails to submit proposal - too many transactions', async function () {
        await this.cap.connect(this.proposer_1).approve(this.governance.address, toUnits('10'));
        await this.governance.connect(this.proposer_1).stakeToVote(toUnits('10'));

        const data = defaultAbiCoder.encode(['address', 'uint256'], [this.other.address, `${toUnits('12345')}`]);
        const description = 'mint';

        const a = Array.from(new Array(11));
        await expect(this.governance.connect(this.proposer_1).submitProposal('10', a.map(i => this.erc20.address), a.map(i => '0'), a.map(i => SIGNATURES.mint), a.map(i => data), description, false)).to.be.revertedWith('!max_operations');
      });

    });

    describe('cancelProposal', function () {
      it('successfully cancels a proposal', async function () {
        await this.cap.connect(this.proposer_1).approve(this.governance.address, toUnits('10'));
        await this.governance.connect(this.proposer_1).stakeToVote(toUnits('10'));

        const data = defaultAbiCoder.encode(['address', 'uint256'], [this.other.address, `${toUnits('12345')}`]);
        await this.governance.connect(this.proposer_1).submitProposal('10', [this.erc20.address], ['0'], [SIGNATURES.mint], [data], 'mint', false);

        // check the proposal state
        expect(await this.governance.proposalState('1')).to.be.bignumber.equal(STATES.indexOf('Pending').toString());

        const tx = await this.governance.connect(this.proposer_1).cancelProposal('1');
        await expectEvents(tx, 'ProposalCanceled', [ { id: toBN(1) } ]);
      });

      it('fails to cancel proposal of other user', async function () {
        await this.cap.connect(this.proposer_1).approve(this.governance.address, toUnits('10'));
        await this.governance.connect(this.proposer_1).stakeToVote(toUnits('10'));

        const data = defaultAbiCoder.encode(['address', 'uint256'], [this.other.address, `${toUnits('12345')}`]);
        await this.governance.connect(this.proposer_1).submitProposal('10', [this.erc20.address], ['0'], [SIGNATURES.mint], [data], 'mint', false);

        // check the proposal state
        expect(await this.governance.proposalState('1')).to.be.bignumber.equal(STATES.indexOf('Pending').toString());

        await expect(this.governance.connect(this.holder_1).cancelProposal('1')).to.be.revertedWith('!authorized');
      });
    });

    describe('castVote', function () {
      beforeEach(async function () {
        await this.cap.connect(this.proposer_1).approve(this.governance.address, toUnits('10'));
        await this.governance.connect(this.proposer_1).stakeToVote(toUnits('10'));

        for (let holder of [this.holder_1, this.holder_2]) {
          await this.cap.connect(holder).approve(this.governance.address, toUnits('1000'));
          await this.governance.connect(holder).stakeToVote(toUnits('1000'));
        }

        this.discoverabilityPeriod = '3';
        this.amountToMint = toUnits('12345');
        this.data = defaultAbiCoder.encode(['address', 'uint256'], [this.other.address, `${this.amountToMint}`]);
        const tx = await this.governance.connect(this.proposer_1).submitProposal(this.discoverabilityPeriod, [this.erc20.address], ['0'], [SIGNATURES.mint], [this.data], 'mint', false);

        this.blockNumber = tx.blockNumber;
        this.votingPeriod = await this.governance.votingPeriod();
        this.executablePeriod = await this.governance.executablePeriod();
      });

      it('successfully casts a vote', async function () {
        expect(await this.governance.proposalState('1')).to.be.bignumber.equal(STATES.indexOf('Pending').toString());
        // run enough blocks to end discoverability period
        for (let i=0; i<=parseInt(this.discoverabilityPeriod); i++) { await this.governance.__nextBlock(); }
        expect(await this.governance.proposalState('1')).to.be.bignumber.equal(STATES.indexOf('Active').toString());

        // holder_1 votes
        const tx_1 = await this.governance.connect(this.holder_1).castVote('1', true);
        await expectEvents(tx_1, 'VoteCast', [ { voter: this.holder_1.address, proposalId: toBN(1), support: true, votes: toUnits('1000') } ]);
        expect(await this.governance.proposalState('1')).to.be.bignumber.equal(STATES.indexOf('Active').toString());

        // holder_2 votes
        const tx_2 = await this.governance.connect(this.holder_2).castVote('1', true);
        await expectEvents(tx_2, 'VoteCast', [ { voter: this.holder_2.address, proposalId: toBN(1), support: true, votes: toUnits('1000') } ]);
        expect(await this.governance.proposalState('1')).to.be.bignumber.equal(STATES.indexOf('Active').toString());

        // run enough blocks to end voting period
        for (let i=2; i<=parseInt(this.votingPeriod); i++) { await this.governance.__nextBlock(); }
        expect(await this.governance.proposalState('1')).to.be.bignumber.equal(STATES.indexOf('Executable').toString());

        // execute proposal
        expect(await this.erc20.balanceOf(this.other.address)).to.be.bignumber.equal('0');
        const tx = await this.governance.executeProposal('1');
        const expectedTxHash = keccak256(
          defaultAbiCoder.encode(['address', 'uint256', 'string', 'bytes'], [this.erc20.address, '0', SIGNATURES.mint, this.data])
        );

        await expectEvents(tx, 'ExecuteTransaction', [ { txHash: expectedTxHash, target: this.erc20.address, value: toBN(0), signature: SIGNATURES.mint, data: this.data } ]);
        expect(await this.erc20.balanceOf(this.other.address)).to.be.bignumber.equal(this.amountToMint);
      });

      it('fails to vote when proposal is pending', async function () {
        await expect(this.governance.connect(this.holder_1).castVote('1', true)).to.be.revertedWith('!voting_closed');
      });
    });
  });

});
