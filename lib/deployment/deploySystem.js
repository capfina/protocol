function exitWithError(message) {
  console.error('ERROR:', message);
  process.exit(1);
}

module.exports = async function (params, { ethers, upgrades, network }) {
  const {
    capToken
  } = params;

  console.error('network:', network.name);
  const addresses = {}

  try {
    // mainnet dai and cap
    let dai = { address: '0x6b175474e89094c44da98b954eedeac495271d0f' };
    let cap = { address: '0x43044f861ec040DB59A7e324c40507adDb673142' };

    if (network.name != 'mainnet') {
      // deploy dai mock
      const DaiMock = await ethers.getContractFactory('DaiMock');
      dai = await DaiMock.deploy();
      await dai.deployed();
      console.error('proxy deployed: dai');

      // deploy cap mock
      const GovernanceTokenMock = await ethers.getContractFactory('GovernanceTokenMock');
      cap = await upgrades.deployProxy(GovernanceTokenMock, ['CAP Token', 'CAP'], { unsafeAllowCustomTypes: true });
      await cap.deployed();
      console.error('proxy deployed: cap');
    }

    Object.assign(addresses, { dai: dai.address, cap: cap.address });

    // deploy governance
    const Governance = await ethers.getContractFactory(network.name == 'mainnet' ? 'Governance' : 'GovernanceTestNet');
    const governance = await upgrades.deployProxy(Governance, [cap.address], { unsafeAllowCustomTypes: true });
    await governance.deployed();
    addresses.governance = governance.address;
    console.error('proxy deployed: governance');

    const options = { unsafeAllowCustomTypes: true }
    if (network.name != 'development') {
      // don't initialize on remote networks
      options.initializer = false;
    }

    // deploy other contracts
    const Products = await ethers.getContractFactory('Products');
    const products = await upgrades.deployProxy(Products, [], options);
    await products.deployed();
    addresses.products = products.address;
    console.error('proxy deployed: products');

    const Queue = await ethers.getContractFactory('Queue');
    const queue = await upgrades.deployProxy(Queue, [], options);
    await queue.deployed();
    addresses.queue = queue.address;
    console.error('proxy deployed: queue');

    const Trading = await ethers.getContractFactory('Trading');
    const trading = await upgrades.deployProxy(Trading, [dai.address], options);
    await trading.deployed();
    addresses.trading = trading.address;
    console.error('proxy deployed: trading');

    const Treasury = await ethers.getContractFactory('Treasury');
    const treasury = await upgrades.deployProxy(Treasury, [dai.address], options);
    await treasury.deployed();
    addresses.treasury = treasury.address;
    console.error('proxy deployed: treasury');

    if (network.name == 'development') {
      const ORACLE_ADDRESS = '0xbcd4042de499d14e55001ccbb24a551f3b954096'; // account #10 in local node
      // local deploy, register contracts
      await queue.registerContracts(ORACLE_ADDRESS, trading.address);
      await trading.registerContracts(products.address, queue.address, treasury.address);
      await treasury.registerContracts(ORACLE_ADDRESS, trading.address);
      // register products
      const B32_BTC = ethers.utils.formatBytes32String('BTC');
      const B32_AAPL = ethers.utils.formatBytes32String('BBG000B9XRY4');
      await products.register(
        [B32_BTC, B32_AAPL],
        [10000000000, 2000000000],
        [100000, 100000],
        [2, 2]
      );
      // register currencies
      await trading.setCurrencyMin(1000000000);
      await trading.setMaxRisk([B32_BTC, B32_AAPL], [3000000 * Math.pow(10,8), 3000000 * Math.pow(10,8)]);
    }

    if (network.name != 'development') {
      // Transfer proxy admin ownership to governance
      await upgrades.admin.transferProxyAdminOwnership(governance.address);
    }
  } finally {
    // print all the deployed addresses
    console.log(JSON.stringify(addresses, null , 2));
  }

}
