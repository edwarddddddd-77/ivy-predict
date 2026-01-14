// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PKChallenge
 * @notice 1v1 Price Prediction PK Battle Contract
 * @dev Supports invite link mode for peer-to-peer prediction battles
 */
contract PKChallenge is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum ChallengeState {
        Created,     // Challenge created, waiting for opponent
        Active,      // Both parties joined, waiting for settlement
        Resolved,    // Settled
        Cancelled,   // Cancelled by creator
        Expired      // Expired (no one accepted)
    }

    enum PriceDirection {
        UP,          // Predict price goes up
        DOWN         // Predict price goes down
    }

    enum Duration {
        FIVE_MINUTES,    // 5 minutes
        FIFTEEN_MINUTES, // 15 minutes
        ONE_HOUR,        // 1 hour
        FOUR_HOURS,      // 4 hours
        ONE_DAY          // 24 hours
    }

    // ============ Structs ============

    struct Challenge {
        // Challenge basic info
        uint256 challengeId;
        address creator;
        address opponent;

        // Amount settings
        uint256 minAmount;
        uint256 maxAmount;
        uint256 creatorAmount;
        uint256 opponentAmount;

        // Prediction config
        string assetSymbol;
        Duration duration;
        PriceDirection creatorDirection;

        // Price tracking
        address priceFeed;
        int256 startPrice;
        int256 endPrice;

        // Timestamps
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 expiresAt;
        uint256 settleTime;

        // State
        ChallengeState state;
        address winner;

        // Referral system
        address creatorReferrer;
        address opponentReferrer;
    }

    // ============ State Variables ============

    // Payment token (USDT)
    IERC20 public immutable paymentToken;

    // Challenge storage
    mapping(uint256 => Challenge) public challenges;
    uint256 public nextChallengeId;

    // User challenges list
    mapping(address => uint256[]) public userChallenges;

    // Open challenges pool (for public matching)
    uint256[] public openChallenges;
    mapping(uint256 => uint256) public openChallengeIndex;

    // Chainlink Price Feeds
    mapping(string => address) public priceFeeds;
    string[] public supportedAssets;

    // Fee settings
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public protocolFeeRate = 200;     // 2%
    uint256 public referralFeeRate = 50;      // 0.5%
    address public protocolTreasury;
    uint256 public accumulatedFees;

    // Configuration
    uint256 public challengeExpireDuration = 24 hours;
    uint256 public minChallengeAmount = 1e18;           // Min 1 USDT
    uint256 public maxChallengeAmount = 10000e18;       // Max 10000 USDT

    // Statistics
    uint256 public totalChallenges;
    uint256 public totalVolume;
    uint256 public totalResolved;

    // ============ Events ============

    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed creator,
        string assetSymbol,
        Duration duration,
        PriceDirection creatorDirection,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 creatorAmount,
        bool isPublic
    );

    event ChallengeAccepted(
        uint256 indexed challengeId,
        address indexed opponent,
        uint256 opponentAmount,
        int256 startPrice,
        uint256 settleTime
    );

    event ChallengeCancelled(
        uint256 indexed challengeId,
        address indexed canceller
    );

    event ChallengeResolved(
        uint256 indexed challengeId,
        address indexed winner,
        int256 startPrice,
        int256 endPrice,
        uint256 winnerPayout,
        bool isDraw
    );

    event ChallengeExpired(
        uint256 indexed challengeId
    );

    event ReferralReward(
        uint256 indexed challengeId,
        address indexed referrer,
        uint256 amount
    );

    event PriceFeedAdded(
        string indexed symbol,
        address priceFeed
    );

    // ============ Constructor ============

    constructor(
        address _paymentToken,
        address _protocolTreasury
    ) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_protocolTreasury != address(0), "Invalid treasury");
        paymentToken = IERC20(_paymentToken);
        protocolTreasury = _protocolTreasury;
        nextChallengeId = 1;
    }

    // ============ Core: Create Challenge ============

    /**
     * @notice Create a new PK challenge
     * @param assetSymbol Asset symbol (e.g., "BTC/USD")
     * @param duration Prediction duration
     * @param direction Creator's prediction direction
     * @param minAmount Minimum accept amount
     * @param maxAmount Maximum accept amount
     * @param creatorAmount Creator's stake amount
     * @param referrer Referrer address
     * @param isPublic Whether to add to public matching pool
     */
    function createChallenge(
        string calldata assetSymbol,
        Duration duration,
        PriceDirection direction,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 creatorAmount,
        address referrer,
        bool isPublic
    ) external nonReentrant whenNotPaused returns (uint256 challengeId) {
        // Validations
        require(priceFeeds[assetSymbol] != address(0), "Asset not supported");
        require(minAmount >= minChallengeAmount, "Amount too low");
        require(maxAmount <= maxChallengeAmount, "Amount too high");
        require(minAmount <= maxAmount, "Invalid amount range");
        require(creatorAmount >= minAmount && creatorAmount <= maxAmount, "Creator amount out of range");
        require(referrer != msg.sender, "Cannot refer yourself");

        // Transfer creator's funds
        paymentToken.safeTransferFrom(msg.sender, address(this), creatorAmount);

        // Create challenge
        challengeId = nextChallengeId++;

        challenges[challengeId] = Challenge({
            challengeId: challengeId,
            creator: msg.sender,
            opponent: address(0),
            minAmount: minAmount,
            maxAmount: maxAmount,
            creatorAmount: creatorAmount,
            opponentAmount: 0,
            assetSymbol: assetSymbol,
            duration: duration,
            creatorDirection: direction,
            priceFeed: priceFeeds[assetSymbol],
            startPrice: 0,
            endPrice: 0,
            createdAt: block.timestamp,
            acceptedAt: 0,
            expiresAt: block.timestamp + challengeExpireDuration,
            settleTime: 0,
            state: ChallengeState.Created,
            winner: address(0),
            creatorReferrer: referrer,
            opponentReferrer: address(0)
        });

        userChallenges[msg.sender].push(challengeId);
        totalChallenges++;

        // Add to public pool if requested
        if (isPublic) {
            openChallengeIndex[challengeId] = openChallenges.length;
            openChallenges.push(challengeId);
        }

        emit ChallengeCreated(
            challengeId,
            msg.sender,
            assetSymbol,
            duration,
            direction,
            minAmount,
            maxAmount,
            creatorAmount,
            isPublic
        );

        return challengeId;
    }

    // ============ Core: Accept Challenge ============

    /**
     * @notice Accept a PK challenge
     * @param challengeId Challenge ID
     * @param amount Stake amount
     * @param referrer Referrer address
     */
    function acceptChallenge(
        uint256 challengeId,
        uint256 amount,
        address referrer
    ) external nonReentrant whenNotPaused {
        Challenge storage c = challenges[challengeId];

        // Validations
        require(c.state == ChallengeState.Created, "Challenge not available");
        require(block.timestamp < c.expiresAt, "Challenge expired");
        require(msg.sender != c.creator, "Cannot accept own challenge");
        require(amount >= c.minAmount && amount <= c.maxAmount, "Amount out of range");
        require(referrer != msg.sender, "Cannot refer yourself");

        // Transfer opponent's funds
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        // Get start price from Chainlink
        AggregatorV3Interface priceFeed = AggregatorV3Interface(c.priceFeed);
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt < 1 hours, "Price data stale");

        // Calculate settlement time
        uint256 settleDuration = _getDurationSeconds(c.duration);

        // Update challenge state
        c.opponent = msg.sender;
        c.opponentAmount = amount;
        c.startPrice = price;
        c.acceptedAt = block.timestamp;
        c.settleTime = block.timestamp + settleDuration;
        c.state = ChallengeState.Active;
        c.opponentReferrer = referrer;

        userChallenges[msg.sender].push(challengeId);
        totalVolume += c.creatorAmount + amount;

        // Remove from public pool if it was public
        _removeFromOpenChallenges(challengeId);

        emit ChallengeAccepted(
            challengeId,
            msg.sender,
            amount,
            price,
            c.settleTime
        );
    }

    // ============ Core: Resolve Challenge ============

    /**
     * @notice Resolve a PK challenge
     * @param challengeId Challenge ID
     */
    function resolveChallenge(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];

        // Validations
        require(c.state == ChallengeState.Active, "Challenge not active");
        require(block.timestamp >= c.settleTime, "Settlement time not reached");

        // Get end price from Chainlink
        AggregatorV3Interface priceFeed = AggregatorV3Interface(c.priceFeed);
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt < 1 hours, "Price data stale");

        c.endPrice = price;
        c.state = ChallengeState.Resolved;
        totalResolved++;

        uint256 totalPool = c.creatorAmount + c.opponentAmount;

        // Handle draw (price unchanged)
        if (c.endPrice == c.startPrice) {
            c.winner = address(0); // Draw

            // Refund both parties
            paymentToken.safeTransfer(c.creator, c.creatorAmount);
            paymentToken.safeTransfer(c.opponent, c.opponentAmount);

            emit ChallengeResolved(challengeId, address(0), c.startPrice, c.endPrice, 0, true);
            return;
        }

        // Determine winner
        bool priceWentUp = c.endPrice > c.startPrice;
        bool creatorWins = (c.creatorDirection == PriceDirection.UP && priceWentUp) ||
                          (c.creatorDirection == PriceDirection.DOWN && !priceWentUp);

        address winner = creatorWins ? c.creator : c.opponent;
        c.winner = winner;

        // Calculate fees
        uint256 protocolFee = (totalPool * protocolFeeRate) / FEE_DENOMINATOR;
        uint256 winnerPayout = totalPool - protocolFee;

        // Handle referral reward
        address winnerReferrer = creatorWins ? c.creatorReferrer : c.opponentReferrer;

        if (winnerReferrer != address(0)) {
            uint256 referralReward = (totalPool * referralFeeRate) / FEE_DENOMINATOR;
            protocolFee -= referralReward;
            paymentToken.safeTransfer(winnerReferrer, referralReward);
            emit ReferralReward(challengeId, winnerReferrer, referralReward);
        }

        // Accumulate protocol fees
        accumulatedFees += protocolFee;

        // Transfer winnings
        paymentToken.safeTransfer(winner, winnerPayout);

        emit ChallengeResolved(challengeId, winner, c.startPrice, c.endPrice, winnerPayout, false);
    }

    // ============ Cancel / Expire ============

    /**
     * @notice Cancel an unaccepted challenge
     */
    function cancelChallenge(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];

        require(c.state == ChallengeState.Created, "Cannot cancel");
        require(msg.sender == c.creator, "Only creator can cancel");

        c.state = ChallengeState.Cancelled;

        // Remove from public pool
        _removeFromOpenChallenges(challengeId);

        // Refund creator
        paymentToken.safeTransfer(c.creator, c.creatorAmount);

        emit ChallengeCancelled(challengeId, msg.sender);
    }

    /**
     * @notice Mark expired challenge and refund
     */
    function expireChallenge(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];

        require(c.state == ChallengeState.Created, "Cannot expire");
        require(block.timestamp >= c.expiresAt, "Not expired yet");

        c.state = ChallengeState.Expired;

        // Remove from public pool
        _removeFromOpenChallenges(challengeId);

        // Refund creator
        paymentToken.safeTransfer(c.creator, c.creatorAmount);

        emit ChallengeExpired(challengeId);
    }

    // ============ View Functions ============

    function getChallenge(uint256 challengeId) external view returns (Challenge memory) {
        return challenges[challengeId];
    }

    function getUserChallenges(address user) external view returns (uint256[] memory) {
        return userChallenges[user];
    }

    function getUserChallengeCount(address user) external view returns (uint256) {
        return userChallenges[user].length;
    }

    function getOpenChallenges() external view returns (uint256[] memory) {
        return openChallenges;
    }

    function getOpenChallengesCount() external view returns (uint256) {
        return openChallenges.length;
    }

    function getSupportedAssets() external view returns (string[] memory) {
        return supportedAssets;
    }

    function canResolve(uint256 challengeId) external view returns (bool) {
        Challenge storage c = challenges[challengeId];
        return c.state == ChallengeState.Active && block.timestamp >= c.settleTime;
    }

    function getTimeRemaining(uint256 challengeId) external view returns (uint256) {
        Challenge storage c = challenges[challengeId];
        if (c.state != ChallengeState.Active) return 0;
        if (block.timestamp >= c.settleTime) return 0;
        return c.settleTime - block.timestamp;
    }

    function getStatistics() external view returns (
        uint256 _totalChallenges,
        uint256 _totalVolume,
        uint256 _totalResolved,
        uint256 _openChallengesCount
    ) {
        return (totalChallenges, totalVolume, totalResolved, openChallenges.length);
    }

    // ============ Internal Functions ============

    function _getDurationSeconds(Duration duration) internal pure returns (uint256) {
        if (duration == Duration.FIVE_MINUTES) return 5 minutes;
        if (duration == Duration.FIFTEEN_MINUTES) return 15 minutes;
        if (duration == Duration.ONE_HOUR) return 1 hours;
        if (duration == Duration.FOUR_HOURS) return 4 hours;
        if (duration == Duration.ONE_DAY) return 24 hours;
        revert("Invalid duration");
    }

    function _removeFromOpenChallenges(uint256 challengeId) internal {
        uint256 index = openChallengeIndex[challengeId];
        uint256 lastIndex = openChallenges.length - 1;

        if (index < openChallenges.length && openChallenges[index] == challengeId) {
            if (index != lastIndex) {
                uint256 lastChallengeId = openChallenges[lastIndex];
                openChallenges[index] = lastChallengeId;
                openChallengeIndex[lastChallengeId] = index;
            }
            openChallenges.pop();
            delete openChallengeIndex[challengeId];
        }
    }

    // ============ Admin Functions ============

    function addPriceFeed(string calldata symbol, address feed) external onlyOwner {
        require(feed != address(0), "Invalid feed");
        require(priceFeeds[symbol] == address(0), "Feed already exists");

        priceFeeds[symbol] = feed;
        supportedAssets.push(symbol);

        emit PriceFeedAdded(symbol, feed);
    }

    function updatePriceFeed(string calldata symbol, address feed) external onlyOwner {
        require(feed != address(0), "Invalid feed");
        require(priceFeeds[symbol] != address(0), "Feed does not exist");

        priceFeeds[symbol] = feed;

        emit PriceFeedAdded(symbol, feed);
    }

    function setFeeRates(uint256 _protocolFee, uint256 _referralFee) external onlyOwner {
        require(_protocolFee + _referralFee <= 500, "Fee too high"); // Max 5%
        protocolFeeRate = _protocolFee;
        referralFeeRate = _referralFee;
    }

    function setProtocolTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        protocolTreasury = _treasury;
    }

    function setAmountLimits(uint256 _min, uint256 _max) external onlyOwner {
        require(_min > 0 && _max > _min, "Invalid limits");
        minChallengeAmount = _min;
        maxChallengeAmount = _max;
    }

    function setExpireDuration(uint256 _duration) external onlyOwner {
        require(_duration >= 1 hours && _duration <= 7 days, "Invalid duration");
        challengeExpireDuration = _duration;
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        accumulatedFees = 0;
        paymentToken.safeTransfer(protocolTreasury, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
