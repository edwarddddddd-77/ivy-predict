import { ethers } from 'hardhat';
import PriceMarketFactoryABI from '../artifacts/contracts/core/PriceMarketFactory.sol/PriceMarketFactory.json';
import PricePredictionMarketABI from '../artifacts/contracts/core/PricePredictionMarket.sol/PricePredictionMarket.json';

// Load deployment info
const deployments = require('../deployments.json');

const FACTORY_ADDRESS = deployments.contracts.PriceMarketFactory;
const POLL_INTERVAL = 30000; // 30 seconds

/**
 * Monitor for new markets and automatically record start prices
 */
async function monitorNewMarkets() {
  console.log('👀 Monitoring for new markets...\n');

  const [signer] = await ethers.getSigners();
  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    PriceMarketFactoryABI.abi,
    signer
  );

  // Listen for MarketCreated events
  factory.on('MarketCreated', async (marketAddress, assetSymbol, duration, creator, timestamp) => {
    console.log(`\n🎉 New market created!`);
    console.log(`   Market: ${marketAddress}`);
    console.log(`   Asset: ${assetSymbol}`);
    console.log(`   Duration: ${['1 Hour', '4 Hours', '24 Hours'][duration]}`);
    console.log(`   Creator: ${creator}`);

    try {
      // Wait a few blocks for the transaction to be confirmed
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Record start price
      const market = new ethers.Contract(
        marketAddress,
        PricePredictionMarketABI.abi,
        signer
      );

      // Check if price already recorded
      const priceRecorded = await market.priceRecorded();
      if (!priceRecorded) {
        console.log(`\n📝 Recording start price...`);
        const tx = await market.recordStartPrice();
        await tx.wait();

        const startPrice = await market.startPrice();
        console.log(`✅ Start price recorded: $${(Number(startPrice) / 1e8).toFixed(2)}`);
      } else {
        console.log(`ℹ️  Start price already recorded`);
      }
    } catch (error: any) {
      console.error(`❌ Error recording start price:`, error.message);
    }
  });

  console.log(`✅ Event listener active. Waiting for new markets...\n`);
}

/**
 * Check all markets and settle expired ones
 */
async function checkAndSettleMarkets() {
  const [signer] = await ethers.getSigners();
  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    PriceMarketFactoryABI.abi,
    signer
  );

  try {
    const marketCount = await factory.getMarketCount();
    const markets = await factory.getMarkets(0, marketCount);

    console.log(`\n🔍 Checking ${markets.length} markets for settlement...\n`);

    for (const marketAddress of markets) {
      const market = new ethers.Contract(
        marketAddress,
        PricePredictionMarketABI.abi,
        signer
      );

      try {
        const isSettled = await market.isSettled();
        const endTime = await market.endTime();
        const now = Math.floor(Date.now() / 1000);

        if (!isSettled && now >= Number(endTime)) {
          console.log(`⏰ Market ${marketAddress.slice(0, 10)}... expired. Settling...`);

          const tx = await market.settleMarket();
          await tx.wait();

          const startPrice = await market.startPrice();
          const endPrice = await market.endPrice();
          const winner = Number(endPrice) > Number(startPrice) ? 'UP' : 'DOWN';

          console.log(`✅ Market settled!`);
          console.log(`   Start: $${(Number(startPrice) / 1e8).toFixed(2)}`);
          console.log(`   End: $${(Number(endPrice) / 1e8).toFixed(2)}`);
          console.log(`   Winner: ${winner} 🎉\n`);
        }
      } catch (error: any) {
        // Skip if market doesn't support these functions or already settled
        if (!error.message.includes('call revert exception')) {
          console.error(`⚠️  Error checking market ${marketAddress}:`, error.message);
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ Error in settlement check:`, error.message);
  }
}

/**
 * Create initial test markets
 */
async function createInitialMarkets() {
  console.log('🚀 Creating initial test markets...\n');

  const [signer] = await ethers.getSigners();
  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    PriceMarketFactoryABI.abi,
    signer
  );

  const creationFee = ethers.parseEther('0.01');
  const assets = ['BTC', 'ETH', 'BNB'];
  const durations = [
    { name: '1 Hour', func: 'createBTC1H', func2: 'createETH1H', func3: 'createBNB4H' },
  ];

  // Check existing market count
  const existingCount = await factory.getMarketCount();
  console.log(`📊 Existing markets: ${existingCount}\n`);

  if (Number(existingCount) >= 3) {
    console.log(`ℹ️  Already have ${existingCount} markets. Skipping creation.\n`);
    return;
  }

  try {
    // Create BTC 1H
    console.log(`1️⃣  Creating BTC 1-hour market...`);
    let tx = await factory.createBTC1H({ value: creationFee });
    let receipt = await tx.wait();
    console.log(`   ✅ Created: ${receipt?.hash}\n`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create ETH 1H
    console.log(`2️⃣  Creating ETH 1-hour market...`);
    tx = await factory.createETH1H({ value: creationFee });
    receipt = await tx.wait();
    console.log(`   ✅ Created: ${receipt?.hash}\n`);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create BNB 4H
    console.log(`3️⃣  Creating BNB 4-hour market...`);
    tx = await factory.createBNB4H({ value: creationFee });
    receipt = await tx.wait();
    console.log(`   ✅ Created: ${receipt?.hash}\n`);

    console.log(`🎉 All initial markets created!\n`);
  } catch (error: any) {
    console.error(`❌ Error creating markets:`, error.message);
  }
}

/**
 * Main automation loop
 */
async function main() {
  console.log('🤖 IVY Predict - Market Automation Bot\n');
  console.log('=' .repeat(50));
  console.log(`Factory: ${FACTORY_ADDRESS}`);
  console.log(`Network: ${deployments.network} (Chain ID: ${deployments.chainId})`);
  console.log('=' .repeat(50) + '\n');

  const [signer] = await ethers.getSigners();
  console.log(`🔑 Operator: ${signer.address}`);
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} BNB\n`);

  // Create initial markets if needed
  await createInitialMarkets();

  // Start monitoring for new markets
  monitorNewMarkets();

  // Periodic settlement check
  setInterval(async () => {
    await checkAndSettleMarkets();
  }, POLL_INTERVAL);

  // Initial settlement check
  await checkAndSettleMarkets();

  console.log(`\n✅ Automation bot is running...`);
  console.log(`   - Listening for new markets (auto-record start price)`);
  console.log(`   - Checking for expired markets every ${POLL_INTERVAL / 1000}s\n`);

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
  });
}

main()
  .then(() => {
    // Keep running
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
