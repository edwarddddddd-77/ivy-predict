// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @notice Test USDT token for IVY Predict testnet
 * @dev Only for testing purposes, will be removed on mainnet
 */
contract MockUSDT is ERC20, Ownable {
    constructor() ERC20("Test USDT", "tUSDT") Ownable(msg.sender) {
        // Mint 100 million test USDT to deployer for faucet distribution
        _mint(msg.sender, 100_000_000 * 10**decimals());
    }

    /**
     * @notice Mint tokens to any address (only owner)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from sender
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
