import { run } from "hardhat";

async function main() {
  console.log("🔍 Verifying contracts on BscScan...\n");

  // Replace these with your deployed contract addresses
  const CHAINLINK_ADAPTER = "0x...";
  const FACTORY = "0x...";

  // BSC Testnet Chainlink addresses
  const LINK_TOKEN_TESTNET = "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06";
  const ORACLE_TESTNET = "0x95e3A1827B4d33ba839B8da94d0e0Da73c6E6C65";
  const JOB_ID = "0x..."; // Your job ID
  const ORACLE_FEE = "100000000000000000"; // 0.1 LINK

  try {
    // Verify ChainlinkAdapter
    console.log("Verifying ChainlinkAdapter...");
    await run("verify:verify", {
      address: CHAINLINK_ADAPTER,
      constructorArguments: [
        LINK_TOKEN_TESTNET,
        ORACLE_TESTNET,
        JOB_ID,
        ORACLE_FEE,
      ],
    });
    console.log("✅ ChainlinkAdapter verified\n");

    // Verify PredictionMarketFactory
    console.log("Verifying PredictionMarketFactory...");
    await run("verify:verify", {
      address: FACTORY,
      constructorArguments: [CHAINLINK_ADAPTER],
    });
    console.log("✅ PredictionMarketFactory verified\n");

    console.log("All contracts verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
