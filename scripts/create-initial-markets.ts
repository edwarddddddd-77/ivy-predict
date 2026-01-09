import { ethers } from 'hardhat';
import PriceMarketFactoryABI from '../artifacts/contracts/core/PriceMarketFactory.sol/PriceMarketFactory.json';
import PricePredictionMarketABI from '../artifacts/contracts/core/PricePredictionMarket.sol/PricePredictionMarket.json';

const deployments = require('../deployments.json');
const FACTORY_ADDRESS = deployments.contracts.PriceMarketFactory;

async function main() {
  console.log('🚀 Creating initial price prediction markets...\n');

  const [signer] = await ethers.getSigners();
  console.log(`Deployer: ${signer.address}`);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} BNB\n`);

  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    PriceMarketFactoryABI.abi,
    signer
  );

  // Check existing markets
  const existingCount = await factory.getMarketCount();
  console.log(`📊 Current market count: ${existingCount}\n`);

  const creationFee = ethers.parseEther('0.01');

  // Create BTC 1H
  console.log('1️⃣  Creating BTC 1-hour market...');
  try {
    const tx1 = await factory.createBTC1H({ value: creationFee });
    const receipt1 = await tx1.wait();

    // Extract market address from event
    const event = receipt1?.logs.find((log: any) => {
      try {
        return factory.interface.parseLog(log)?.name === 'MarketCreated';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = factory.interface.parseLog(event);
      const marketAddress = parsed?.args[0];
      console.log(`   ✅ Market created: ${marketAddress}`);
      console.log(`   📈 Asset: BTC/USD`);
      console.log(`   ⏱️  Duration: 1 hour`);
      console.log(`   🔗 TX: ${receipt1?.hash}`);

      // Record start price immediately
      console.log(`   📝 Recording start price...`);
      const market = new ethers.Contract(marketAddress, PricePredictionMarketABI.abi, signer);
      const recordTx = await market.recordStartPrice();
      await recordTx.wait();
      const startPrice = await market.startPrice();
      console.log(`   ✅ Start price: $${(Number(startPrice) / 1e8).toFixed(2)}\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Create ETH 1H
  console.log('2️⃣  Creating ETH 1-hour market...');
  try {
    const tx2 = await factory.createETH1H({ value: creationFee });
    const receipt2 = await tx2.wait();

    const event = receipt2?.logs.find((log: any) => {
      try {
        return factory.interface.parseLog(log)?.name === 'MarketCreated';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = factory.interface.parseLog(event);
      const marketAddress = parsed?.args[0];
      console.log(`   ✅ Market created: ${marketAddress}`);
      console.log(`   📈 Asset: ETH/USD`);
      console.log(`   ⏱️  Duration: 1 hour`);
      console.log(`   🔗 TX: ${receipt2?.hash}`);

      // Record start price immediately
      console.log(`   📝 Recording start price...`);
      const market = new ethers.Contract(marketAddress, PricePredictionMarketABI.abi, signer);
      const recordTx = await market.recordStartPrice();
      await recordTx.wait();
      const startPrice = await market.startPrice();
      console.log(`   ✅ Start price: $${(Number(startPrice) / 1e8).toFixed(2)}\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Create BNB 4H
  console.log('3️⃣  Creating BNB 4-hour market...');
  try {
    const tx3 = await factory.createBNB4H({ value: creationFee });
    const receipt3 = await tx3.wait();

    const event = receipt3?.logs.find((log: any) => {
      try {
        return factory.interface.parseLog(log)?.name === 'MarketCreated';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = factory.interface.parseLog(event);
      const marketAddress = parsed?.args[0];
      console.log(`   ✅ Market created: ${marketAddress}`);
      console.log(`   📈 Asset: BNB/USD`);
      console.log(`   ⏱️  Duration: 4 hours`);
      console.log(`   🔗 TX: ${receipt3?.hash}`);

      // Record start price immediately
      console.log(`   📝 Recording start price...`);
      const market = new ethers.Contract(marketAddress, PricePredictionMarketABI.abi, signer);
      const recordTx = await market.recordStartPrice();
      await recordTx.wait();
      const startPrice = await market.startPrice();
      console.log(`   ✅ Start price: $${(Number(startPrice) / 1e8).toFixed(2)}\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }

  // Check final count
  const finalCount = await factory.getMarketCount();
  console.log(`\n🎉 Done! Total markets: ${finalCount}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Run: npx hardhat run scripts/record-start-prices.ts --network bscTestnet`);
  console.log(`   2. Start automation: npx hardhat run scripts/automate-price-markets.ts --network bscTestnet\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
