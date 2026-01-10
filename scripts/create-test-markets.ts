import { ethers } from 'hardhat';

async function main() {
  console.log('🚀 Creating 9 test markets (BTC/ETH/BNB × 1H/4H/24H)...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Using account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'BNB\n');

  // PriceMarketFactory contract address (BSC Testnet)
  const FACTORY_ADDRESS = '0x8820b123aC0174d65C7b29CFEeED7f671EA672A0';

  const factory = await ethers.getContractAt('PriceMarketFactory', FACTORY_ADDRESS);

  // Creation fee (0.01 BNB)
  const creationFee = ethers.parseEther('0.01');

  // Market configurations
  const markets = [
    // BTC markets
    { asset: 'BTC/USD', duration: 0, name: 'BTC 1H' },
    { asset: 'BTC/USD', duration: 1, name: 'BTC 4H' },
    { asset: 'BTC/USD', duration: 2, name: 'BTC 24H' },

    // ETH markets
    { asset: 'ETH/USD', duration: 0, name: 'ETH 1H' },
    { asset: 'ETH/USD', duration: 1, name: 'ETH 4H' },
    { asset: 'ETH/USD', duration: 2, name: 'ETH 24H' },

    // BNB markets
    { asset: 'BNB/USD', duration: 0, name: 'BNB 1H' },
    { asset: 'BNB/USD', duration: 1, name: 'BNB 4H' },
    { asset: 'BNB/USD', duration: 2, name: 'BNB 24H' },
  ];

  const createdMarkets: { name: string; address: string }[] = [];

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];

    try {
      console.log(`\n📊 Creating market ${i + 1}/9: ${market.name}`);
      console.log(`   Asset: ${market.asset}, Duration: ${market.duration === 0 ? '1H' : market.duration === 1 ? '4H' : '24H'}`);

      // Create market
      const tx = await factory.createMarket(market.asset, market.duration, {
        value: creationFee,
      });

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

        console.log(`   ✅ Market created at: ${marketAddress}`);
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

  console.log('\n\n🎉 Market Creation Complete!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Created Markets:');
  console.log('═══════════════════════════════════════════════════════════\n');

  createdMarkets.forEach((market, index) => {
    console.log(`${index + 1}. ${market.name.padEnd(10)} → ${market.address}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`\n📝 Total markets created: ${createdMarkets.length}/9`);
  console.log(`💰 Total cost: ${ethers.formatEther(creationFee * BigInt(createdMarkets.length))} BNB\n`);

  // Save to file
  const fs = require('fs');
  const outputData = {
    network: 'bscTestnet',
    chainId: 97,
    factory: FACTORY_ADDRESS,
    createdAt: new Date().toISOString(),
    markets: createdMarkets,
  };

  fs.writeFileSync(
    'deployed-test-markets.json',
    JSON.stringify(outputData, null, 2)
  );

  console.log('✅ Market addresses saved to deployed-test-markets.json\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
