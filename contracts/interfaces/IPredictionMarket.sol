// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPredictionMarket
 * @notice Interface for prediction market contracts
 */
interface IPredictionMarket {
    enum MarketState {
        Active,      // Market is open for trading
        Locked,      // Market is locked, waiting for resolution
        Resolved,    // Market has been resolved
        Disputed,    // Market resolution is disputed
        Cancelled    // Market has been cancelled
    }

    struct MarketInfo {
        string question;
        string[] outcomes;
        uint256 endTime;
        uint256 resolutionTime;
        MarketState state;
        uint256 winningOutcome;
        uint256 totalVolume;
        address creator;
        uint256 liquidityParameter;
    }

    // Events
    event SharesPurchased(
        address indexed buyer,
        uint256 indexed outcomeId,
        uint256 shares,
        uint256 cost
    );

    event SharesSold(
        address indexed seller,
        uint256 indexed outcomeId,
        uint256 shares,
        uint256 payout
    );

    event LiquidityAdded(
        address indexed provider,
        uint256 amount,
        uint256 lpTokens
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 lpTokens,
        uint256 amount
    );

    event MarketResolved(
        uint256 indexed winningOutcome,
        uint256 timestamp
    );

    event MarketCancelled(
        uint256 timestamp
    );

    event WinningsClaimed(
        address indexed claimer,
        uint256 amount
    );

    // Core functions
    function buyShares(uint256 outcomeId, uint256 minShares) external payable returns (uint256 shares);
    function sellShares(uint256 outcomeId, uint256 shares, uint256 minPayout) external returns (uint256 payout);
    function addLiquidity() external payable returns (uint256 lpTokens);
    function removeLiquidity(uint256 lpTokens) external returns (uint256 amount);
    function resolveMarket(uint256 winningOutcome) external;
    function claimWinnings() external returns (uint256 amount);

    // View functions
    function getMarketInfo() external view returns (MarketInfo memory);
    function getPrice(uint256 outcomeId) external view returns (uint256);
    function getOdds(uint256 outcomeId) external view returns (uint256);
    function getQuantities() external view returns (uint256[] memory);
    function getUserShares(address user, uint256 outcomeId) external view returns (uint256);
}
