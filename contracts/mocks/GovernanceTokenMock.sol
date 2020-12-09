pragma solidity ^0.7.3;

import '@openzeppelin/contracts-upgradeable/presets/ERC20PresetMinterPauserUpgradeable.sol';

contract GovernanceTokenMock is ERC20PresetMinterPauserUpgradeable {

    /* ========== STATE VARIABLES ========== */

    mapping (address => bool) private _faucetAddresses;

    /* ========== MUTATIVE FUNCTIONS ========== */

    function faucetRequest() external {
        require(!_faucetAddresses[_msgSender()], '!allowed');
        _faucetAddresses[_msgSender()] = true;
        _mint(_msgSender(), 1000e18);
    }

}
