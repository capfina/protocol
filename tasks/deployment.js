const { task, subtask } = require('hardhat/config');
const deploySystem = require('../lib/deployment/deploySystem');
const upgradeSystem = require('../lib/deployment/upgradeSystem');
const deployImpl = require('../lib/deployment/deployImpl');

subtask('deploy:system', 'deploys system')
  .setAction(deploySystem);

task('deploy', 'deploys system')
  .setAction(async () => {
    await run('compile');
    await run('deploy:system');
  });

task('deploy:impl', 'deploys contract implementation')
  .addParam("contract", "contract name")
  .setAction(async (params, hre) => {
    await run('compile');
    await deployImpl(params, hre);
  });

task('upgrade', 'upgrades system')
  .setAction(upgradeSystem);