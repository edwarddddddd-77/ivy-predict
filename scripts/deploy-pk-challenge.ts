import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PKChallenge with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");

  // Contract addresses on BSC Testnet
  const USDT_ADDRESS = "0x846314aA0461E7ae9F1B69F52A565ad8A335E72b"; // Mock USDT
  const TREASURY_ADDRESS = deployer.address; // Use deployer as treasury for now

  // Chainlink Price Feeds on BSC Testnet
  const PRICE_FEEDS = {
    "BTC/USD": "0x5741306c21795FdCBb9b265Ea0255F499DFe515C",
    "ETH/USD": "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7",
    "BNB/USD": "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526"
  };

  // Deploy PKChallenge
  console.log("\nDeploying PKChallenge...");
  const PKChallenge = await ethers.getContractFactory("PKChallenge");
  const pkChallenge = await PKChallenge.deploy(USDT_ADDRESS, TREASURY_ADDRESS);
  await pkChallenge.waitForDeployment();
  const pkChallengeAddress = await pkChallenge.getAddress();
  console.log("PKChallenge deployed to:", pkChallengeAddress);

  // Add price feeds
  console.log("\nAdding price feeds...");
  for (const [symbol, feed] of Object.entries(PRICE_FEEDS)) {
    const tx = await pkChallenge.addPriceFeed(symbol, feed);
    await tx.wait();
    console.log(`Added ${symbol} price feed: ${feed}`);
  }

  // Verify supported assets
  const supportedAssets = await pkChallenge.getSupportedAssets();
  console.log("\nSupported assets:", supportedAssets);

  // Save deployment info
  const deploymentInfo = {
    network: "bscTestnet",
    chainId: 97,
    pkChallenge: pkChallengeAddress,
    paymentToken: USDT_ADDRESS,
    treasury: TREASURY_ADDRESS,
    priceFeeds: PRICE_FEEDS,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    "pk-challenge-deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to pk-challenge-deployment.json");

  // Print summary
  console.log("\n========== Deployment Summary ==========");
  console.log("PKChallenge Address:", pkChallengeAddress);
  console.log("Payment Token (USDT):", USDT_ADDRESS);
  console.log("Protocol Treasury:", TREASURY_ADDRESS);
  console.log("Supported Assets:", supportedAssets.join(", "));
  console.log("=========================================\n");

  // Instructions for verification
  console.log("To verify on BscScan:");
  console.log(`npx hardhat verify --network bscTestnet ${pkChallengeAddress} "${USDT_ADDRESS}" "${TREASURY_ADDRESS}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
