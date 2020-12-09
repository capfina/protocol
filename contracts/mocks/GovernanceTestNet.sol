pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import '../Governance.sol';

contract GovernanceTestNet is Governance {

    function votingPeriod() public pure override returns (uint256) {
        return 80;
    }

}