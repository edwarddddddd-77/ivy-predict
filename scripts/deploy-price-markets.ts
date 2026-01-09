import { ethers } from "hardhat";
import { ChainlinkFeeds } from "../typechain-types";

async function main() {
  console.log("🚀 Deploying PricePredictionMarket system to BSC Testnet...\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("📝 Deployer Info:");
  console.log("   Address:", deployer.address);
  console.log("   Balance:", ethers.formatEther(balance), "BNB\n");

  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Low balance. Get testnet BNB from https://testnet.binance.org/faucet-smart\n");
  }

  // Step 1: Deploy PriceMarketFactory
  console.log("1️⃣  Deploying PriceMarketFactory...");
  const PriceMarketFactory = await ethers.getContractFactory("PriceMarketFactory");

  // Use deployer as protocol treasury for now
  const factory = await PriceMarketFactory.deploy(deployer.address);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("   ✅ PriceMarketFactory deployed to:", factoryAddress);
  console.log("   📊 Protocol Treasury:", deployer.address);
  console.log("   💰 Creation Fee:", ethers.formatEther(await factory.creationFee()), "BNB\n");

  // Step 2: Verify price feeds are configured
  console.log("2️⃣  Verifying Chainlink Price Feeds...");
  const supportedAssets = ["BTC/USD", "ETH/USD", "BNB/USD"];

  for (const asset of supportedAssets) {
    const feedAddress = await factory.priceFeeds(asset);
    console.log(`   ${asset}: ${feedAddress}`);
  }
  console.log();

  // Step 3: Create a test market (BTC 1-hour)
  console.log("3️⃣  Creating test market (BTC 1-hour)...");
  const creationFee = await factory.creationFee();

  const tx = await factory.createBTC1H({ value: creationFee });
  const receipt = await tx.wait();

  // Find MarketCreated event
  const marketCreatedEvent = receipt?.logs
    .map(log => {
      try {
        return factory.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
      } catch {
        return null;
      }
    })
    .find(event => event?.name === "MarketCreated");

  if (!marketCreatedEvent) {
    throw new Error("MarketCreated event not found");
  }

  const marketAddress = marketCreatedEvent.args[0];
  console.log("   ✅ Market created at:", marketAddress);
  console.log("   📈 Asset: BTC/USD");
  console.log("   ⏱️  Duration: 1 hour");
  console.log("   🔗 TX:", receipt?.hash, "\n");

  // Step 4: Get market info
  console.log("4️⃣  Reading market info...");
  const PricePredictionMarket = await ethers.getContractFactory("PricePredictionMarket");
  const market = PricePredictionMarket.attach(marketAddress);

  const [
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
  ] = await market.getMarketInfo();

  console.log("   Symbol:", assetSymbol);
  console.log("   State:", ["Active", "Locked", "Resolved", "Cancelled"][Number(state)]);
  console.log("   Start Time:", new Date(Number(startTime) * 1000).toLocaleString());
  console.log("   End Time:", new Date(Number(endTime) * 1000).toLocaleString());
  console.log("   Start Price:", startPrice == 0n ? "Not recorded yet" : startPrice.toString());
  console.log("   Total Volume:", ethers.formatEther(totalVolume), "BNB");
  console.log("   Total Liquidity:", ethers.formatEther(totalLiquidity), "BNB\n");

  // Step 5: Record start price
  console.log("5️⃣  Recording start price from Chainlink...");
  const recordTx = await market.recordStartPrice();
  await recordTx.wait();
  console.log("   ✅ Start price recorded!");
  console.log("   🔗 TX:", (await recordTx.wait())?.hash, "\n");

  // Step 6: Read updated market info
  const [, , , , , newStartPrice] = await market.getMarketInfo();
  console.log("   📊 Recorded Start Price:", newStartPrice.toString(), "\n");

  // Step 7: Summary
  console.log("=" .repeat(80));
  console.log("🎉 Deployment Complete!");
  console.log("=" .repeat(80));
  console.log("\n📋 Contract Addresses:");
  console.log("   Factory:", factoryAddress);
  console.log("   Test Market:", marketAddress);
  console.log("\n🔗 BscScan Links:");
  console.log("   Factory: https://testnet.bscscan.com/address/" + factoryAddress);
  console.log("   Market: https://testnet.bscscan.com/address/" + marketAddress);
  console.log("\n📝 Next Steps:");
  console.log("   1. Verify contracts on BscScan:");
  console.log("      npx hardhat verify --network bscTestnet " + factoryAddress + " " + deployer.address);
  console.log("   2. Test trading:");
  console.log("      - Buy UP shares");
  console.log("      - Buy DOWN shares");
  console.log("      - Wait 1 hour for settlement");
  console.log("      - Claim winnings");
  console.log("\n💾 Save these addresses to frontend/src/contracts/addresses.ts");
  console.log();

  // Save deployment info to file
  const deploymentInfo = {
    network: "bscTestnet",
    chainId: 97,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PriceMarketFactory: factoryAddress,
      TestMarket_BTC_1H: marketAddress,
    },
    priceFeeds: {
      "BTC/USD": await factory.priceFeeds("BTC/USD"),
      "ETH/USD": await factory.priceFeeds("ETH/USD"),
      "BNB/USD": await factory.priceFeeds("BNB/USD"),
    }
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("✅ Deployment info saved to deployments.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
