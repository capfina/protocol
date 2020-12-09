pragma solidity ^0.7.3;

import '../interfaces/ITrading.sol';
import '../interfaces/IQueue.sol';

contract TradingMock is ITrading {

    /* ========== EVENTS ========== */

    event ProcessOrderTriggered(bytes32 symbol, uint256 amount, uint256 price, uint256 positionId, address liquidator);
    event OrderCancelled(uint256 id, uint256 positionId, address indexed sender, string reason);

    /* ========== STATE VARIABLES ========== */

    address public queue;

    /* ========== INITIALIZER ========== */

    function initialize(address _queue) public {
        queue = _queue;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function processOrder(uint256 id, bytes32 symbol, uint256 price, uint256 amount, uint256 positionId, address liquidator) external override {
        require(liquidator == address(0), 'TEST_ERROR_FLOW');
        require(symbol != bytes32(0)); // test error flow without error message
        emit ProcessOrderTriggered(symbol, amount, price, positionId, liquidator);
    }

    function cancelOrder(uint256 id, uint256 positionId, address liquidator, string calldata reason) external override {
        emit OrderCancelled(id, positionId, /* no access to sender in mock */ liquidator, reason);
    }

    function __queueOrder(bytes32 symbol, uint256 margin, uint256 positionId, address liquidator) external returns (uint256 id) {
        return IQueue(queue).queueOrder(symbol, margin, positionId, liquidator);
    }

}
