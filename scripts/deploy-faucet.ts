import { ethers } from 'hardhat';

async function main() {
  console.log('🚰 Deploying Test USDT Faucet for IVY Predict...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'BNB\n');

  // Deploy MockUSDT
  console.log('📝 Deploying MockUSDT...');
  const MockUSDT = await ethers.getContractFactory('MockUSDT');
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  console.log('✅ MockUSDT deployed to:', mockUSDTAddress);

  // Deploy Faucet
  console.log('\n📝 Deploying USDTFaucet...');
  const USDTFaucet = await ethers.getContractFactory('USDTFaucet');
  const faucet = await USDTFaucet.deploy(mockUSDTAddress);
  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  console.log('✅ USDTFaucet deployed to:', faucetAddress);

  // Fund the faucet with 10 million tUSDT
  console.log('\n💰 Funding faucet with 10,000,000 tUSDT...');
  const fundAmount = ethers.parseUnits('10000000', 18);
  const approveTx = await mockUSDT.approve(faucetAddress, fundAmount);
  await approveTx.wait();
  console.log('   ✅ Approved');

  const fundTx = await faucet.fund(fundAmount);
  await fundTx.wait();
  console.log('   ✅ Funded');

  const faucetBalance = await mockUSDT.balanceOf(faucetAddress);
  console.log('   Faucet balance:', ethers.formatUnits(faucetBalance, 18), 'tUSDT');
  console.log('   Can serve:', (Number(faucetBalance) / Number(ethers.parseUnits('30000', 18))).toFixed(0), 'users');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Deployment Complete!');
  console.log('='.repeat(60));
  console.log('MockUSDT:    ', mockUSDTAddress);
  console.log('USDTFaucet:  ', faucetAddress);
  console.log('Claim Amount:', '30,000 tUSDT per address');
  console.log('='.repeat(60));

  console.log('\n📋 Next steps:');
  console.log('1. Update contracts/addresses.ts with these addresses');
  console.log('2. Verify contracts on BscScan');
  console.log('3. Add faucet UI to frontend');

  // Save addresses to file
  const fs = require('fs');
  const path = require('path');
  const addressesPath = path.join(__dirname, '..', 'deployed-faucet-addresses.json');
  const addresses = {
    network: 'bscTestnet',
    chainId: 97,
    mockUSDT: mockUSDTAddress,
    faucet: faucetAddress,
    claimAmount: '30000',
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log('\n✅ Addresses saved to:', addressesPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
