const { task, subtask } = require('hardhat/config');

task('accounts', 'Prints the list of accounts', async (_, { ethers }) => {
  const accounts = await ethers.getSigners();
  console.log(accounts.map(acc => acc.address));
});