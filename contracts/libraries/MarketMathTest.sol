// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MarketMath.sol";

/**
 * @title MarketMathTest
 * @notice Test contract to expose MarketMath library functions
 * @dev Only for testing purposes
 */
contract MarketMathTest {
    function testLmsrCost(
        uint256 liquidityParameter,
        uint256[] memory quantities
    ) external pure returns (uint256) {
        return MarketMath.lmsrCost(liquidityParameter, quantities);
    }

    function testCalculatePrice(
        uint256 liquidityParameter,
        uint256[] memory quantities,
        uint256 outcomeId
    ) external pure returns (uint256) {
        return MarketMath.calculatePrice(liquidityParameter, quantities, outcomeId);
    }

    function testCalculateBuyCost(
        uint256 liquidityParameter,
        uint256[] memory quantities,
        uint256 outcomeId,
        uint256 sharesToBuy
    ) external pure returns (uint256) {
        return MarketMath.calculateBuyCost(liquidityParameter, quantities, outcomeId, sharesToBuy);
    }

    function testCalculateSellReturn(
        uint256 liquidityParameter,
        uint256[] memory quantities,
        uint256 outcomeId,
        uint256 sharesToSell
    ) external pure returns (uint256) {
        return MarketMath.calculateSellReturn(liquidityParameter, quantities, outcomeId, sharesToSell);
    }

    function testCalculateOdds(
        uint256 liquidityParameter,
        uint256[] memory quantities,
        uint256 outcomeId
    ) external pure returns (uint256) {
        return MarketMath.calculateOdds(liquidityParameter, quantities, outcomeId);
    }

    function testExp(uint256 x, uint256 y) external pure returns (uint256) {
        return MarketMath.exp(x, y);
    }

    function testLn(uint256 x) external pure returns (uint256) {
        return MarketMath.ln(x);
    }
}
