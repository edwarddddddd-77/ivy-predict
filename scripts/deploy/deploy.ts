import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function main() {
  console.log("\n========================================");
  console.log("🚀 Starting deployment to BSC Testnet");
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB\n");

  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Account balance is low. You may need more BNB for deployment.");
    console.warn("   Get testnet BNB from: https://testnet.bnbchain.org/faucet-smart\n");
  }

  // Chainlink configuration for BSC Testnet
  const LINK_TOKEN = "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06";
  const ORACLE = "0xCC79157eb46F5624204f47AB42b3906cAA40eaB7";
  const JOB_ID = "0x6361393833363663633733313439353762386330313263373266303561656562"; // ca98366cc7314957b8c012c72f05aeeb in hex
  const ORACLE_FEE = ethers.parseEther("0.1"); // 0.1 LINK

  console.log("Chainlink Configuration:");
  console.log("  LINK Token:", LINK_TOKEN);
  console.log("  Oracle:", ORACLE);
  console.log("  Job ID:", JOB_ID);
  console.log("  Oracle Fee:", ethers.formatEther(ORACLE_FEE), "LINK\n");

  // Step 1: Deploy ChainlinkAdapter first
  console.log("📝 Step 1: Deploying ChainlinkAdapter...");
  const ChainlinkAdapter = await ethers.getContractFactory("ChainlinkAdapter");
  const adapter = await ChainlinkAdapter.deploy(LINK_TOKEN, ORACLE, JOB_ID, ORACLE_FEE);
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log("✅ ChainlinkAdapter deployed to:", adapterAddress);
  console.log("   Transaction hash:", adapter.deploymentTransaction()?.hash, "\n");

  // Wait for confirmations
  console.log("⏳ Waiting for 3 confirmations...");
  await adapter.deploymentTransaction()?.wait(3);
  console.log("✅ Confirmed\n");

  // Step 2: Deploy PredictionMarketFactory with adapter address
  console.log("📝 Step 2: Deploying PredictionMarketFactory...");
  const Factory = await ethers.getContractFactory("PredictionMarketFactory");
  const factory = await Factory.deploy(adapterAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ PredictionMarketFactory deployed to:", factoryAddress);
  console.log("   Transaction hash:", factory.deploymentTransaction()?.hash, "\n");

  // Wait for a few blocks to ensure the contract is propagated
  console.log("⏳ Waiting for 3 confirmations...");
  await factory.deploymentTransaction()?.wait(3);
  console.log("✅ Confirmed\n");

  // Print deployment summary
  console.log("\n========================================");
  console.log("🎉 Deployment Complete!");
  console.log("========================================\n");
  console.log("Contract Addresses:");
  console.log("-------------------");
  console.log("PredictionMarketFactory:", factoryAddress);
  console.log("ChainlinkAdapter:       ", adapterAddress);
  console.log("\nFactory Settings:");
  console.log("-------------------");
  const creationFee = await factory.creationFee();
  const minLiquidity = await factory.minLiquidityParameter();
  console.log("Creation Fee:           ", ethers.formatEther(creationFee), "BNB");
  console.log("Min Liquidity Parameter:", ethers.formatEther(minLiquidity), "BNB");
  console.log("\nBscScan Links:");
  console.log("-------------------");
  console.log("Factory:", `https://testnet.bscscan.com/address/${factoryAddress}`);
  console.log("Adapter:", `https://testnet.bscscan.com/address/${adapterAddress}`);
  console.log("\nNext Steps:");
  console.log("-------------------");
  console.log("1. Verify contracts on BscScan");
  console.log("2. Update frontend/src/contracts/addresses.ts with the addresses above");
  console.log("3. Fund ChainlinkAdapter with LINK tokens for oracle operations");
  console.log("   Get testnet LINK from: https://faucets.chain.link/bnb-chain-testnet");
  console.log("\n========================================\n");

  // Save deployment info to file
  const deploymentInfo = {
    network: "bscTestnet",
    chainId: 97,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      PredictionMarketFactory: factoryAddress,
      ChainlinkAdapter: adapterAddress,
    },
    chainlink: {
      linkToken: LINK_TOKEN,
      oracle: ORACLE,
      jobId: JOB_ID,
      fee: ORACLE_FEE.toString(),
    },
  };

  const deployDir = path.join(__dirname, "../../deployments");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(deployDir, "bscTestnet.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("📄 Deployment info saved to: deployments/bscTestnet.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
