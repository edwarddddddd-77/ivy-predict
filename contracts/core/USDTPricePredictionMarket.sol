// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../libraries/MarketMath.sol";

/**
 * @title USDTPricePredictionMarket
 * @notice USDT-based ultra-short-term price prediction market (1h/4h/24h)
 * @dev Same as PricePredictionMarket but uses USDT instead of BNB
 *
 * Key Advantages:
 * - Users can claim tUSDT from faucet for testing
 * - Price stability (no BNB volatility)
 * - More familiar for mainstream DeFi users
 */
contract USDTPricePredictionMarket is Ownable, ReentrancyGuard, Pausable {
    using MarketMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum MarketState {
        Active,      // Users can trade
        Locked,      // Market ended, waiting for settlement
        Resolved,    // Winner determined
        Cancelled    // Market cancelled (rare)
    }

    enum PriceDirection {
        UP,          // Betting price will go up
        DOWN         // Betting price will go down
    }

    enum Duration {
        ONE_HOUR,    // 1 hour market
        FOUR_HOURS,  // 4 hour market
        ONE_DAY      // 24 hour market
    }

    // ============ State Variables ============

    // Payment token (USDT)
    IERC20 public immutable usdtToken;

    // Market metadata
    string public assetSymbol;           // e.g., "BTC/USD"
    Duration public duration;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public liquidityParameter;   // LMSR b parameter
    address public creator;

    // Price tracking
    AggregatorV3Interface public priceFeed;  // Chainlink Price Feed
    int256 public startPrice;                // Price when market started
    int256 public endPrice;                  // Price when market ended
    bool public priceRecorded;               // Has start price been recorded?

    // Market state
    MarketState public state;
    PriceDirection public winningDirection;

    // Outcome quantities (shares sold)
    // Index 0 = UP, Index 1 = DOWN
    uint256[2] public quantities;

    // User balances: user => direction => shares
    mapping(address => mapping(PriceDirection => uint256)) public userShares;

    // Liquidity pool
    uint256 public totalLiquidity;
    uint256 public totalLPTokens;
    mapping(address => uint256) public lpTokenBalances;

    // Fees (2% total)
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant PROTOCOL_FEE = 50;    // 0.5%
    uint256 public constant LP_FEE = 100;         // 1.0%
    uint256 public constant CREATOR_FEE = 50;     // 0.5%
    uint256 public constant TOTAL_FEE = 200;      // 2.0%

    uint256 public accumulatedProtocolFees;
    uint256 public accumulatedCreatorFees;

    // Volume tracking
    uint256 public totalVolume;

    // Constants
    uint256 private constant PRECISION = 1e18;

    // ============ Events ============

    event MarketCreated(
        string indexed assetSymbol,
        Duration duration,
        uint256 startTime,
        uint256 endTime,
        address priceFeed,
        address usdtToken
    );

    event StartPriceRecorded(int256 price, uint256 timestamp);

    event SharesPurchased(
        address indexed user,
        PriceDirection direction,
        uint256 shares,
        uint256 cost
    );

    event SharesSold(
        address indexed user,
        PriceDirection direction,
        uint256 shares,
        uint256 payout
    );

    event LiquidityAdded(address indexed provider, uint256 amount, uint256 lpTokens);

    event LiquidityRemoved(address indexed provider, uint256 lpTokens, uint256 amount);

    event MarketResolved(
        PriceDirection winningDirection,
        int256 startPrice,
        int256 endPrice,
        uint256 timestamp
    );

    event WinningsClaimed(address indexed user, uint256 amount);

    // ============ Modifiers ============

    modifier onlyActive() {
        require(state == MarketState.Active, "Market not active");
        require(block.timestamp < endTime, "Market has ended");
        _;
    }

    modifier onlyLocked() {
        require(state == MarketState.Locked, "Market not locked");
        _;
    }

    modifier onlyResolved() {
        require(state == MarketState.Resolved, "Market not resolved");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize a new USDT-based price prediction market
     * @param _assetSymbol Asset symbol (e.g., "BTC/USD")
     * @param _duration Market duration (1h/4h/24h)
     * @param _priceFeed Chainlink Price Feed address
     * @param _liquidityParameter LMSR liquidity parameter
     * @param _creator Market creator address
     * @param _usdtToken USDT token address
     */
    constructor(
        string memory _assetSymbol,
        Duration _duration,
        address _priceFeed,
        uint256 _liquidityParameter,
        address _creator,
        address _usdtToken
    ) Ownable(_creator) {
        require(_priceFeed != address(0), "Invalid price feed");
        require(_liquidityParameter > 0, "Invalid liquidity parameter");
        require(_usdtToken != address(0), "Invalid USDT address");

        assetSymbol = _assetSymbol;
        duration = _duration;
        priceFeed = AggregatorV3Interface(_priceFeed);
        liquidityParameter = _liquidityParameter;
        creator = _creator;
        usdtToken = IERC20(_usdtToken);

        startTime = block.timestamp;

        // Set end time based on duration
        if (_duration == Duration.ONE_HOUR) {
            endTime = startTime + 1 hours;
        } else if (_duration == Duration.FOUR_HOURS) {
            endTime = startTime + 4 hours;
        } else if (_duration == Duration.ONE_DAY) {
            endTime = startTime + 24 hours;
        }

        state = MarketState.Active;

        emit MarketCreated(_assetSymbol, _duration, startTime, endTime, _priceFeed, _usdtToken);
    }

    // ============ Core Trading Functions ============

    /**
     * @notice Record starting price from Chainlink (called once after creation)
     */
    function recordStartPrice() external {
        require(!priceRecorded, "Price already recorded");
        require(block.timestamp <= startTime + 5 minutes, "Too late to record price");

        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt < 1 hours, "Price data stale");

        startPrice = price;
        priceRecorded = true;

        emit StartPriceRecorded(price, block.timestamp);
    }

    /**
     * @notice Buy shares of UP or DOWN with USDT
     * @param direction UP (0) or DOWN (1)
     * @param amount Amount of USDT to spend
     * @param minShares Minimum shares to receive (slippage protection)
     */
    function buyShares(PriceDirection direction, uint256 amount, uint256 minShares)
        external
        onlyActive
        nonReentrant
        whenNotPaused
    {
        require(priceRecorded, "Start price not recorded yet");
        require(amount > 0, "Must send USDT");

        // Transfer USDT from user
        usdtToken.safeTransferFrom(msg.sender, address(this), amount);

        // Calculate fees
        uint256 feeAmount = (amount * TOTAL_FEE) / FEE_DENOMINATOR;
        uint256 amountAfterFee = amount - feeAmount;

        // Distribute fees
        uint256 protocolFee = (amount * PROTOCOL_FEE) / FEE_DENOMINATOR;
        uint256 creatorFee = (amount * CREATOR_FEE) / FEE_DENOMINATOR;
        uint256 lpFee = feeAmount - protocolFee - creatorFee;

        accumulatedProtocolFees += protocolFee;
        accumulatedCreatorFees += creatorFee;
        totalLiquidity += lpFee;

        // Calculate shares using LMSR
        uint256 shares = _calculateSharesToBuy(direction, amountAfterFee);
        require(shares >= minShares, "Slippage exceeded");

        // Update state
        quantities[uint256(direction)] += shares;
        userShares[msg.sender][direction] += shares;
        totalVolume += amount;

        emit SharesPurchased(msg.sender, direction, shares, amount);
    }

    /**
     * @notice Sell shares before market ends
     * @param direction UP or DOWN
     * @param shares Number of shares to sell
     * @param minPayout Minimum USDT payout expected (slippage protection)
     */
    function sellShares(PriceDirection direction, uint256 shares, uint256 minPayout)
        external
        onlyActive
        nonReentrant
        whenNotPaused
    {
        require(shares > 0, "Must sell at least 1 share");
        require(userShares[msg.sender][direction] >= shares, "Insufficient shares");

        // Calculate payout using LMSR
        uint256 payout = _calculateSellPayout(direction, shares);
        require(payout >= minPayout, "Slippage exceeded");

        // Calculate fees
        uint256 feeAmount = (payout * TOTAL_FEE) / FEE_DENOMINATOR;
        uint256 payoutAfterFee = payout - feeAmount;

        // Distribute fees
        uint256 protocolFee = (payout * PROTOCOL_FEE) / FEE_DENOMINATOR;
        uint256 creatorFee = (payout * CREATOR_FEE) / FEE_DENOMINATOR;
        uint256 lpFee = feeAmount - protocolFee - creatorFee;

        accumulatedProtocolFees += protocolFee;
        accumulatedCreatorFees += creatorFee;
        totalLiquidity += lpFee;

        // Update state
        quantities[uint256(direction)] -= shares;
        userShares[msg.sender][direction] -= shares;

        // Transfer USDT payout
        usdtToken.safeTransfer(msg.sender, payoutAfterFee);

        emit SharesSold(msg.sender, direction, shares, payoutAfterFee);
    }

    // ============ Settlement Functions ============

    /**
     * @notice Lock market after end time (anyone can call)
     */
    function lockMarket() external {
        require(state == MarketState.Active, "Market not active");
        require(block.timestamp >= endTime, "Market not ended yet");

        state = MarketState.Locked;
    }

    /**
     * @notice Resolve market by comparing start and end prices
     * @dev Can be called by anyone after market is locked
     */
    function resolveMarket() external onlyLocked nonReentrant {
        require(priceRecorded, "Start price not recorded");

        // Get end price from Chainlink
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt < 1 hours, "Price data stale");

        endPrice = price;

        // Determine winner
        if (endPrice > startPrice) {
            winningDirection = PriceDirection.UP;
        } else {
            winningDirection = PriceDirection.DOWN;
        }

        state = MarketState.Resolved;

        emit MarketResolved(winningDirection, startPrice, endPrice, block.timestamp);
    }

    /**
     * @notice Claim USDT winnings after market is resolved
     */
    function claimWinnings() external onlyResolved nonReentrant {
        uint256 winningShares = userShares[msg.sender][winningDirection];
        require(winningShares > 0, "No winning shares");

        // Calculate payout: (user shares / total winning shares) * total pool
        uint256 totalWinningShares = quantities[uint256(winningDirection)];
        require(totalWinningShares > 0, "No winning shares sold");

        uint256 totalPool = usdtToken.balanceOf(address(this)) - accumulatedProtocolFees - accumulatedCreatorFees;
        uint256 payout = (winningShares * totalPool) / totalWinningShares;

        // Reset user shares
        userShares[msg.sender][winningDirection] = 0;

        // Transfer USDT winnings
        usdtToken.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(msg.sender, payout);
    }

    // ============ LMSR Pricing Functions ============

    /**
     * @notice Calculate shares to buy for given USDT amount
     * @dev Uses simplified LMSR formula
     */
    function _calculateSharesToBuy(PriceDirection direction, uint256 amount)
        private
        view
        returns (uint256)
    {
        // Simplified LMSR: shares ≈ amount / price
        uint256 currentPrice = getPrice(direction);
        return (amount * PRECISION) / currentPrice;
    }

    /**
     * @notice Calculate USDT payout for selling shares
     */
    function _calculateSellPayout(PriceDirection direction, uint256 shares)
        private
        view
        returns (uint256)
    {
        uint256 currentPrice = getPrice(direction);
        return (shares * currentPrice) / PRECISION;
    }

    /**
     * @notice Get current price for a direction (0-1, scaled by PRECISION)
     */
    function getPrice(PriceDirection direction) public view returns (uint256) {
        uint256 directionIndex = uint256(direction);

        // Use MarketMath library for LMSR pricing
        uint256[] memory q = new uint256[](2);
        q[0] = quantities[0];
        q[1] = quantities[1];

        return MarketMath.calculatePrice(liquidityParameter, q, directionIndex);
    }

    /**
     * @notice Get probability for UP direction (0-100%)
     */
    function getProbability() external view returns (uint256) {
        uint256 priceUp = getPrice(PriceDirection.UP);
        return (priceUp * 100) / PRECISION;
    }

    // ============ Liquidity Functions ============

    /**
     * @notice Add USDT liquidity to the market
     * @param amount Amount of USDT to add
     */
    function addLiquidity(uint256 amount) external onlyActive nonReentrant {
        require(amount > 0, "Must send USDT");

        // Transfer USDT from user
        usdtToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 lpTokens;
        if (totalLPTokens == 0) {
            // First LP: mint tokens 1:1
            lpTokens = amount;
        } else {
            // Subsequent LPs: mint proportionally
            lpTokens = (amount * totalLPTokens) / totalLiquidity;
        }

        totalLiquidity += amount;
        totalLPTokens += lpTokens;
        lpTokenBalances[msg.sender] += lpTokens;

        emit LiquidityAdded(msg.sender, amount, lpTokens);
    }

    /**
     * @notice Remove liquidity from the market
     * @param lpTokens Number of LP tokens to burn
     */
    function removeLiquidity(uint256 lpTokens) external nonReentrant {
        require(lpTokenBalances[msg.sender] >= lpTokens, "Insufficient LP tokens");
        require(state != MarketState.Active, "Market still active");

        // Calculate USDT payout
        uint256 payout = (lpTokens * totalLiquidity) / totalLPTokens;

        // Update state
        lpTokenBalances[msg.sender] -= lpTokens;
        totalLPTokens -= lpTokens;
        totalLiquidity -= payout;

        // Transfer USDT payout
        usdtToken.safeTransfer(msg.sender, payout);

        emit LiquidityRemoved(msg.sender, lpTokens, payout);
    }

    // ============ Admin Functions ============

    /**
     * @notice Withdraw protocol fees in USDT (only owner)
     */
    function withdrawProtocolFees() external onlyOwner {
        uint256 amount = accumulatedProtocolFees;
        require(amount > 0, "No fees to withdraw");

        accumulatedProtocolFees = 0;

        usdtToken.safeTransfer(owner(), amount);
    }

    /**
     * @notice Withdraw creator fees in USDT
     */
    function withdrawCreatorFees() external {
        require(msg.sender == creator, "Only creator");
        uint256 amount = accumulatedCreatorFees;
        require(amount > 0, "No fees to withdraw");

        accumulatedCreatorFees = 0;

        usdtToken.safeTransfer(creator, amount);
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

    /**
     * @notice Cancel market (emergency only)
     */
    function cancelMarket() external onlyOwner {
        require(state == MarketState.Active, "Market not active");
        state = MarketState.Cancelled;
        // TODO: Implement refund logic
    }

    // ============ View Functions ============

    /**
     * @notice Get comprehensive market info
     */
    function getMarketInfo()
        external
        view
        returns (
            string memory _assetSymbol,
            Duration _duration,
            MarketState _state,
            uint256 _startTime,
            uint256 _endTime,
            int256 _startPrice,
            int256 _endPrice,
            uint256[2] memory _quantities,
            uint256 _totalVolume,
            uint256 _totalLiquidity
        )
    {
        return (
            assetSymbol,
            duration,
            state,
            startTime,
            endTime,
            startPrice,
            endPrice,
            quantities,
            totalVolume,
            totalLiquidity
        );
    }

    /**
     * @notice Get user's shares for both directions
     */
    function getUserShares(address user, PriceDirection direction) external view returns (uint256) {
        return userShares[user][direction];
    }

    /**
     * @notice Check if market is settled
     */
    function isSettled() external view returns (bool) {
        return state == MarketState.Resolved;
    }
}
