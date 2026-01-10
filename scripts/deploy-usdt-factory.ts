import { ethers } from 'hardhat';

async function main() {
  console.log('🚀 Deploying USDT Price Market Factory...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'BNB\n');

  // Configuration
  const PROTOCOL_TREASURY = deployer.address; // Use deployer as treasury for now
  const MOCK_USDT_ADDRESS = '0x846314aA0461E7ae9F1B69F52A565ad8A335E72b'; // Already deployed

  console.log('📝 Configuration:');
  console.log('   Protocol Treasury:', PROTOCOL_TREASURY);
  console.log('   USDT Token:', MOCK_USDT_ADDRESS);
  console.log('');

  // Deploy USDTPriceMarketFactory
  console.log('📦 Deploying USDTPriceMarketFactory...');
  const USDTPriceMarketFactory = await ethers.getContractFactory('USDTPriceMarketFactory');
  const factory = await USDTPriceMarketFactory.deploy(PROTOCOL_TREASURY, MOCK_USDT_ADDRESS);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log('✅ USDTPriceMarketFactory deployed to:', factoryAddress);
  console.log('');

  // Verify configuration
  console.log('🔍 Verifying deployment...');
  const usdtToken = await factory.usdtToken();
  const treasury = await factory.protocolTreasury();
  const creationFee = await factory.creationFee();
  const liquidityParam = await factory.defaultLiquidityParameter();

  console.log('   USDT Token:', usdtToken);
  console.log('   Treasury:', treasury);
  console.log('   Creation Fee:', ethers.formatEther(creationFee), 'BNB');
  console.log('   Liquidity Parameter:', ethers.formatEther(liquidityParam), 'USDT');
  console.log('');

  // Check price feeds
  console.log('📊 Checking price feeds...');
  const btcFeed = await factory.getPriceFeed('BTC/USD');
  const ethFeed = await factory.getPriceFeed('ETH/USD');
  const bnbFeed = await factory.getPriceFeed('BNB/USD');

  console.log('   BTC/USD:', btcFeed);
  console.log('   ETH/USD:', ethFeed);
  console.log('   BNB/USD:', bnbFeed);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 Deployment Complete!');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📋 Deployed Contracts:');
  console.log('   USDTPriceMarketFactory:', factoryAddress);
  console.log('   USDT Token (MockUSDT):', MOCK_USDT_ADDRESS);
  console.log('');

  console.log('📝 Next Steps:');
  console.log('   1. Update frontend addresses.ts with new factory address');
  console.log('   2. Run create-usdt-test-markets.ts to create test markets');
  console.log('   3. Test USDT trading flow in frontend');
  console.log('');

  console.log('💡 Quick Create Commands:');
  console.log('   - BTC 1H:  factory.createBTC1H({ value: ethers.parseEther("0.01") })');
  console.log('   - ETH 4H:  factory.createETH4H({ value: ethers.parseEther("0.01") })');
  console.log('   - BNB 24H: factory.createBNB24H({ value: ethers.parseEther("0.01") })');
  console.log('');

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: 'bscTestnet',
    chainId: 97,
    usdtMarketFactory: factoryAddress,
    mockUSDT: MOCK_USDT_ADDRESS,
    protocolTreasury: PROTOCOL_TREASURY,
    creationFee: ethers.formatEther(creationFee),
    liquidityParameter: ethers.formatEther(liquidityParam),
    priceFeeds: {
      'BTC/USD': btcFeed,
      'ETH/USD': ethFeed,
      'BNB/USD': bnbFeed,
    },
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    'deployed-usdt-factory.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('✅ Deployment info saved to deployed-usdt-factory.json\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
