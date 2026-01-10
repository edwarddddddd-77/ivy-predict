import { ethers } from 'hardhat';

async function main() {
  console.log('🚀 Creating 5 USDT test markets (BTC/ETH × 1H/4H/24H)...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Using account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'BNB\n');

  // USDT Factory contract address
  const FACTORY_ADDRESS = '0xBCCb4a4DEEF67B5776e26a28C23ce01F828295E6';

  const factory = await ethers.getContractAt('USDTPriceMarketFactory', FACTORY_ADDRESS);

  // Creation fee (0.01 BNB)
  const creationFee = ethers.parseEther('0.01');

  // Market configurations
  const markets = [
    // BTC markets
    { asset: 'BTC/USD', duration: 0, name: 'BTC 1H (USDT)', method: 'createBTC1H' },
    { asset: 'BTC/USD', duration: 1, name: 'BTC 4H (USDT)', method: 'createBTC4H' },
    { asset: 'BTC/USD', duration: 2, name: 'BTC 24H (USDT)', method: 'createBTC24H' },

    // ETH markets
    { asset: 'ETH/USD', duration: 0, name: 'ETH 1H (USDT)', method: 'createETH1H' },
    { asset: 'ETH/USD', duration: 1, name: 'ETH 4H (USDT)', method: null }, // Use generic create
  ];

  const createdMarkets: { name: string; address: string }[] = [];

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];

    try {
      console.log(`\n📊 Creating market ${i + 1}/5: ${market.name}`);
      console.log(`   Asset: ${market.asset}, Duration: ${market.duration === 0 ? '1H' : market.duration === 1 ? '4H' : '24H'}`);

      let tx;
      if (market.method && (factory as any)[market.method]) {
        // Use quick create method
        console.log(`   Using quick method: ${market.method}()`);
        tx = await (factory as any)[market.method]({
          value: creationFee,
        });
      } else {
        // Use generic createMarket
        console.log(`   Using createMarket()`);
        tx = await factory.createMarket(market.asset, market.duration, {
          value: creationFee,
        });
      }

      console.log(`   Transaction sent: ${tx.hash}`);
      console.log(`   Waiting for confirmation...`);

      const receipt = await tx.wait();

      // Find MarketCreated event
      const marketCreatedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          return parsed?.name === 'MarketCreated';
        } catch {
          return false;
        }
      });

      if (marketCreatedEvent) {
        const parsed = factory.interface.parseLog({
          topics: marketCreatedEvent.topics as string[],
          data: marketCreatedEvent.data,
        });
        const marketAddress = parsed?.args[0];

        console.log(`   ✅ USDT Market created at: ${marketAddress}`);
        createdMarkets.push({ name: market.name, address: marketAddress });
      } else {
        console.log(`   ⚠️  Market created but address not found in events`);
      }

      // Wait a bit between transactions to avoid nonce issues
      if (i < markets.length - 1) {
        console.log(`   Waiting 3 seconds before next market...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error: any) {
      console.error(`   ❌ Error creating ${market.name}:`, error.message);
    }
  }

  console.log('\n\n🎉 USDT Market Creation Complete!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Created USDT Markets:');
  console.log('═══════════════════════════════════════════════════════════\n');

  createdMarkets.forEach((market, index) => {
    console.log(`${index + 1}. ${market.name.padEnd(20)} → ${market.address}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`\n📝 Total markets created: ${createdMarkets.length}/5`);
  console.log(`💰 Total cost: ${ethers.formatEther(creationFee * BigInt(createdMarkets.length))} BNB`);
  console.log(`💵 Payment token: USDT (users can claim from faucet)`);
  console.log(`\n💡 Users can now:`);
  console.log(`   1. Claim 30,000 tUSDT from faucet`);
  console.log(`   2. Approve USDT spending to market contract`);
  console.log(`   3. Trade UP/DOWN with USDT\n`);

  // Save to file
  const fs = require('fs');
  const outputData = {
    network: 'bscTestnet',
    chainId: 97,
    factory: FACTORY_ADDRESS,
    marketType: 'USDT',
    createdAt: new Date().toISOString(),
    markets: createdMarkets,
  };

  fs.writeFileSync(
    'deployed-usdt-test-markets.json',
    JSON.stringify(outputData, null, 2)
  );

  console.log('✅ Market addresses saved to deployed-usdt-test-markets.json\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
