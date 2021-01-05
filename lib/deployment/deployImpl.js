module.exports = async function (params, { ethers, upgrades, network }) {
  const {
    contract
  } = params;

  console.error('network:', network.name);
  const addresses = {}

  try {
    const Contract = await ethers.getContractFactory(contract);
    deployedContract = await Contract.deploy();
    await deployedContract.deployed();
    console.error('deployed:', contract);
    addresses[contract] = deployedContract.address;

  } finally {
    // print all the deployed addresses
    console.log(JSON.stringify(addresses, null , 2));
  }

}