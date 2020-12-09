pragma solidity ^0.7.3;

import '@openzeppelin/contracts-upgradeable/presets/ERC20PresetMinterPauserUpgradeable.sol';

contract ERC20Mock is ERC20PresetMinterPauserUpgradeable {

    function version() public pure returns (uint256) {
        return 1;
    }

}