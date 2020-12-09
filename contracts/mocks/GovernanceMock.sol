pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import '../Governance.sol';

contract GovernanceMock is Governance {

    using SafeMath for uint256;

	uint256 private _blockNumber;

	function __nextBlock() external {
		_blockNumber = block.number;
	}

    function forVotesThreshold() public view override returns (uint256) {
        return IERC20(token).totalSupply().mul(2).div(100);
    }

    function votingPeriod() public pure override returns (uint256) {
        return 10;
    }

    function executablePeriod() public pure override returns (uint256) {
        return 10;
    }

    function __executeTransaction(
        address contractAddress,
        uint256 value,
        string memory signature,
        bytes memory data
    ) external {
        _executeTransaction(contractAddress, value, signature, data);
    }

    function __addSignaturesToWhitelist(string[] calldata signaturesToAdd) external {
        for (uint256 i=0 ; i < signaturesToAdd.length; ++i) {
            bytes32 signature = keccak256(bytes(signaturesToAdd[i]));
            signatureWhitelist[signature] = true;
        }
    }
}