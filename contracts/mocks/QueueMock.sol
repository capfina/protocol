pragma solidity ^0.7.3;

import '../Queue.sol';

contract QueueMock is Queue {

    function maxQueueSize() internal pure override returns (uint256 maxSize) {
        return 10;
    }

}