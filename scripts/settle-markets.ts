import { ethers } from 'hardhat';
import PriceMarketFactoryABI from '../artifacts/contracts/core/PriceMarketFactory.sol/PriceMarketFactory.json';
import PricePredictionMarketABI from '../artifacts/contracts/core/PricePredictionMarket.sol/PricePredictionMarket.json';

const deployments = require('../deployments.json');
const FACTORY_ADDRESS = deployments.contracts.PriceMarketFactory;

async function main() {
  console.log('⚖️  Settling expired markets...\n');

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
    console.log('ℹ️  No markets found.\n');
    return;
  }

  const markets = await factory.getMarkets(0, marketCount);
  const now = Math.floor(Date.now() / 1000);

  let settled = 0;
  let notExpired = 0;
  let alreadySettled = 0;
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

      const isSettled = await market.isSettled();
      const endTime = await market.endTime();
      const assetSymbol = await market.assetSymbol();

      if (isSettled) {
        console.log(`   ℹ️  Already settled: ${assetSymbol}\n`);
        alreadySettled++;
        continue;
      }

      if (now < Number(endTime)) {
        const timeLeft = Number(endTime) - now;
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        console.log(`   ⏰ Not expired: ${assetSymbol} (${hours}h ${minutes}m remaining)\n`);
        notExpired++;
        continue;
      }

      // Settle the market
      console.log(`   ⚖️  Settling ${assetSymbol}...`);
      const tx = await market.settleMarket();
      await tx.wait();

      const startPrice = await market.startPrice();
      const endPrice = await market.endPrice();
      const winner = Number(endPrice) > Number(startPrice) ? 'UP 📈' : 'DOWN 📉';

      console.log(`   ✅ Settled!`);
      console.log(`      Start: $${(Number(startPrice) / 1e8).toFixed(2)}`);
      console.log(`      End: $${(Number(endPrice) / 1e8).toFixed(2)}`);
      console.log(`      Winner: ${winner}`);
      console.log(`   🔗 TX: ${tx.hash}\n`);
      settled++;

      // Wait a bit between calls
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}\n`);
      errors++;
    }
  }

  console.log('=' .repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   ✅ Settled: ${settled}`);
  console.log(`   ⏰ Not expired: ${notExpired}`);
  console.log(`   ℹ️  Already settled: ${alreadySettled}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('=' .repeat(50) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
