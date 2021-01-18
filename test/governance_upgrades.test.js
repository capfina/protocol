const { ethers, web3, upgrades, waffle, artifacts, network } = require('hardhat');
const { keccak256, toUtf8Bytes, defaultAbiCoder } = ethers.utils;
const chai = require('chai');
const { deployContract } = waffle;
const provider = waffle.provider;
const Proposal = require('../lib/proposals/Proposal');
const AdminUpgradeabilityProxyABI = require('../node_modules/@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json');
const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

const { accounts, privateKeys, expectIncludes, expectEvents, expectContractEvents, isBN } = require('./lib/helpers.js');
const { toBytes32, toBytes32_padded, toBN, toUnits, to8Units, address0, MAX_UINT256, signPermit } = require('./lib/utils.js');

chai.use(require('chai-string'));
chai.use(require('./lib/chai-bignumber'));

upgrades.silenceWarnings();

const { expect } = chai;

const account_names = [ 'deployer', 'deployer_2', 'proposer_1', 'proposer_2', 'holder_1', 'holder_2', 'holder_3', 'anyone', 'user_1' ];
const [ deployer_pk, deployer_2_pk, proposer_1_pk, proposer_2_pk, holder_1_pk, holder_2_pk, holder_3_pk, anyone_pk, user_1_pk ] = privateKeys;

const getAccountPrivateKey = (name) => privateKeys[account_names.indexOf(name)];

const SIGNATURES = {
  upgrade: 'upgrade(address,address)'
}

// this test should be enabled when needed (otherwise it corrupts the development node by changing proxyadmin ownership)
describe.skip('Governance Upgrades Proposals', function () {

  const STATES = ['Pending', 'Active', 'Canceled', 'Rejected', 'Executable', 'Executed', 'Expired'];

  const MINTER_ROLE = keccak256(toUtf8Bytes('MINTER_ROLE'));

  const setupTest = async function () {
    this.signers = await ethers.getSigners();

    for (account_name of account_names) {
      this[account_name] = this.signers[account_names.indexOf(account_name)];
    }

    Governance = await ethers.getContractFactory('GovernanceMock');
    ERC20Mock = await ethers.getContractFactory('ERC20Mock');
    ERC20v2Mock = await ethers.getContractFactory('ERC20v2Mock');

    this.cap = await ERC20Mock.connect(this.deployer_2).deploy();
    await this.cap.deployed();
    await this.cap.connect(this.deployer_2).initialize('Cap Token', 'CAP');

    this.governance = await Governance.deploy();
    await this.governance.deployed();
    await this.governance.initialize(this.cap.address);

    // deploy erc20 contract
    this.erc20 = await upgrades.deployProxy(ERC20Mock, ['Test Token', 'TEST'], { unsafeAllowCustomTypes: true });
    await this.erc20.deployed();
    await upgrades.admin.transferProxyAdminOwnership(this.governance.address);

    this.erc20v2Logic = await ERC20v2Mock.deploy();
    await this.erc20v2Logic.deployed();

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

  describe('[JSON_PROPOSAL] upgrade proposal', function () {
    before(setupTest);

    it('successfully upgrades the ERC20 contract through community voting', async function () {
      const upgradeProposal = new Proposal({
        title: 'upgrade TEST token',
        description: 'upgrades TEST token contract to v2',
        discoverabilityPeriod: this.discoverabilityPeriod,
        transactions: [
          {
            type: 'upgrade',
            contract: this.erc20.address,
            new_implementation: this.erc20v2Logic.address
          }
        ]
      }, this.proposalOptions);
      const upgradeProposalData = await upgradeProposal.prepareToSubmit();
      const tx = await this.governance.connect(this.proposer_1).submitProposal(...upgradeProposalData);

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

      expect(await this.erc20.version()).to.be.bignumber.equal(toBN(1));

      // read-only provider
      const provider = ethers.getDefaultProvider(network.config.url);
      // get the ProxyAdmin of this contract
      const proxyAdminAddress = '0x' + (await provider.getStorageAt(this.erc20.address, ADMIN_SLOT)).substring(26);

      // execute proposal => upgrades test ERC20 contract
      const tx2 = await this.governance.connect(this.anyone).executeProposal(`${proposalId}`);
      await expectContractEvents(this.governance, 'ExecuteTransaction', tx2.blockNumber, tx2.blockNumber, [{target: proxyAdminAddress.toLowerCase(), value: toBN(0), signature: SIGNATURES.upgrade}]);

      this.testERC20ProxyInterface = new ethers.Contract(this.erc20.address, AdminUpgradeabilityProxyABI.abi, this.deployer);
      await expectContractEvents(this.testERC20ProxyInterface, 'Upgraded', tx2.blockNumber, tx2.blockNumber, [{implementation: this.erc20v2Logic.address.toLowerCase()}]);

      // check if testERC20 upgraded to v2
      expect(await this.erc20.name()).to.equal('Test Token');
      expect(await this.erc20.symbol()).to.equal('TEST');
      expect(await this.erc20.version()).to.be.bignumber.equal(toBN(2));
    });
  });

});
