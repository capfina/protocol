#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const got = require('got');
const { networks } = require('../networks');

const {
	NETWORK,
	TRADING_ADDRESS,
  ACCOUNT_ADDRESS,
  GAS,
  GAS_PRICE
} = process.env;

if (!TRADING_ADDRESS) {
	console.error('TRADING_ADDRESS env var not set');
	process.exit(1);
}

function getDeploymentConfig(network) {
  if (network != 'development') return require(`../.openzeppelin/${network}.json`);

  const files = fs.readdirSync(path.resolve(__dirname, '../.openzeppelin'));
  const devConfig = files.filter(f => (f.startsWith('dev') || f.startsWith('unknown')) && f.endsWith('.json')).pop();
  return require(`../.openzeppelin/${devConfig}`);
}

function getContractABI(name) {
	return require(`../artifacts/contracts/${name}.sol/${name}.json`).abi;
}

const web3 = new Web3(networks[NETWORK || 'development_ws'].provider());
const deployment_config = getDeploymentConfig(NETWORK || 'development_ws');

//const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
//web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = ACCOUNT_ADDRESS;

console.log('account.address', web3.eth.defaultAccount);

const MAX_BLOCKS = 260000; // 1 month = 260000

// account.address is liquidator address that needs ETH for gas and will receive liquidation reward

const Trading = new web3.eth.Contract(getContractABI('Trading'), TRADING_ADDRESS);

// Keeps track of open positions across the system
let openPositions = {};

const UNIT = Math.pow(10, 8);

function fetchEvents(fromBlock) {

  if (fromBlock < 0) fromBlock = 0;

  console.log('fetchEvents', fromBlock);

  Trading.getPastEvents("allEvents", {
      filter: {},
      fromBlock
  }, (err, events) => {
    if (err) return console.error(err);

    for (const event of events) {
      console.log(event);
      const name = event.event;
      const data = event.returnValues;
      const cachedPosition = openPositions[data.positionId];
      if (name == 'PositionOpened') {
        data.margin /= UNIT;
        data.leverage /= UNIT;
        data.price /= UNIT;
        openPositions[data.positionId] = data;
      } else if (name == 'PositionClosed') {
        const diff = cachedPosition.margin - data.marginClosed / UNIT;
        if (diff > 0) {
          // If partial close, update margin
          openPositions[data.positionId] = diff;
        } else {
          // full close, remove from openPositions
          delete openPositions[data.positionId];
        }
      } else if (name == 'PositionMarginAdded') {
        // Update
        if (cachedPosition) {
          openPositions[data.positionId].leverage = data.newLeverage / UNIT;
          openPositions[data.positionId].margin = data.newMargin / UNIT;
        }
      } else if (name == 'PositionLiquidated') {
        delete openPositions[data.positionId];
      }
    }

  });

}

// 3rd party API price methods

const getPrices = {

  Kraken: async function(products, options) {

    try {
      const { body } = await got(`https://api.kraken.com/0/public/Ticker?pair=${products.join(',')}`, { responseType: 'json' });

      if (!body || body.error && body.error.length) {
        console.error('Kraken error', body, products);
        return;
      }

      let to_return = {};
      for (const symbol in body.result) {
        const item = body.result[symbol];
        let price = parseFloat(item['c'][0]).toFixed(2);
        to_return[symbol] = [price, Date.now()];
      }
      return to_return;
    } catch(e) {
      console.error(e);
    }
  }

}

const symbols_to_products = {
  '0x4254430000000000000000000000000000000000000000000000000000000000': ['XXBTZUSD', 'Kraken']
};

async function checkPositionsForLiquidation() {

  console.log('openPositions', openPositions);

  let sources_to_products = {}; // {source => [products]}
  for (const id in openPositions) {
    const position = openPositions[id];
    console.log('position.symbol', position.symbol);
    const sp = symbols_to_products[position.symbol];
    if (sp) {
      if (!sources_to_products[sp[1]]) sources_to_products[sp[1]] = [];
      if (sources_to_products[sp[1]].includes(sp[0])) continue;
      sources_to_products[sp[1]].push(sp[0])
    } else {
      console.log('New symbol found', position.symbol);
    }
  }

  console.log('sources_to_products', sources_to_products);

  let latestPrices = {};
  for (const s in sources_to_products) {
    const products = sources_to_products[s];
    const _prices = await getPrices[s](products, {auth_token: ''}); // {product => [price, time]}

    for (const p in _prices) {
      latestPrices[p] = _prices[p][0];
    }

  }

  console.log('latestPrices', latestPrices);

  let to_liquidate = [];
  // Calculate liq prices and compare vs latestPrices
  for (const id in openPositions) {

    const position = openPositions[id];

    if (!symbols_to_products[position.symbol]) continue;

    const positionPrice = position.price;
    const product = symbols_to_products[position.symbol][0];
    const latestPrice = latestPrices[product];

    console.log('position', position, positionPrice, product, latestPrice);

    if (positionPrice && product && latestPrice) {
      
      if (position.isBuy && latestPrice < positionPrice * (1 - 1/position.leverage) || !position.isBuy && latestPrice > positionPrice * (1 + 1/position.leverage)) {
        // Can be liquidated
        to_liquidate.push(id);
      }
    
    }

  }

  console.log('to_liquidate', to_liquidate);

  let timeout = 0;
  if (to_liquidate.length > 0) {

    // NOTE: only 5 positions can be liquidated at a time
    for (let i = 0; i < to_liquidate.length; i++) {

      let ids;
      if (i%5 == 0) {
        ids = to_liquidate.slice(i, i+5);
      } else {
        continue;
      }

      setTimeout(async() => {
        console.log('sending tx to liquidate', ids);
        try {
          const receipt = await Trading.methods.liquidatePositions(ids).send({
              from: web3.eth.defaultAccount,
              gas: GAS || 2200000,
              gasPrice: GAS_PRICE || 50 * Math.pow(10,9)
          });
          console.log('Sent tx...', ids, receipt);
        } catch(e) {
          console.error('ERR', e);
        }
      }, timeout);

      timeout += 2 * 60 * 1000;

    }
    

  }

}

let lastFromBlock, lastCheckpoint;
async function main() {
  currentBlockNumber = await web3.eth.getBlockNumber();
  if (!lastFromBlock) {
    lastFromBlock = currentBlockNumber - MAX_BLOCKS;
  } else {
    lastFromBlock = lastCheckpoint;
  }
  lastCheckpoint = currentBlockNumber;
  fetchEvents(lastFromBlock);
  setTimeout(checkPositionsForLiquidation, 2 * 1000);
}

main();
setInterval(main, 60 * 1000)

