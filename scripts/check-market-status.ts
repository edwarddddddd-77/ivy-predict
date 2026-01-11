import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 Checking market status...\n');

  // Check one USDT market
  const usdtMarketAddress = '0xf5221ccD95A239133d2bbB4836E57dc584F9205f'; // BTC 1H USDT

  const market = await ethers.getContractAt('USDTPricePredictionMarket', usdtMarketAddress);

  console.log(`Market: ${usdtMarketAddress}\n`);

  const assetSymbol = await market.assetSymbol();
  const duration = await market.duration();
  const startPrice = await market.startPrice();
  const endPrice = await market.endPrice();
  const priceRecorded = await market.priceRecorded();
  const isSettled = await market.isSettled();
  const startTime = await market.startTime();
  const endTime = await market.endTime();

  console.log(`Asset: ${assetSymbol}`);
  console.log(`Duration: ${duration} (${duration === 0n ? '1H' : duration === 1n ? '4H' : '24H'})`);
  console.log(`Start Price: ${startPrice} (${Number(startPrice) / 1e8})`);
  console.log(`End Price: ${endPrice} (${Number(endPrice) / 1e8})`);
  console.log(`Price Recorded: ${priceRecorded}`);
  console.log(`Is Settled: ${isSettled}`);
  console.log(`Start Time: ${startTime} (${new Date(Number(startTime) * 1000).toLocaleString()})`);
  console.log(`End Time: ${endTime} (${new Date(Number(endTime) * 1000).toLocaleString()})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
