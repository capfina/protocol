const { ethers, web3, upgrades, waffle, artifacts } = require('hardhat');
const { keccak256, toUtf8Bytes, defaultAbiCoder } = ethers.utils;
const chai = require('chai');
const { deployContract } = waffle;
const provider = waffle.provider;
const Proposal = require('../lib/proposals/Proposal');

const { accounts, privateKeys, expectIncludes, expectEvents, expectContractEvents, isBN } = require('./lib/helpers.js');
const { toBytes32, toBytes32_padded, toBN, toUnits, to8Units, address0, MAX_UINT256, signPermit } = require('./lib/utils.js');

chai.use(require('chai-string'));
chai.use(require('./lib/chai-bignumber'));

const { expect } = chai;

const account_names = [ 'deployer', 'deployer_2', 'proposer_1', 'proposer_2', 'holder_1', 'holder_2', 'holder_3', 'anyone', 'user_1' ];
const [ deployer_pk, deployer_2_pk, proposer_1_pk, proposer_2_pk, holder_1_pk, holder_2_pk, holder_3_pk, anyone_pk, user_1_pk ] = privateKeys;

const getAccountPrivateKey = (name) => privateKeys[account_names.indexOf(name)];

const SIGNATURES = {
  mint: 'mint(address,uint256)'
}

