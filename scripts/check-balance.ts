import { ethers } from "hardhat";

async function main() {
  console.log("💰 Checking wallet balance on BSC Testnet...\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInBNB = ethers.formatEther(balance);

  console.log("📝 Wallet Info:");
  console.log("   Address:", deployer.address);
  console.log("   Balance:", balanceInBNB, "BNB");
  console.log("   Network:", (await ethers.provider.getNetwork()).name);
  console.log("   Chain ID:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log();

  // Estimate gas costs
  const avgGasPrice = (await ethers.provider.getFeeData()).gasPrice || 10000000000n;
  const gasPriceInGwei = Number(avgGasPrice) / 1e9;

  console.log("⛽ Gas Price Info:");
  console.log("   Current Gas Price:", gasPriceInGwei.toFixed(2), "Gwei");
  console.log();

  // Estimate deployment costs
  console.log("💸 Estimated Deployment Costs:");

  // Factory deployment: ~2,500,000 gas
  const factoryGas = 2500000n;
  const factoryCost = factoryGas * avgGasPrice;
  console.log("   1. PriceMarketFactory:", ethers.formatEther(factoryCost), "BNB");

  // Create market: ~500,000 gas
  const createMarketGas = 500000n;
  const createMarketCost = createMarketGas * avgGasPrice;
  console.log("   2. Create First Market:", ethers.formatEther(createMarketCost), "BNB");

  // Record price: ~100,000 gas
  const recordPriceGas = 100000n;
  const recordPriceCost = recordPriceGas * avgGasPrice;
  console.log("   3. Record Start Price:", ethers.formatEther(recordPriceCost), "BNB");

  // Creation fee
  const creationFee = ethers.parseEther("0.01");
  console.log("   4. Market Creation Fee:", ethers.formatEther(creationFee), "BNB");

  // Total
  const totalCost = factoryCost + createMarketCost + recordPriceCost + creationFee;
  console.log("   ---");
  console.log("   Total Estimated Cost:", ethers.formatEther(totalCost), "BNB");
  console.log();

  // Check if sufficient
  if (balance >= totalCost) {
    const remaining = balance - totalCost;
    console.log("✅ Sufficient balance for deployment!");
    console.log("   Remaining after deployment:", ethers.formatEther(remaining), "BNB");
  } else {
    const needed = totalCost - balance;
    console.log("❌ Insufficient balance for deployment!");
    console.log("   Additional BNB needed:", ethers.formatEther(needed), "BNB");
    console.log();
    console.log("💡 Options:");
    console.log("   1. Get testnet BNB from: https://testnet.binance.org/faucet-smart");
    console.log("   2. Deploy only Factory first (saves ~0.006 BNB)");
    console.log("   3. Wait 24 hours and try faucet again");
    console.log();
    console.log("🔧 Minimal deployment (Factory only):");
    console.log("   Estimated cost:", ethers.formatEther(factoryCost), "BNB");
    if (balance >= factoryCost) {
      console.log("   ✅ You have enough for Factory deployment!");
    } else {
      const minNeeded = factoryCost - balance;
      console.log("   ❌ Still need:", ethers.formatEther(minNeeded), "BNB");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
