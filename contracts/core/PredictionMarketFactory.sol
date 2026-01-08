// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PredictionMarket.sol";

/**
 * @title PredictionMarketFactory
 * @notice Factory contract for creating prediction markets
 */
contract PredictionMarketFactory is Ownable, ReentrancyGuard {
    // All created markets
    address[] public allMarkets;
    mapping(address => bool) public isMarket;

    // Market creation fee
    uint256 public marketCreationFee = 0.01 ether;
    uint256 public minLiquidityParameter = 1 ether;

    // Oracle resolver address
    address public oracleResolver;

    // Events
    event MarketCreated(
        address indexed marketAddress,
        address indexed creator,
        string question,
        uint256 endTime,
        uint256 numOutcomes
    );

    event MarketCreationFeeUpdated(uint256 newFee);
    event OracleResolverUpdated(address indexed newResolver);

    constructor(address _oracleResolver) Ownable(msg.sender) {
        require(_oracleResolver != address(0), "Invalid oracle resolver");
        oracleResolver = _oracleResolver;
    }

    /**
     * @notice Create a new binary market (YES/NO)
     * @param question The prediction question
     * @param endTime When trading ends
     * @param resolutionTime When oracle will resolve
     * @return market Address of the created market
     */
    function createBinaryMarket(
        string memory question,
        uint256 endTime,
        uint256 resolutionTime
    ) external payable nonReentrant returns (address market) {
        string[] memory outcomes = new string[](2);
        outcomes[0] = "YES";
        outcomes[1] = "NO";

        return _createMarket(
            question,
            outcomes,
            endTime,
            resolutionTime,
            minLiquidityParameter
        );
    }

    /**
     * @notice Create a new categorical market with multiple outcomes
     * @param question The prediction question
     * @param outcomes Array of possible outcomes
     * @param endTime When trading ends
     * @param resolutionTime When oracle will resolve
     * @param liquidityParameter Market depth parameter (b)
     * @return market Address of the created market
     */
    function createCategoricalMarket(
        string memory question,
        string[] memory outcomes,
        uint256 endTime,
        uint256 resolutionTime,
        uint256 liquidityParameter
    ) external payable nonReentrant returns (address market) {
        require(outcomes.length >= 2 && outcomes.length <= 10, "Invalid number of outcomes");

        return _createMarket(
            question,
            outcomes,
            endTime,
            resolutionTime,
            liquidityParameter
        );
    }

    /**
     * @notice Internal function to create a market
     */
    function _createMarket(
        string memory question,
        string[] memory outcomes,
        uint256 endTime,
        uint256 resolutionTime,
        uint256 liquidityParameter
    ) private returns (address market) {
        require(msg.value >= marketCreationFee, "Insufficient creation fee");
        require(bytes(question).length > 0, "Question cannot be empty");
        require(endTime > block.timestamp + 1 hours, "End time too soon");
        require(resolutionTime > endTime, "Resolution time must be after end time");
        require(liquidityParameter >= minLiquidityParameter, "Liquidity parameter too low");

        // Deploy new market
        PredictionMarket newMarket = new PredictionMarket(
            question,
            outcomes,
            endTime,
            resolutionTime,
            liquidityParameter,
            msg.sender,  // creator
            oracleResolver
        );

        market = address(newMarket);

        // Register market
        allMarkets.push(market);
        isMarket[market] = true;

        // If user sent more than creation fee, send the rest as initial liquidity
        if (msg.value > marketCreationFee) {
            uint256 initialLiquidity = msg.value - marketCreationFee;
            (bool success, ) = market.call{value: initialLiquidity}("");
            require(success, "Initial liquidity transfer failed");
        }

        emit MarketCreated(market, msg.sender, question, endTime, outcomes.length);
    }

    /**
     * @notice Get total number of markets created
     */
    function getMarketCount() external view returns (uint256) {
        return allMarkets.length;
    }

    /**
     * @notice Get markets in a range
     */
    function getMarkets(uint256 start, uint256 count) external view returns (address[] memory) {
        require(start < allMarkets.length, "Start index out of bounds");

        uint256 end = start + count;
        if (end > allMarkets.length) {
            end = allMarkets.length;
        }

        address[] memory markets = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            markets[i - start] = allMarkets[i];
        }

        return markets;
    }

    /**
     * @notice Update market creation fee (owner only)
     */
    function setMarketCreationFee(uint256 newFee) external onlyOwner {
        marketCreationFee = newFee;
        emit MarketCreationFeeUpdated(newFee);
    }

    /**
     * @notice Update oracle resolver address (owner only)
     */
    function setOracleResolver(address newResolver) external onlyOwner {
        require(newResolver != address(0), "Invalid resolver address");
        oracleResolver = newResolver;
        emit OracleResolverUpdated(newResolver);
    }

    /**
     * @notice Withdraw accumulated creation fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
    }

    receive() external payable {}
}
