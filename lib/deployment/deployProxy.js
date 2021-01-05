const AdminUpgradeabilityProxyABI = require('../../node_modules/@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json');
const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

function exitWithError(message) {
  console.error('ERROR:', message);
  process.exit(1);
}

module.exports = async function (params, { ethers, upgrades, network }) {
  const {
    contract,
    governance
  } = params;

  console.error('network:', network.name);
  const addresses = {}

  // read-only provider
  const provider = ethers.getDefaultProvider(network.config.url);

  try {
    // check governance proxy
    const governanceProxyBytecode = await provider.getCode(governance);
    if (governanceProxyBytecode != AdminUpgradeabilityProxyABI.deployedBytecode) exitWithError(`Governance address ${governance} not a proxy`);

    // get governance ProxyAdmin
    const proxyAdmin = '0x' + (await provider.getStorageAt(governance, ADMIN_SLOT)).substring(26);

    // deploy contract and proxy
    const Contract = await ethers.getContractFactory(contract);
    const deployedContract = await upgrades.deployProxy(Contract, [], { initializer:false, unsafeAllowCustomTypes: true });
    await deployedContract.deployed();
    console.error('deployed:', contract);
    addresses[contract] = deployedContract.address;

    // get deployed contract ProxyAdmin
    const currentProxyAdmin = '0x' + (await provider.getStorageAt(deployedContract.address, ADMIN_SLOT)).substring(26);

    // transfer proxy ownership to proxyAdmin
    if (currentProxyAdmin != proxyAdmin) {
      await upgrades.admin.changeProxyAdmin(deployedContract.address, proxyAdmin);
    }

  } finally {
    // print all the deployed addresses
    console.log(JSON.stringify(addresses, null , 2));
  }

}
