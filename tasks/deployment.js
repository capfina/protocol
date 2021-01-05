const { task, subtask } = require('hardhat/config');
const deploySystem = require('../lib/deployment/deploySystem');
const upgradeSystem = require('../lib/deployment/upgradeSystem');
const deployImpl = require('../lib/deployment/deployImpl');
const deployProxy = require('../lib/deployment/deployProxy');

subtask('deploy:system', 'deploys system')
  .setAction(deploySystem);

task('deploy', 'deploys system')
  .setAction(async () => {
    await run('compile');
    await run('deploy:system');
  });

task('deploy:impl', 'deploys contract implementation')
  .addParam('contract', 'contract name')
  .setAction(async (params, hre) => {
    await run('compile');
    await deployImpl(params, hre);
  });

task('deploy:proxy', 'deploys an implementation contract and its proxy')
  .addParam('contract', 'contract name')
  .addParam('governance', 'governance contract address')
  .setAction(async (params, hre) => {
    await run('compile');
    await deployProxy(params, hre);
  });

task('upgrade', 'upgrades system')
  .setAction(upgradeSystem);