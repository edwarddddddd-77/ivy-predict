# 🚀 IVY Predict - 部署指南

## 📋 准备工作

### 1. 获取 BSC 测试网 BNB

访问官方水龙头获取免费测试 BNB：
- 🔗 https://testnet.binance.org/faucet-smart
- 每次可以领取 0.5 BNB
- 建议至少有 0.2 BNB（部署 + 交易费用）

### 2. 配置环境变量

复制 `.env.example` 到 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入以下信息：

```env
# 部署钱包的私钥（不要带 0x 前缀）
PRIVATE_KEY=你的钱包私钥

# BscScan API Key（用于验证合约）
# 获取地址：https://bscscan.com/myapikey
BSCSCAN_API_KEY=你的_bscscan_api_key

# 其他配置（可选，使用默认值即可）
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
REPORT_GAS=false
```

**重要安全提示：**
- ❌ 永远不要提交 `.env` 文件到 Git
- ✅ `.env` 已在 `.gitignore` 中
- ✅ 只使用测试网钱包（不要用主网钱包）

### 3. 获取 BscScan API Key

1. 访问 https://bscscan.com/
2. 注册账号
3. 前往 https://bscscan.com/myapikey
4. 创建新的 API Key
5. 复制 API Key 到 `.env` 文件

---

## 🚀 部署步骤

### Step 1: 编译合约

```bash
npx hardhat compile
```

预期输出：
```
✅ Compiled 4 Solidity files successfully
✅ Successfully generated 48 typings!
```

### Step 2: 部署到 BSC 测试网

```bash
npx hardhat run scripts/deploy-price-markets.ts --network bscTestnet
```

部署脚本会自动执行以下操作：

1. ✅ 部署 `PriceMarketFactory` 合约
2. ✅ 配置 Chainlink Price Feeds (BTC, ETH, BNB)
3. ✅ 创建第一个测试市场（BTC 1小时）
4. ✅ 从 Chainlink 记录起始价格
5. ✅ 保存部署信息到 `deployments.json`

预期输出示例：
```
🚀 Deploying PricePredictionMarket system to BSC Testnet...

📝 Deployer Info:
   Address: 0x1234...5678
   Balance: 0.5 BNB

1️⃣  Deploying PriceMarketFactory...
   ✅ PriceMarketFactory deployed to: 0xABCD...EFGH
   📊 Protocol Treasury: 0x1234...5678
   💰 Creation Fee: 0.01 BNB

2️⃣  Verifying Chainlink Price Feeds...
   BTC/USD: 0x5741306c21795FdCBb9b265Ea0255F499DFe515C
   ETH/USD: 0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7
   BNB/USD: 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526

3️⃣  Creating test market (BTC 1-hour)...
   ✅ Market created at: 0x9876...5432
   📈 Asset: BTC/USD
   ⏱️  Duration: 1 hour
   🔗 TX: 0xabcd...

5️⃣  Recording start price from Chainlink...
   ✅ Start price recorded!
   📊 Recorded Start Price: 96850000000000

🎉 Deployment Complete!
```

### Step 3: 验证合约

验证 Factory 合约：

```bash
npx hardhat verify --network bscTestnet <FACTORY_ADDRESS> <YOUR_ADDRESS>
```

示例：
```bash
npx hardhat verify --network bscTestnet 0xABCD...EFGH 0x1234...5678
```

验证成功后，你可以在 BscScan 上看到合约源代码。

---

## 🧪 测试部署

### 1. 查看市场信息

使用 Hardhat Console：

```bash
npx hardhat console --network bscTestnet
```

```javascript
// 加载合约
const factory = await ethers.getContractAt("PriceMarketFactory", "YOUR_FACTORY_ADDRESS");
const marketAddress = await factory.allMarkets(0);
const market = await ethers.getContractAt("PricePredictionMarket", marketAddress);

// 查看市场信息
const info = await market.getMarketInfo();
console.log("Asset:", info._assetSymbol);
console.log("State:", ["Active", "Locked", "Resolved", "Cancelled"][info._state]);
console.log("Start Price:", info._startPrice.toString());
console.log("End Time:", new Date(Number(info._endTime) * 1000));

// 查看当前价格
const upPrice = await market.getPrice(0); // UP
const downPrice = await market.getPrice(1); // DOWN
console.log("UP Price:", ethers.formatEther(upPrice));
console.log("DOWN Price:", ethers.formatEther(downPrice));
```

