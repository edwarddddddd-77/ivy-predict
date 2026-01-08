// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../libraries/MarketMath.sol";
import "../interfaces/IPredictionMarket.sol";

/**
 * @title PredictionMarket
 * @notice Core prediction market contract implementing LMSR AMM
 * @dev Single market instance created by PredictionMarketFactory
 */
contract PredictionMarket is IPredictionMarket, Ownable, ReentrancyGuard, Pausable {
    using MarketMath for uint256;

    // Market parameters
    string public question;
    string[] public outcomes;
    uint256 public endTime;
    uint256 public resolutionTime;
    uint256 public liquidityParameter;
    address public creator;
    address public oracleResolver;

    // Market state
    MarketState public state;
    uint256 public winningOutcome;
    uint256 public totalVolume;

    // Outcome quantities (shares sold)
    uint256[] public quantities;

    // User balances: user => outcomeId => shares
    mapping(address => mapping(uint256 => uint256)) public userShares;

    // Liquidity pool
    uint256 public totalLiquidity;
    uint256 public totalLPTokens;
    mapping(address => uint256) public lpTokenBalances;

    // Fees
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant PROTOCOL_FEE = 50;    // 0.5%
    uint256 public constant LP_FEE = 100;         // 1.0%
    uint256 public constant CREATOR_FEE = 50;     // 0.5%
    uint256 public constant TOTAL_FEE = 200;      // 2.0%

    uint256 public accumulatedProtocolFees;
    uint256 public accumulatedCreatorFees;

    // Constants
    uint256 private constant PRECISION = 1e18;

    modifier onlyActive() {
        require(state == MarketState.Active, "Market not active");
        require(block.timestamp < endTime, "Market has ended");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleResolver, "Only oracle can resolve");
        _;
    }

    /**
     * @notice Initialize a new prediction market
     */
    constructor(
        string memory _question,
        string[] memory _outcomes,
        uint256 _endTime,
        uint256 _resolutionTime,
        uint256 _liquidityParameter,
        address _creator,
        address _oracleResolver
    ) Ownable(_creator) {
        require(_outcomes.length >= 2 && _outcomes.length <= 10, "Invalid number of outcomes");
        require(_endTime > block.timestamp, "End time must be in future");
        require(_resolutionTime > _endTime, "Resolution time must be after end time");
        require(_liquidityParameter > 0, "Liquidity parameter must be positive");

        question = _question;
        outcomes = _outcomes;
        endTime = _endTime;
        resolutionTime = _resolutionTime;
        liquidityParameter = _liquidityParameter;
        creator = _creator;
        oracleResolver = _oracleResolver;

        state = MarketState.Active;
        quantities = new uint256[](_outcomes.length);
    }

    /**
     * @notice Buy shares of a specific outcome
     * @param outcomeId The outcome to buy
     * @param minShares Minimum shares to receive (slippage protection)
     * @return shares Number of shares purchased
     */
    function buyShares(
        uint256 outcomeId,
        uint256 minShares
    ) external payable override onlyActive whenNotPaused nonReentrant returns (uint256 shares) {
        require(outcomeId < outcomes.length, "Invalid outcome ID");
        require(msg.value > 0, "Must send BNB");

        // Calculate fees
        uint256 feeAmount = (msg.value * TOTAL_FEE) / FEE_DENOMINATOR;
        uint256 amountAfterFee = msg.value - feeAmount;

        // Distribute fees
        _distributeFees(feeAmount);

        // Calculate shares to be purchased
        uint256 cost = MarketMath.calculateBuyCost(
            liquidityParameter,
            quantities,
            outcomeId,
            amountAfterFee
        );

        // For simplicity, shares ≈ amount spent (can be refined)
        shares = (amountAfterFee * PRECISION) / (cost > 0 ? cost : PRECISION);
        require(shares >= minShares, "Slippage too high");

        // Update state
        quantities[outcomeId] += shares;
        userShares[msg.sender][outcomeId] += shares;
        totalVolume += msg.value;
        totalLiquidity += amountAfterFee;

        emit SharesPurchased(msg.sender, outcomeId, shares, msg.value);
    }

    /**
     * @notice Sell shares of a specific outcome
     * @param outcomeId The outcome to sell
     * @param sharesToSell Number of shares to sell
     * @param minPayout Minimum payout to receive (slippage protection)
     * @return payout Amount of BNB received
     */
    function sellShares(
        uint256 outcomeId,
        uint256 sharesToSell,
        uint256 minPayout
    ) external override onlyActive whenNotPaused nonReentrant returns (uint256 payout) {
        require(outcomeId < outcomes.length, "Invalid outcome ID");
        require(userShares[msg.sender][outcomeId] >= sharesToSell, "Insufficient shares");

        // Calculate payout
        payout = MarketMath.calculateSellReturn(
            liquidityParameter,
            quantities,
            outcomeId,
            sharesToSell
        );

        // Apply fees
        uint256 feeAmount = (payout * TOTAL_FEE) / FEE_DENOMINATOR;
        uint256 payoutAfterFee = payout - feeAmount;

        require(payoutAfterFee >= minPayout, "Slippage too high");
        require(payoutAfterFee <= totalLiquidity, "Insufficient liquidity");

        // Distribute fees
        _distributeFees(feeAmount);

        // Update state
        quantities[outcomeId] -= sharesToSell;
        userShares[msg.sender][outcomeId] -= sharesToSell;
        totalLiquidity -= payoutAfterFee;

        // Transfer payout
        (bool success, ) = msg.sender.call{value: payoutAfterFee}("");
        require(success, "Transfer failed");

        emit SharesSold(msg.sender, outcomeId, sharesToSell, payoutAfterFee);
    }

    /**
     * @notice Add liquidity to the market
     * @return lpTokens Number of LP tokens minted
     */
    function addLiquidity()
        external
        payable
        override
        onlyActive
        whenNotPaused
        nonReentrant
        returns (uint256 lpTokens)
    {
        require(msg.value > 0, "Must send BNB");

        if (totalLPTokens == 0) {
            // First liquidity provider
            lpTokens = msg.value;
        } else {
            // Proportional to existing liquidity
            lpTokens = (msg.value * totalLPTokens) / totalLiquidity;
        }

        totalLiquidity += msg.value;
        totalLPTokens += lpTokens;
        lpTokenBalances[msg.sender] += lpTokens;

        emit LiquidityAdded(msg.sender, msg.value, lpTokens);
    }

    /**
     * @notice Remove liquidity from the market
     * @param lpTokens Number of LP tokens to burn
     * @return amount Amount of BNB returned
     */
    function removeLiquidity(uint256 lpTokens)
        external
        override
        whenNotPaused
        nonReentrant
        returns (uint256 amount)
    {
        require(lpTokenBalances[msg.sender] >= lpTokens, "Insufficient LP tokens");
        require(state == MarketState.Active || state == MarketState.Resolved, "Cannot remove liquidity");

        // Calculate proportional amount
        amount = (lpTokens * totalLiquidity) / totalLPTokens;

        // Update state
        totalLPTokens -= lpTokens;
        totalLiquidity -= amount;
        lpTokenBalances[msg.sender] -= lpTokens;

        // Transfer amount
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit LiquidityRemoved(msg.sender, lpTokens, amount);
    }

    /**
     * @notice Resolve the market with winning outcome
     * @param _winningOutcome Index of the winning outcome
     */
    function resolveMarket(uint256 _winningOutcome) external override onlyOracle {
        require(state == MarketState.Active, "Market not active");
        require(block.timestamp >= endTime, "Market not ended yet");
        require(_winningOutcome < outcomes.length, "Invalid outcome");

        state = MarketState.Resolved;
        winningOutcome = _winningOutcome;

        emit MarketResolved(_winningOutcome, block.timestamp);
    }

    /**
     * @notice Claim winnings after market resolution
     * @return amount Amount of BNB claimed
     */
    function claimWinnings() external override nonReentrant returns (uint256 amount) {
        require(state == MarketState.Resolved, "Market not resolved");

        uint256 winningShares = userShares[msg.sender][winningOutcome];
        require(winningShares > 0, "No winning shares");

        // Each winning share is worth 1 BNB (or equivalent)
        amount = winningShares;
        require(amount <= totalLiquidity, "Insufficient liquidity");

        // Mark as claimed
        userShares[msg.sender][winningOutcome] = 0;
        totalLiquidity -= amount;

        // Transfer winnings
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(msg.sender, amount);
    }

    /**
     * @notice Cancel the market and refund participants
     */
    function cancelMarket() external onlyOwner {
        require(state == MarketState.Active, "Market not active");

        state = MarketState.Cancelled;

        emit MarketCancelled(block.timestamp);
    }

    /**
     * @notice Get current market information
     */
    function getMarketInfo() external view override returns (MarketInfo memory) {
        return MarketInfo({
            question: question,
            outcomes: outcomes,
            endTime: endTime,
            resolutionTime: resolutionTime,
            state: state,
            winningOutcome: winningOutcome,
            totalVolume: totalVolume,
            creator: creator,
            liquidityParameter: liquidityParameter
        });
    }

    /**
     * @notice Get current price of an outcome
     */
    function getPrice(uint256 outcomeId) external view override returns (uint256) {
        return MarketMath.calculatePrice(liquidityParameter, quantities, outcomeId);
    }

    /**
     * @notice Get current odds of an outcome
     */
    function getOdds(uint256 outcomeId) external view override returns (uint256) {
        return MarketMath.calculateOdds(liquidityParameter, quantities, outcomeId);
    }

    /**
     * @notice Get all outcome quantities
     */
    function getQuantities() external view override returns (uint256[] memory) {
        return quantities;
    }

    /**
     * @notice Get user's shares for a specific outcome
     */
    function getUserShares(address user, uint256 outcomeId) external view override returns (uint256) {
        return userShares[user][outcomeId];
    }

    /**
     * @notice Distribute trading fees
     */
    function _distributeFees(uint256 feeAmount) private {
        uint256 protocolFee = (feeAmount * PROTOCOL_FEE) / TOTAL_FEE;
        uint256 creatorFee = (feeAmount * CREATOR_FEE) / TOTAL_FEE;
        uint256 lpFee = feeAmount - protocolFee - creatorFee;

        accumulatedProtocolFees += protocolFee;
        accumulatedCreatorFees += creatorFee;
        totalLiquidity += lpFee; // LP fees stay in pool
    }

    /**
     * @notice Withdraw protocol fees (owner only)
     */
    function withdrawProtocolFees() external onlyOwner {
        uint256 amount = accumulatedProtocolFees;
        accumulatedProtocolFees = 0;

        (bool success, ) = owner().call{value: amount}("");
        require(success, "Transfer failed");
    }

    /**
     * @notice Withdraw creator fees
     */
    function withdrawCreatorFees() external {
        require(msg.sender == creator, "Only creator");

        uint256 amount = accumulatedCreatorFees;
        accumulatedCreatorFees = 0;

        (bool success, ) = creator.call{value: amount}("");
        require(success, "Transfer failed");
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {}
}
