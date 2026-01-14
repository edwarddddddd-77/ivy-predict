import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying EventPKChallenge with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");

  // Contract addresses on BSC Testnet
  const USDT_ADDRESS = "0x846314aA0461E7ae9F1B69F52A565ad8A335E72b"; // Mock USDT
  const TREASURY_ADDRESS = deployer.address; // Use deployer as treasury for now
  const ORACLE_ADDRESS = deployer.address; // Use deployer as oracle for now

  // Deploy EventPKChallenge
  console.log("\nDeploying EventPKChallenge...");
  const EventPKChallenge = await ethers.getContractFactory("EventPKChallenge");
  const eventPKChallenge = await EventPKChallenge.deploy(
    USDT_ADDRESS,
    TREASURY_ADDRESS,
    ORACLE_ADDRESS
  );
  await eventPKChallenge.waitForDeployment();
  const eventPKChallengeAddress = await eventPKChallenge.getAddress();
  console.log("EventPKChallenge deployed to:", eventPKChallengeAddress);

  // Verify deployment
  const stats = await eventPKChallenge.getStatistics();
  console.log("\nInitial statistics:");
  console.log("- Total Challenges:", stats[0].toString());
  console.log("- Total Volume:", stats[1].toString());
  console.log("- Total Resolved:", stats[2].toString());
  console.log("- Open Challenges:", stats[3].toString());

  // Save deployment info
  const deploymentInfo = {
    network: "bscTestnet",
    chainId: 97,
    eventPKChallenge: eventPKChallengeAddress,
    paymentToken: USDT_ADDRESS,
    treasury: TREASURY_ADDRESS,
    oracleResolver: ORACLE_ADDRESS,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    "event-pk-challenge-deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to event-pk-challenge-deployment.json");

  // Print summary
  console.log("\n========== Deployment Summary ==========");
  console.log("EventPKChallenge Address:", eventPKChallengeAddress);
  console.log("Payment Token (USDT):", USDT_ADDRESS);
  console.log("Protocol Treasury:", TREASURY_ADDRESS);
  console.log("Oracle Resolver:", ORACLE_ADDRESS);
  console.log("=========================================\n");

  // Instructions for verification
  console.log("To verify on BscScan:");
  console.log(`npx hardhat verify --network bscTestnet ${eventPKChallengeAddress} "${USDT_ADDRESS}" "${TREASURY_ADDRESS}" "${ORACLE_ADDRESS}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