### 2. 测试交易

购买 UP shares：

```javascript
// 买 0.01 BNB 的 UP shares
const tx = await market.buyShares(
  0, // direction: UP
  0, // minShares (slippage protection)
  { value: ethers.parseEther("0.01") }
);
await tx.wait();

console.log("✅ Successfully bought UP shares!");

// 查看持仓
const position = await market.getUserPosition(await ethers.provider.getSigner().getAddress());
console.log("UP Shares:", position.upShares.toString());
console.log("DOWN Shares:", position.downShares.toString());
```

### 3. 等待市场结算

1 小时后，市场会自动锁定：

```javascript
// 锁定市场（任何人都可以调用）
const lockTx = await market.lockMarket();
await lockTx.wait();

// 结算市场
const resolveTx = await market.resolveMarket();
await resolveTx.wait();

// 查看结果
const info = await market.getMarketInfo();
console.log("Winning Direction:", ["UP", "DOWN"][Number(info._winningDirection)]);
console.log("Start Price:", info._startPrice.toString());
console.log("End Price:", info._endPrice.toString());
```

### 4. 提取奖金

如果你押对了：

```javascript
const claimTx = await market.claimWinnings();
await claimTx.wait();

console.log("✅ Winnings claimed!");
```

---

## 📊 部署后的文件

部署完成后，你会看到以下文件：

### `deployments.json`

```json
{
  "network": "bscTestnet",
  "chainId": 97,
  "timestamp": "2025-01-09T12:00:00.000Z",
  "deployer": "0x1234...5678",
  "contracts": {
    "PriceMarketFactory": "0xABCD...EFGH",
    "TestMarket_BTC_1H": "0x9876...5432"
  },
  "priceFeeds": {
    "BTC/USD": "0x5741306c21795FdCBb9b265Ea0255F499DFe515C",
    "ETH/USD": "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7",
    "BNB/USD": "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526"
  }
}
```

---

## 🔗 有用的链接

### BSC 测试网
- 🌐 浏览器：https://testnet.bscscan.com/
- 💰 水龙头：https://testnet.binance.org/faucet-smart
- 🔗 RPC：https://data-seed-prebsc-1-s1.binance.org:8545
- 🆔 Chain ID：97

### Chainlink Price Feeds (BSC Testnet)
- BTC/USD：https://testnet.bscscan.com/address/0x5741306c21795FdCBb9b265Ea0255F499DFe515C
- ETH/USD：https://testnet.bscscan.com/address/0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7
- BNB/USD：https://testnet.bscscan.com/address/0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526

### 文档
- Chainlink Docs：https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain
- Hardhat Docs：https://hardhat.org/getting-started/

---

## ❓ 常见问题

### Q: 部署失败，显示 "insufficient funds"
**A:** 你的钱包余额不足。访问 https://testnet.binance.org/faucet-smart 领取测试 BNB。

### Q: 验证合约失败
**A:** 确保：
1. BSCSCAN_API_KEY 正确配置
2. 合约地址正确
3. 构造函数参数正确（Factory 需要传入 treasury 地址）

### Q: 如何创建更多市场？
**A:** 调用 Factory 的快速创建函数：
```javascript
// BTC 1 小时市场
await factory.createBTC1H({ value: ethers.parseEther("0.01") });

// ETH 1 小时市场
await factory.createETH1H({ value: ethers.parseEther("0.01") });

// BNB 4 小时市场
await factory.createBNB4H({ value: ethers.parseEther("0.01") });
```

### Q: 如何修改 creation fee？
**A:** 只有 Factory owner 可以修改：
```javascript
await factory.setCreationFee(ethers.parseEther("0.005")); // 改为 0.005 BNB
```

### Q: 市场什么时候自动结算？
**A:** 市场结束时间（endTime）到达后：
1. 任何人都可以调用 `lockMarket()`
2. 然后任何人都可以调用 `resolveMarket()`
3. 合约会从 Chainlink 读取最新价格并比较
4. 获胜者可以提取奖金

---

## 🎉 下一步

部署成功后，你可以：

1. ✅ 在前端集成合约地址
2. ✅ 开发交易界面
3. ✅ 测试完整交易流程
4. ✅ 准备主网部署

需要帮助？查看 [GitHub Issues](https://github.com/your-repo/ivy-predict/issues) 或联系团队。
