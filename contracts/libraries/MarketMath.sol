// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MarketMath
 * @notice LMSR (Logarithmic Market Scoring Rule) mathematical library for prediction markets
 * @dev Implements the core AMM algorithm for outcome token pricing
 *
 * LMSR Formula:
 * - Cost Function: C(q) = b × ln(Σ exp(q_i / b))
 * - Price Function: P_i = exp(q_i / b) / Σ exp(q_j / b)
 *
 * Where:
 * - b: liquidity parameter (market depth)
 * - q_i: quantity of outcome i sold
 */
library MarketMath {
    uint256 private constant PRECISION = 1e18;
    uint256 private constant MAX_OUTCOMES = 10;

    /**
     * @notice Calculate the cost to buy a certain amount of shares for an outcome
     * @param liquidityParameter The market depth parameter (b)
     * @param quantities Current quantities of each outcome
     * @param outcomeId The outcome to buy
     * @param sharesToBuy Amount of shares to purchase
     * @return cost The cost in base currency
     */
    function calculateBuyCost(
        uint256 liquidityParameter,
        uint256[] memory quantities,
        uint256 outcomeId,
        uint256 sharesToBuy
    ) internal pure returns (uint256 cost) {
        require(outcomeId < quantities.length, "Invalid outcome ID");
        require(sharesToBuy > 0, "Must buy at least one share");

        // Calculate cost before buying
        uint256 costBefore = lmsrCost(liquidityParameter, quantities);

        // Update quantities with new purchase
        uint256[] memory newQuantities = new uint256[](quantities.length);
        for (uint256 i = 0; i < quantities.length; i++) {
            newQuantities[i] = quantities[i];
        }
        newQuantities[outcomeId] += sharesToBuy;

        // Calculate cost after buying
        uint256 costAfter = lmsrCost(liquidityParameter, newQuantities);

        // Cost is the difference
        cost = costAfter - costBefore;
    }

    /**
     * @notice Calculate the payout for selling shares of an outcome
     * @param liquidityParameter The market depth parameter (b)
     * @param quantities Current quantities of each outcome
     * @param outcomeId The outcome to sell
     * @param sharesToSell Amount of shares to sell
     * @return payout The payout in base currency
     */
    function calculateSellReturn(
        uint256 liquidityParameter,
        uint256[] memory quantities,
        uint256 outcomeId,
        uint256 sharesToSell
    ) internal pure returns (uint256 payout) {
        require(outcomeId < quantities.length, "Invalid outcome ID");
        require(sharesToSell > 0, "Must sell at least one share");
        require(quantities[outcomeId] >= sharesToSell, "Insufficient shares");

        // Calculate cost before selling
        uint256 costBefore = lmsrCost(liquidityParameter, quantities);

        // Update quantities after sale
        uint256[] memory newQuantities = new uint256[](quantities.length);
        for (uint256 i = 0; i < quantities.length; i++) {
            newQuantities[i] = quantities[i];
        }
        newQuantities[outcomeId] -= sharesToSell;

        // Calculate cost after selling
        uint256 costAfter = lmsrCost(liquidityParameter, newQuantities);

        // Payout is the difference
        payout = costBefore - costAfter;
    }

    /**
     * @notice Calculate current price (probability) of an outcome
     * @param liquidityParameter The market depth parameter (b)
     * @param quantities Current quantities of each outcome
     * @param outcomeId The outcome to price
     * @return price Price as a fraction of PRECISION (1e18 = 100%)
     */
    function calculatePrice(
        uint256 liquidityParameter,
        uint256[] memory quantities,
        uint256 outcomeId
    ) internal pure returns (uint256 price) {
        require(outcomeId < quantities.length, "Invalid outcome ID");

        // Calculate exp(q_i / b) for target outcome
        uint256 expQi = exp(quantities[outcomeId], liquidityParameter);

        // Calculate sum of exp(q_j / b) for all outcomes
        uint256 sumExp = 0;
        for (uint256 i = 0; i < quantities.length; i++) {
            sumExp += exp(quantities[i], liquidityParameter);
        }

        // Price = exp(q_i / b) / Σ exp(q_j / b)
        price = (expQi * PRECISION) / sumExp;
    }

    /**
     * @notice Calculate the LMSR cost function
     * @param liquidityParameter The market depth parameter (b)
     * @param quantities Current quantities of each outcome
     * @return cost The LMSR cost
     */
    function lmsrCost(
        uint256 liquidityParameter,
        uint256[] memory quantities
    ) internal pure returns (uint256 cost) {
        require(quantities.length > 0 && quantities.length <= MAX_OUTCOMES, "Invalid number of outcomes");
        require(liquidityParameter > 0, "Liquidity parameter must be positive");

        // Calculate Σ exp(q_i / b)
        uint256 sumExp = 0;
        for (uint256 i = 0; i < quantities.length; i++) {
            sumExp += exp(quantities[i], liquidityParameter);
        }

        // C(q) = b × ln(Σ exp(q_i / b))
        cost = (liquidityParameter * ln(sumExp)) / PRECISION;
    }

    /**
     * @notice Calculate odds (inverse of probability)
     * @param liquidityParameter The market depth parameter (b)
     * @param quantities Current quantities of each outcome
     * @param outcomeId The outcome to calculate odds for
     * @return odds Odds as a multiplier (1e18 = 1x)
     */
    function calculateOdds(
        uint256 liquidityParameter,
        uint256[] memory quantities,
        uint256 outcomeId
    ) internal pure returns (uint256 odds) {
        uint256 price = calculatePrice(liquidityParameter, quantities, outcomeId);
        require(price > 0, "Price cannot be zero");

        // Odds = 1 / Price
        odds = (PRECISION * PRECISION) / price;
    }

    /**
     * @notice Approximate natural logarithm using Taylor series
     * @param x Input value (in PRECISION units)
     * @return result ln(x) in PRECISION units
     */
    function ln(uint256 x) internal pure returns (uint256 result) {
        require(x > 0, "ln(0) is undefined");

        // For x close to 1, use Taylor series: ln(1+y) ≈ y - y²/2 + y³/3 - ...
        // For other values, use ln(x) = ln(x/e^n) + n

        uint256 y = x;
        uint256 shift = 0;

        // Bring x close to PRECISION (1.0) by dividing by e
        uint256 e = 2718281828459045235; // e × 1e18

        while (y > 2 * PRECISION) {
            y = (y * PRECISION) / e;
            shift++;
        }

        while (y < PRECISION / 2) {
            y = (y * e) / PRECISION;
            shift--;
        }

        // Now y is close to PRECISION, calculate ln(y) using Taylor series
        int256 z = int256(y) - int256(PRECISION);
        int256 z_squared = (z * z) / int256(PRECISION);
        int256 z_cubed = (z_squared * z) / int256(PRECISION);
        int256 z_fourth = (z_cubed * z) / int256(PRECISION);

        int256 ln_y = z
            - z_squared / 2
            + z_cubed / 3
            - z_fourth / 4;

        // Add back the shift: ln(x) = ln(y) + shift × ln(e)
        result = uint256(ln_y + int256(shift) * int256(PRECISION));
    }

    /**
     * @notice Approximate exponential function e^(x/y) using Taylor series
     * @param x Numerator
     * @param y Denominator (liquidity parameter)
     * @return result e^(x/y) in PRECISION units
     */
    function exp(uint256 x, uint256 y) internal pure returns (uint256 result) {
        require(y > 0, "Denominator cannot be zero");

        // Calculate z = x / y in PRECISION units
        uint256 z = (x * PRECISION) / y;

        // For large z, this could overflow - we need to limit the exponent
        require(z < 100 * PRECISION, "Exponent too large");

        // e^z using Taylor series: e^z = 1 + z + z²/2! + z³/3! + z⁴/4! + ...
        uint256 term = PRECISION;  // Start with 1.0
        result = term;

        for (uint256 i = 1; i <= 20; i++) {  // 20 terms should be sufficient
            term = (term * z) / (i * PRECISION);
            result += term;

            // Stop if term becomes negligible
            if (term < 1000) break;
        }
    }

    /**
     * @notice Calculate the initial liquidity parameter based on initial funding
     * @param numOutcomes Number of outcomes in the market
     * @param initialFunding Initial funding amount
     * @return liquidityParameter Optimal liquidity parameter (b)
     */
    function calculateInitialLiquidityParameter(
        uint256 numOutcomes,
        uint256 initialFunding
    ) internal pure returns (uint256 liquidityParameter) {
        require(numOutcomes >= 2 && numOutcomes <= MAX_OUTCOMES, "Invalid number of outcomes");
        require(initialFunding > 0, "Initial funding must be positive");

        // A common heuristic: b = initialFunding / ln(numOutcomes)
        // This ensures the cost to move the market from uniform to 100% certainty
        // is approximately equal to the initial funding
        uint256 lnN = ln(numOutcomes * PRECISION);
        liquidityParameter = (initialFunding * PRECISION) / lnN;
    }
}
