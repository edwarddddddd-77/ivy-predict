import { ethers } from 'hardhat';

async function main() {
  console.log('📊 Recording start prices for all markets...\n');

  // All USDT markets
  const usdtMarkets = [
    '0xf5221ccD95A239133d2bbB4836E57dc584F9205f', // BTC 1H
    '0xdf9822F5cDf873DCd50E1334DC7ae82684B9B208', // BTC 4H
    '0x65522d72185c4CADcf921BA6ab9848bdf6ECf5Db', // BTC 24H
    '0xf0c7bE55B7B8c2bBEB4D6124d845C52de6EDb3d9', // ETH 1H
    '0x73DE727441989a61D9B6a0519259239eD5c8976f', // ETH 4H
  ];

  // All BNB markets
  const bnbMarkets = [
    '0x4e48FF3EB36F0c579D4FA62C584D4f48D18E0a6a', // BTC 1H
    '0x54429205D30bD2294F67d69e0CF04EF81C373F85', // BTC 4H
    '0xBA9513768Df768D9fF9B2ed7753Bd9DFf166F100', // BTC 24H
    '0x32b82ccC3AC0A83DAE08B052A04FF1244F30ea51', // ETH 1H
    '0x9fC07540A40043e0B8Bf12528D6cd8fE2CcE0d99', // ETH 4H
    '0xe0e238C022b7b5e89Ca1513e49E4499b2D638917', // ETH 24H
    '0xb9dFadc85C7E3a36f87d6D4a0102B886084c550a', // BNB 4H
  ];

  let successCount = 0;

  // Record USDT markets
  console.log('🔵 Recording USDT Markets:\n');
  for (const address of usdtMarkets) {
    try {
      const market = await ethers.getContractAt('USDTPricePredictionMarket', address);
      const priceRecorded = await market.priceRecorded();

      if (priceRecorded) {
        console.log(`✅ ${address} - Already recorded`);
        successCount++;
        continue;
      }

      const tx = await market.recordStartPrice();
      console.log(`📝 ${address} - Recording... (${tx.hash})`);
      await tx.wait();

      const startPrice = await market.startPrice();
      console.log(`✅ ${address} - Recorded: $${Number(startPrice) / 1e8}\n`);
      successCount++;

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ ${address} - Error: ${error.message}\n`);
    }
  }

  // Record BNB markets
  console.log('\n⚡ Recording BNB Markets:\n');
  for (const address of bnbMarkets) {
    try {
      const market = await ethers.getContractAt('PricePredictionMarket', address);
      const priceRecorded = await market.priceRecorded();

      if (priceRecorded) {
        console.log(`✅ ${address} - Already recorded`);
        successCount++;
        continue;
      }

      const tx = await market.recordStartPrice();
      console.log(`📝 ${address} - Recording... (${tx.hash})`);
      await tx.wait();

      const startPrice = await market.startPrice();
      console.log(`✅ ${address} - Recorded: $${Number(startPrice) / 1e8}\n`);
      successCount++;

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`❌ ${address} - Error: ${error.message}\n`);
    }
  }

  console.log(`\n🎉 Complete! ${successCount}/${usdtMarkets.length + bnbMarkets.length} markets recorded\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
