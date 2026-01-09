import { ethers } from 'hardhat';
import PriceMarketFactoryABI from '../artifacts/contracts/core/PriceMarketFactory.sol/PriceMarketFactory.json';
import PricePredictionMarketABI from '../artifacts/contracts/core/PricePredictionMarket.sol/PricePredictionMarket.json';

const deployments = require('../deployments.json');
const FACTORY_ADDRESS = deployments.contracts.PriceMarketFactory;

async function main() {
  console.log('📝 Recording start prices for all markets...\n');

  const [signer] = await ethers.getSigners();
  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    PriceMarketFactoryABI.abi,
    signer
  );

  // Get all markets
  const marketCount = await factory.getMarketCount();
  console.log(`Total markets: ${marketCount}\n`);

  if (Number(marketCount) === 0) {
    console.log('ℹ️  No markets found. Create some first!\n');
    return;
  }

  const markets = await factory.getMarkets(0, marketCount);

  let recorded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < markets.length; i++) {
    const marketAddress = markets[i];
    console.log(`${i + 1}/${markets.length} Checking ${marketAddress}...`);

    try {
      const market = new ethers.Contract(
        marketAddress,
        PricePredictionMarketABI.abi,
        signer
      );

      // Check if already recorded
      const priceRecorded = await market.priceRecorded();
      const assetSymbol = await market.assetSymbol();

      if (priceRecorded) {
        const startPrice = await market.startPrice();
        console.log(`   ℹ️  Already recorded: ${assetSymbol} - $${(Number(startPrice) / 1e8).toFixed(2)}\n`);
        skipped++;
        continue;
      }

      // Record start price
      console.log(`   📝 Recording ${assetSymbol}...`);
      const tx = await market.recordStartPrice();
      await tx.wait();

      const startPrice = await market.startPrice();
      console.log(`   ✅ Recorded: $${(Number(startPrice) / 1e8).toFixed(2)}`);
      console.log(`   🔗 TX: ${tx.hash}\n`);
      recorded++;

      // Wait a bit between calls
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}\n`);
      errors++;
    }
  }

  console.log('=' .repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   ✅ Recorded: ${recorded}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('=' .repeat(50) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
