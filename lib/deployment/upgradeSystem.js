function exitWithError(message) {
  console.error('ERROR:', message);
  process.exit(1);
}

const PRODUCTS_PROXY = '0x279947e1a7748Af67Ed416f963d7e0f88071Cf98';
const QUEUE_PROXY = '0x8dA47DD12384f3A0c711E0cCb8Ac60D50d0e8cC8';
const TRADING_PROXY = '0x143E8C6D4114Ea49292D4183bB7df2382A58FC28';
const TREASURY_PROXY = '0xa9186cf932e4e05b4606d107361Ae7b6651AF1b7';

module.exports = async function (params, { ethers, upgrades, network }) {

  console.error('network:', network.name);

  try {

    const Products = await ethers.getContractFactory("Products");
    await upgrades.upgradeProxy(PRODUCTS_PROXY, Products, {unsafeAllowCustomTypes: true});
    console.log("Products upgraded");

    const Queue = await ethers.getContractFactory("Queue");
    await upgrades.upgradeProxy(QUEUE_PROXY, Queue, {unsafeAllowCustomTypes: true});
    console.log("Queue upgraded");

    const Trading = await ethers.getContractFactory("Trading");
    await upgrades.upgradeProxy(TRADING_PROXY, Trading, {unsafeAllowCustomTypes: true});
    console.log("Trading upgraded");

    const Treasury = await ethers.getContractFactory("Treasury");
    await upgrades.upgradeProxy(TREASURY_PROXY, Treasury, {unsafeAllowCustomTypes: true});
    console.log("Treasury upgraded");

  } finally {

  }

}