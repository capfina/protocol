const { task, subtask } = require('hardhat/config');
const deploySystem = require('../lib/deployment/deploySystem');
const upgradeSystem = require('../lib/deployment/upgradeSystem');

subtask('deploy:system', 'deploys system')
  .setAction(deploySystem);

task('deploy', 'deploys system')
  .setAction(async () => {
    await run('compile');
    await run('deploy:system');
  });

task('upgrade', 'upgrades system')
  .setAction(upgradeSystem);