describe('Governance Expedited Proposals', function () {

  const STATES = ['Pending', 'Active', 'Canceled', 'Rejected', 'Executable', 'Executed', 'Expired'];

  const MINTER_ROLE = keccak256(toUtf8Bytes('MINTER_ROLE'));

  const setupTest = async function () {
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
    await this.governance.__addSignaturesToWhitelist([ SIGNATURES.mint ]);

    // deploy erc20 contract and make governance a minter
    this.erc20 = await ERC20Mock.connect(this.deployer_2).deploy();
    await this.erc20.deployed();
    await this.erc20.connect(this.deployer_2).initialize('Test Token', 'TEST');
    await this.erc20.connect(this.deployer_2).grantRole(MINTER_ROLE, this.governance.address);

    // CAP token distribution
    for (let holder of ['proposer_1', 'proposer_2', 'holder_1', 'holder_2', 'holder_3', 'anyone']) {
      // mint CAP tokens for holder
      await this.cap.mint(this[holder].address, toUnits('10000'));
      // approve capGov
      await this.cap.connect(this[holder]).approve(this.governance.address, toUnits('10000'));
      // stake all assets to vote
      await this.governance.connect(this[holder]).stakeToVote(toUnits('10000'));
    }

    // make total supply 100K
    await this.cap.mint(this.deployer.address, toUnits('70000'));

    // set discoverability period to minimum
    this.discoverabilityPeriod = '1';

    // get voting and executable periods from contract
    this.votingPeriod = await this.governance.votingPeriod();
    this.executablePeriod = await this.governance.executablePeriod();

    this.proposalOptions = {
      web3,
      artifacts,
      governanceAddress: this.governance.address
    }
  }

  describe('[JSON_PROPOSAL] propose (expedited) > vote > mint', function () {
    before(setupTest);

    it('successfully mints tokens through expedited community voting', async function () {
      const mintProposal = new Proposal({
        title: 'mint TEST tokens',
        description: 'urgently mints 500 TEST tokens to user_1',
        discoverabilityPeriod: this.discoverabilityPeriod,
        expedited: true,
        transactions: [
          {
            type: 'method',
            contract: this.erc20.address,
            method: 'mint',
            params: [
              { name: 'account', type: 'address', value: this.user_1.address },
              { name: 'amount', type: 'uint256', value: toUnits(500).toString() }
            ]
          }
        ]
      }, this.proposalOptions);
      const proposalData = await mintProposal.prepareToSubmit();
      const tx = await this.governance.connect(this.proposer_1).submitProposal(...proposalData);

      const proposalId = toBN(1);
      await expectEvents(tx, 'ProposalCreated', [ { id: proposalId } ]);

      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Pending').toString());
      // discoverabilityPeriod is set to '1' => immediately active after one block
      await this.governance.__nextBlock();
      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Active').toString());

      await this.governance.connect(this.holder_1).castVote(`${proposalId}`, true);
      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Active').toString());

      await this.governance.connect(this.holder_2).castVote(`${proposalId}`, true);
      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Executable').toString());

      // execute proposal => deploys test ERC20 contract
      const execReceipt = await this.governance.connect(this.anyone).executeProposal(`${proposalId}`);
      await expectEvents(execReceipt, 'ExecuteTransaction', [ { target: this.erc20.address, value: toBN(0), signature: SIGNATURES.mint } ]);

      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Executed').toString());
      expect(await this.erc20.balanceOf(this.user_1.address)).to.be.bignumber.equal(toUnits(500));
    });

    it('fails to mint (4 times) - MAX OPS', async function () {
      const mintProposal = new Proposal({
        title: 'mint TEST tokens',
        description: 'urgently mints 500 TEST tokens to 4 users',
        discoverabilityPeriod: this.discoverabilityPeriod,
        expedited: true,
        transactions: [
          {
            type: 'method',
            contract: this.erc20.address,
            method: 'mint',
            params: [
              { name: 'account', type: 'address', value: this.holder_1.address },
              { name: 'amount', type: 'uint256', value: toUnits(500).toString() }
            ]
          },
          {
            type: 'method',
            contract: this.erc20.address,
            method: 'mint',
            params: [
              { name: 'account', type: 'address', value: this.holder_2.address },
              { name: 'amount', type: 'uint256', value: toUnits(500).toString() }
            ]
          },
          {
            type: 'method',
            contract: this.erc20.address,
            method: 'mint',
            params: [
              { name: 'account', type: 'address', value: this.holder_3.address },
              { name: 'amount', type: 'uint256', value: toUnits(500).toString() }
            ]
          },
          {
            type: 'method',
            contract: this.erc20.address,
            method: 'mint',
            params: [
              { name: 'account', type: 'address', value: this.anyone.address },
              { name: 'amount', type: 'uint256', value: toUnits(500).toString() }
            ]
          }
        ]
      }, this.proposalOptions);
      const proposalData = await mintProposal.prepareToSubmit();
      await expect(
        this.governance.connect(this.proposer_1).submitProposal(...proposalData)
      ).to.be.revertedWith('!max_operations');
    });
  });

  describe('[JSON_PROPOSAL] propose (expedited) (not whitelisted)', function () {
    before(setupTest);

    it('fails to submit an expedited proposal (not whitelisted)', async function () {
      const proposal = new Proposal({
        title: 'mint TEST tokens',
        description: 'urgently calls notWhitelisted',
        discoverabilityPeriod: this.discoverabilityPeriod,
        expedited: true,
        transactions: [
          {
            type: 'method',
            contract: this.erc20.address,
            method: 'notWhitelisted',
            params: [
              { name: 'account', type: 'address', value: this.user_1.address }
            ]
          }
        ]
      }, this.proposalOptions);
      const proposalData = await proposal.prepareToSubmit();
      await expect(
        this.governance.connect(this.proposer_1).submitProposal(...proposalData)
      ).to.be.revertedWith('!error');
    });

    it('fails to submit an expedited proposal (whitelisted + not whitelisted)', async function () {
      const proposal = new Proposal({
        title: 'mint TEST tokens',
        description: 'urgently calls mint + notWhitelisted',
        discoverabilityPeriod: this.discoverabilityPeriod,
        expedited: true,
        transactions: [
          {
            type: 'method',
            contract: this.erc20.address,
            method: 'mint',
            params: [
              { name: 'account', type: 'address', value: this.user_1.address },
              { name: 'amount', type: 'uint256', value: toUnits(500).toString() }
            ]
          },
          {
            type: 'method',
            contract: this.erc20.address,
            method: 'notWhitelisted',
            params: [
              { name: 'account', type: 'address', value: this.user_1.address }
            ]
          }
        ]
      }, this.proposalOptions);
      const proposalData = await proposal.prepareToSubmit();
      await expect(
        this.governance.connect(this.proposer_1).submitProposal(...proposalData)
      ).to.be.revertedWith('!error');
    });
  });

  describe('addSignaturesToWhitelist()', function () {
    before(setupTest);

    it('fails to directly add signature to whitelist', async function () {
      expect(await this.governance.signatureWhitelist(keccak256(toUtf8Bytes(SIGNATURES.mint)))).to.be.equal(true);
      expect(await this.governance.signatureWhitelist(keccak256(toUtf8Bytes('notWhitelisted()')))).to.be.equal(false);

      await expect(
        this.governance.connect(this.holder_1).addSignaturesToWhitelist([
          keccak256(toUtf8Bytes('notWhitelisted()')),
          keccak256(toUtf8Bytes('alsoNotWhitelisted(uint256)')),
        ])
      ).to.be.revertedWith('!authorized');
    });

    it('successfully adds signature to whitelist through community voting', async function () {
      expect(await this.governance.signatureWhitelist(keccak256(toUtf8Bytes(SIGNATURES.mint)))).to.be.equal(true);
      expect(await this.governance.signatureWhitelist(keccak256(toUtf8Bytes('notWhitelisted()')))).to.be.equal(false);

      const proposal = new Proposal({
        title: 'add to whitelist',
        description: 'adds signatures to whitelist',
        discoverabilityPeriod: this.discoverabilityPeriod,
        expedited: false,
        transactions: [
          {
            type: 'method',
            contract: this.governance.address,
            method: 'addSignaturesToWhitelist',
            params: [
              { name: 'signatures', type: 'string[]', value: ['notWhitelisted()', 'alsoNotWhitelisted(uint256)'] }
            ]
          }
        ]
      }, this.proposalOptions);
      const proposalData = await proposal.prepareToSubmit();
      const tx = await this.governance.connect(this.proposer_1).submitProposal(...proposalData);

      const proposalId = toBN(1);
      await expectEvents(tx, 'ProposalCreated', [ { id: proposalId } ]);

      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Pending').toString());
      // discoverabilityPeriod is set to '1' => immediately active after one block
      await this.governance.__nextBlock();
      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Active').toString());

      for (let holder of ['holder_1', 'holder_2', 'holder_3']) {
        const votingReceipt = await this.governance.connect(this[holder]).castVote(`${proposalId}`, true);
        await expectEvents(votingReceipt, 'VoteCast', [ { voter: this[holder].address, proposalId, support: true, votes: toUnits('10000') } ]);
      }

      // run enough blocks to end voting period
      for (let i=3; i<=parseInt(this.votingPeriod); i++) { await this.governance.__nextBlock(); }
      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Executable').toString());

      // execute proposal => deploys test ERC20 contract
      const execReceipt = await this.governance.connect(this.anyone).executeProposal(`${proposalId}`);
      await expectEvents(execReceipt, 'ExecuteTransaction', [ { target: this.governance.address, value: toBN(0), signature: 'addSignaturesToWhitelist(string[])' } ]);

      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Executed').toString());

      expect(await this.governance.signatureWhitelist(keccak256(toUtf8Bytes('notWhitelisted()')))).to.be.equal(true);
      expect(await this.governance.signatureWhitelist(keccak256(toUtf8Bytes('alsoNotWhitelisted(uint256)')))).to.be.equal(true);
    });
  });

  describe('removeSignaturesFromWhitelist()', function () {
    before(setupTest);

    it('fails to directly remove signature from whitelist', async function () {
      expect(await this.governance.signatureWhitelist(keccak256(toUtf8Bytes(SIGNATURES.mint)))).to.be.equal(true);

      await expect(
        this.governance.connect(this.holder_1).removeSignaturesFromWhitelist([
          keccak256(toUtf8Bytes(SIGNATURES.mint))
        ])
      ).to.be.revertedWith('!authorized');
    });

    it('successfully removes signature from whitelist through community voting', async function () {
      expect(await this.governance.signatureWhitelist(keccak256(toUtf8Bytes(SIGNATURES.mint)))).to.be.equal(true);

      const proposal = new Proposal({
        title: 'remove from whitelist',
        description: 'removes signatures from whitelist',
        discoverabilityPeriod: this.discoverabilityPeriod,
        expedited: false,
        transactions: [
          {
            type: 'method',
            contract: this.governance.address,
            method: 'removeSignaturesFromWhitelist',
            params: [
              { name: 'signatures', type: 'string[]', value: [SIGNATURES.mint] }
            ]
          }
        ]
      }, this.proposalOptions);
      const proposalData = await proposal.prepareToSubmit();
      const tx = await this.governance.connect(this.proposer_1).submitProposal(...proposalData);

      const proposalId = toBN(1);
      await expectEvents(tx, 'ProposalCreated', [ { id: proposalId } ]);

      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Pending').toString());
      // discoverabilityPeriod is set to '1' => immediately active after one block
      await this.governance.__nextBlock();
      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Active').toString());

      for (let holder of ['holder_1', 'holder_2', 'holder_3']) {
        const votingReceipt = await this.governance.connect(this[holder]).castVote(`${proposalId}`, true);
        await expectEvents(votingReceipt, 'VoteCast', [ { voter: this[holder].address, proposalId, support: true, votes: toUnits('10000') } ]);
      }

      // run enough blocks to end voting period
      for (let i=3; i<=parseInt(this.votingPeriod); i++) { await this.governance.__nextBlock(); }
      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Executable').toString());

      // execute proposal => deploys test ERC20 contract
      const execReceipt = await this.governance.connect(this.anyone).executeProposal(`${proposalId}`);
      await expectEvents(execReceipt, 'ExecuteTransaction', [ { target: this.governance.address, value: toBN(0), signature: 'removeSignaturesFromWhitelist(string[])' } ]);

      expect(await this.governance.proposalState(`${proposalId}`)).to.be.bignumber.equal(STATES.indexOf('Executed').toString());

      expect(await this.governance.signatureWhitelist(keccak256(toUtf8Bytes(SIGNATURES.mint)))).to.be.equal(false);
    });
  });

});
