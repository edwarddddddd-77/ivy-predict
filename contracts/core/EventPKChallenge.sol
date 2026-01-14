// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EventPKChallenge
 * @notice 1v1 Event Prediction PK - Challenge friends on any event outcome
 * @dev Supports custom event questions with YES/NO outcomes
 *
 * Flow:
 * 1. Creator creates challenge with a question and picks YES or NO
 * 2. Opponent accepts and automatically takes the opposite position
 * 3. After resolve time, oracle (or consensus) determines the result
 * 4. Winner takes the prize pool (minus fees)
 */
contract EventPKChallenge is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum ChallengeState {
        Created,    // Waiting for opponent
        Active,     // Both parties joined, waiting for resolution
        Resolved,   // Result determined, funds distributed
        Cancelled,  // Creator cancelled before acceptance
        Expired,    // No one accepted within expiry time
        Disputed    // Parties disagree, needs oracle resolution
    }

    enum Position {
        YES,
        NO
    }

    enum Result {
        Pending,
        YES_Wins,
        NO_Wins,
        Draw       // For edge cases like event cancellation
    }

    // ============ Structs ============

    struct Challenge {
        // Challenge info
        uint256 challengeId;
        string question;           // e.g., "Will Trump attack Iran in March 2026?"
        string category;           // e.g., "Politics", "Sports", "Crypto"

        // Participants
        address creator;
        address opponent;
        Position creatorPosition;  // YES or NO

        // Amounts
        uint256 minAmount;
        uint256 maxAmount;
        uint256 creatorAmount;
        uint256 opponentAmount;

        // Timing
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 expiresAt;         // Challenge expires if not accepted
        uint256 resolveTime;       // When the event should be resolved

        // State
        ChallengeState state;
        Result result;
        address winner;

        // Resolution
        Result creatorVote;        // Creator's reported result
        Result opponentVote;       // Opponent's reported result
        bool creatorVoted;
        bool opponentVoted;

        // Referrals
        address creatorReferrer;
        address opponentReferrer;

        // Options
        bool isPublic;
    }

    // ============ State Variables ============

    IERC20 public paymentToken;        // USDT
    address public treasury;
    address public oracleResolver;     // Fallback resolver for disputes

    uint256 public nextChallengeId;
    uint256 public challengeExpiry = 24 hours;
    uint256 public disputeTimeout = 7 days;

    // Fees (basis points, 10000 = 100%)
    uint256 public protocolFeeBps = 200;   // 2%
    uint256 public referralFeeBps = 50;    // 0.5%

    // Storage
    mapping(uint256 => Challenge) public challenges;
    mapping(address => uint256[]) public userChallenges;
    uint256[] public openChallenges;  // Public challenges waiting for opponents

    // Statistics
    uint256 public totalChallenges;
    uint256 public totalVolume;
    uint256 public totalResolved;

    // ============ Events ============

    event ChallengeCreated(
        uint256 indexed challengeId,
        address indexed creator,
        string question,
        Position creatorPosition,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 resolveTime,
        bool isPublic
    );

    event ChallengeAccepted(
        uint256 indexed challengeId,
        address indexed opponent,
        uint256 opponentAmount
    );

    event VoteSubmitted(
        uint256 indexed challengeId,
        address indexed voter,
        Result vote
    );

    event ChallengeResolved(
        uint256 indexed challengeId,
        Result result,
        address winner,
        uint256 prizeAmount
    );

    event ChallengeCancelled(uint256 indexed challengeId);
    event ChallengeExpired(uint256 indexed challengeId);
    event ChallengeDisputed(uint256 indexed challengeId);
    event DisputeResolved(uint256 indexed challengeId, Result result);

    // ============ Constructor ============

    constructor(
        address _paymentToken,
        address _treasury,
        address _oracleResolver
    ) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
        oracleResolver = _oracleResolver;
    }

    // ============ Core Functions ============

    /**
     * @notice Create a new event PK challenge
     * @param question The event question (e.g., "Will BTC reach 100k by June?")
     * @param category Category for the event (Politics, Sports, Crypto, etc.)
     * @param position Creator's position (YES or NO)
     * @param minAmount Minimum amount opponent can stake
     * @param maxAmount Maximum amount opponent can stake
     * @param creatorAmount Amount creator is staking
     * @param resolveTime When the event outcome should be known
     * @param referrer Referrer address for creator
     * @param isPublic Whether challenge is visible in public pool
     */
    function createChallenge(
        string calldata question,
        string calldata category,
        Position position,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 creatorAmount,
        uint256 resolveTime,
        address referrer,
        bool isPublic
    ) external whenNotPaused nonReentrant returns (uint256 challengeId) {
        require(bytes(question).length > 0, "Question required");
        require(bytes(question).length <= 500, "Question too long");
        require(minAmount > 0, "Min amount must be > 0");
        require(maxAmount >= minAmount, "Max must be >= min");
        require(creatorAmount >= minAmount && creatorAmount <= maxAmount, "Creator amount out of range");
        require(resolveTime > block.timestamp + 1 hours, "Resolve time too soon");

        // Transfer stake from creator
        paymentToken.safeTransferFrom(msg.sender, address(this), creatorAmount);

        challengeId = nextChallengeId++;

        Challenge storage c = challenges[challengeId];
        c.challengeId = challengeId;
        c.question = question;
        c.category = category;
        c.creator = msg.sender;
        c.creatorPosition = position;
        c.minAmount = minAmount;
        c.maxAmount = maxAmount;
        c.creatorAmount = creatorAmount;
        c.createdAt = block.timestamp;
        c.expiresAt = block.timestamp + challengeExpiry;
        c.resolveTime = resolveTime;
        c.state = ChallengeState.Created;
        c.result = Result.Pending;
        c.creatorReferrer = referrer;
        c.isPublic = isPublic;

        userChallenges[msg.sender].push(challengeId);

        if (isPublic) {
            openChallenges.push(challengeId);
        }

        totalChallenges++;
        totalVolume += creatorAmount;

        emit ChallengeCreated(
            challengeId,
            msg.sender,
            question,
            position,
            minAmount,
            maxAmount,
            resolveTime,
            isPublic
        );
    }

    /**
     * @notice Accept an existing challenge
     * @param challengeId ID of the challenge to accept
     * @param amount Amount to stake (must be within min/max range)
     * @param referrer Referrer address for opponent
     */
    function acceptChallenge(
        uint256 challengeId,
        uint256 amount,
        address referrer
    ) external whenNotPaused nonReentrant {
        Challenge storage c = challenges[challengeId];

        require(c.state == ChallengeState.Created, "Challenge not available");
        require(block.timestamp < c.expiresAt, "Challenge expired");
        require(msg.sender != c.creator, "Cannot accept own challenge");
        require(amount >= c.minAmount && amount <= c.maxAmount, "Amount out of range");

        // Transfer stake from opponent
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        c.opponent = msg.sender;
        c.opponentAmount = amount;
        c.acceptedAt = block.timestamp;
        c.state = ChallengeState.Active;
        c.opponentReferrer = referrer;

        userChallenges[msg.sender].push(challengeId);

        // Remove from open challenges if public
        if (c.isPublic) {
            _removeFromOpenChallenges(challengeId);
        }

        totalVolume += amount;

        emit ChallengeAccepted(challengeId, msg.sender, amount);
    }

    /**
     * @notice Submit vote for challenge result (both parties must vote)
     * @param challengeId ID of the challenge
     * @param vote The result vote (YES_Wins, NO_Wins, or Draw)
     */
    function submitVote(
        uint256 challengeId,
        Result vote
    ) external nonReentrant {
        Challenge storage c = challenges[challengeId];

        require(c.state == ChallengeState.Active, "Challenge not active");
        require(block.timestamp >= c.resolveTime, "Too early to vote");
        require(vote != Result.Pending, "Invalid vote");
        require(
            msg.sender == c.creator || msg.sender == c.opponent,
            "Not a participant"
        );

        if (msg.sender == c.creator) {
            require(!c.creatorVoted, "Already voted");
            c.creatorVote = vote;
            c.creatorVoted = true;
        } else {
            require(!c.opponentVoted, "Already voted");
            c.opponentVote = vote;
            c.opponentVoted = true;
        }

        emit VoteSubmitted(challengeId, msg.sender, vote);

        // Check if both voted
        if (c.creatorVoted && c.opponentVoted) {
            if (c.creatorVote == c.opponentVote) {
                // Consensus reached - resolve immediately
                _resolveChallenge(challengeId, c.creatorVote);
            } else {
                // Dispute - needs oracle
                c.state = ChallengeState.Disputed;
                emit ChallengeDisputed(challengeId);
            }
        }
    }

    /**
     * @notice Resolve disputed challenge (oracle only)
     * @param challengeId ID of the challenge
     * @param result The final result
     */
    function resolveDispute(
        uint256 challengeId,
        Result result
    ) external {
        require(msg.sender == oracleResolver, "Only oracle");

        Challenge storage c = challenges[challengeId];
        require(c.state == ChallengeState.Disputed, "Not disputed");
        require(result != Result.Pending, "Invalid result");

        _resolveChallenge(challengeId, result);

        emit DisputeResolved(challengeId, result);
    }

    /**
     * @notice Force resolve if opponent doesn't vote within timeout
     * @param challengeId ID of the challenge
     */
    function forceResolve(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];

        require(c.state == ChallengeState.Active, "Challenge not active");
        require(block.timestamp >= c.resolveTime + disputeTimeout, "Timeout not reached");
        require(c.creatorVoted || c.opponentVoted, "No votes submitted");

        // If only one party voted, their vote wins
        if (c.creatorVoted && !c.opponentVoted) {
            _resolveChallenge(challengeId, c.creatorVote);
        } else if (!c.creatorVoted && c.opponentVoted) {
            _resolveChallenge(challengeId, c.opponentVote);
        }
    }

    /**
     * @notice Cancel a challenge (creator only, before acceptance)
     * @param challengeId ID of the challenge to cancel
     */
    function cancelChallenge(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];

        require(msg.sender == c.creator, "Only creator");
        require(c.state == ChallengeState.Created, "Cannot cancel");

        c.state = ChallengeState.Cancelled;

        // Refund creator
        paymentToken.safeTransfer(c.creator, c.creatorAmount);

        // Remove from open challenges if public
        if (c.isPublic) {
            _removeFromOpenChallenges(challengeId);
        }

        emit ChallengeCancelled(challengeId);
    }

    /**
     * @notice Expire unclaimed challenge
     * @param challengeId ID of the challenge
     */
    function expireChallenge(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];

        require(c.state == ChallengeState.Created, "Cannot expire");
        require(block.timestamp >= c.expiresAt, "Not expired yet");

        c.state = ChallengeState.Expired;

        // Refund creator
        paymentToken.safeTransfer(c.creator, c.creatorAmount);

        // Remove from open challenges if public
        if (c.isPublic) {
            _removeFromOpenChallenges(challengeId);
        }

        emit ChallengeExpired(challengeId);
    }

    // ============ Internal Functions ============

    function _resolveChallenge(uint256 challengeId, Result result) internal {
        Challenge storage c = challenges[challengeId];

        c.state = ChallengeState.Resolved;
        c.result = result;

        uint256 totalPool = c.creatorAmount + c.opponentAmount;
        uint256 protocolFee = (totalPool * protocolFeeBps) / 10000;
        uint256 prizePool = totalPool - protocolFee;

        // Determine winner
        if (result == Result.Draw) {
            // Refund both parties (minus half fees each)
            uint256 creatorRefund = c.creatorAmount - (protocolFee * c.creatorAmount / totalPool);
            uint256 opponentRefund = c.opponentAmount - (protocolFee * c.opponentAmount / totalPool);

            paymentToken.safeTransfer(c.creator, creatorRefund);
            paymentToken.safeTransfer(c.opponent, opponentRefund);

            c.winner = address(0);
        } else {
            bool yesWins = (result == Result.YES_Wins);
            bool creatorWins = (c.creatorPosition == Position.YES) == yesWins;

            address winner = creatorWins ? c.creator : c.opponent;
            address winnerReferrer = creatorWins ? c.creatorReferrer : c.opponentReferrer;

            c.winner = winner;

            // Pay referral if exists
            uint256 referralFee = 0;
            if (winnerReferrer != address(0)) {
                referralFee = (totalPool * referralFeeBps) / 10000;
                paymentToken.safeTransfer(winnerReferrer, referralFee);
            }

            // Pay winner
            uint256 winnerPrize = prizePool - referralFee;
            paymentToken.safeTransfer(winner, winnerPrize);

            emit ChallengeResolved(challengeId, result, winner, winnerPrize);
        }

        // Pay protocol fee
        paymentToken.safeTransfer(treasury, protocolFee);

        totalResolved++;
    }

    function _removeFromOpenChallenges(uint256 challengeId) internal {
        for (uint256 i = 0; i < openChallenges.length; i++) {
            if (openChallenges[i] == challengeId) {
                openChallenges[i] = openChallenges[openChallenges.length - 1];
                openChallenges.pop();
                break;
            }
        }
    }

    // ============ View Functions ============

    function getChallenge(uint256 challengeId) external view returns (Challenge memory) {
        return challenges[challengeId];
    }

    function getUserChallenges(address user) external view returns (uint256[] memory) {
        return userChallenges[user];
    }

    function getOpenChallenges() external view returns (uint256[] memory) {
        return openChallenges;
    }

    function getOpenChallengesByCategory(string calldata category) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < openChallenges.length; i++) {
            if (keccak256(bytes(challenges[openChallenges[i]].category)) == keccak256(bytes(category))) {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < openChallenges.length; i++) {
            if (keccak256(bytes(challenges[openChallenges[i]].category)) == keccak256(bytes(category))) {
                result[index++] = openChallenges[i];
            }
        }

        return result;
    }

    function getStatistics() external view returns (
        uint256 _totalChallenges,
        uint256 _totalVolume,
        uint256 _totalResolved,
        uint256 _openCount
    ) {
        return (totalChallenges, totalVolume, totalResolved, openChallenges.length);
    }

    // ============ Admin Functions ============

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setOracleResolver(address _oracle) external onlyOwner {
        oracleResolver = _oracle;
    }

    function setProtocolFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Fee too high"); // Max 5%
        protocolFeeBps = _feeBps;
    }

    function setReferralFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 200, "Fee too high"); // Max 2%
        referralFeeBps = _feeBps;
    }

    function setChallengeExpiry(uint256 _expiry) external onlyOwner {
        require(_expiry >= 1 hours && _expiry <= 7 days, "Invalid expiry");
        challengeExpiry = _expiry;
    }

    function setDisputeTimeout(uint256 _timeout) external onlyOwner {
        require(_timeout >= 1 days && _timeout <= 30 days, "Invalid timeout");
        disputeTimeout = _timeout;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency withdraw (owner only)
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
