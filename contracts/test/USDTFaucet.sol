// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title USDTFaucet
 * @notice Testnet faucet for IVY Predict - distributes 30,000 tUSDT per address
 * @dev Will be removed on mainnet deployment
 */
contract USDTFaucet is Ownable, ReentrancyGuard {
    IERC20 public immutable token;
    uint256 public constant CLAIM_AMOUNT = 30_000 * 10**18; // 30,000 tUSDT

    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed user, uint256 amount);
    event FaucetFunded(address indexed funder, uint256 amount);

    error AlreadyClaimed();
    error InsufficientBalance();
    error TransferFailed();

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    /**
     * @notice Claim 30,000 test USDT (once per address)
     */
    function claim() external nonReentrant {
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();

        uint256 balance = token.balanceOf(address(this));
        if (balance < CLAIM_AMOUNT) revert InsufficientBalance();

        hasClaimed[msg.sender] = true;

        bool success = token.transfer(msg.sender, CLAIM_AMOUNT);
        if (!success) revert TransferFailed();

        emit Claimed(msg.sender, CLAIM_AMOUNT);
    }

    /**
     * @notice Check if an address has already claimed
     * @param user Address to check
     * @return Whether the address has claimed
     */
    function hasClaimedTokens(address user) external view returns (bool) {
        return hasClaimed[user];
    }

    /**
     * @notice Get faucet balance
     * @return Current balance of tokens in faucet
     */
    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @notice Fund the faucet (owner only)
     * @param amount Amount of tokens to add
     */
    function fund(uint256 amount) external onlyOwner {
        bool success = token.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        emit FaucetFunded(msg.sender, amount);
    }

    /**
     * @notice Emergency withdraw (owner only)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        bool success = token.transfer(owner(), amount);
        if (!success) revert TransferFailed();
    }
}
