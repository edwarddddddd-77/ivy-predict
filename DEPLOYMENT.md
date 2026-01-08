# IVY Predict - 部署信息

## BSC 测试网部署

**部署时间**: 2026-01-09
**部署账户**: 0x9f3c75dBD5941446b53C19d0Fd1039C7842A1a69
**网络**: BSC Testnet (Chain ID: 97)
**RPC节点**: https://bsc-testnet.nodereal.io/v1/e9a36765eb8a40b9bd12e680a1fd2bc5

---

## 已部署合约

### 1. ChainlinkAdapter
**地址**: `0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA`
**交易哈希**: `0x65b1b906bf5eb5d47d4f64cda91eb406e1d889bcbd6c3d79d1dcfd51b76f2ac5`
**BscScan**: https://testnet.bscscan.com/address/0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA

**功能**: Chainlink预言机适配器，用于市场结果解析

**配置**:
- LINK Token: 0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06
- Oracle: 0xCC79157eb46F5624204f47AB42b3906cAA40eaB7
- Job ID: 0x6361393833363663633733313439353762386330313263373266303561656562
- Oracle Fee: 0.1 LINK

### 2. PredictionMarketFactory
**地址**: `0x8fd3c246AA277435781bbcDF60Efc6Bd55f46c68`
**交易哈希**: `0xe1d79ae997cf273fadfa38c347d3733b5b02b394a6d9c133b4a0893c39377031`
**BscScan**: https://testnet.bscscan.com/address/0x8fd3c246AA277435781bbcDF60Efc6Bd55f46c68

**功能**: 预测市场工厂合约，用于创建和管理预测市场

**配置**:
- Creation Fee: 0.01 BNB
- Min Liquidity Parameter: 1 BNB
- Oracle Resolver: ChainlinkAdapter (0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA)

---

## 前端配置

前端合约地址已更新到: `frontend/src/contracts/addresses.ts`

```typescript
97: {
  FACTORY: '0x8fd3c246AA277435781bbcDF60Efc6Bd55f46c68',
  CHAINLINK_ADAPTER: '0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA',
}
```

---

## 下一步操作

### 1. 验证合约（可选）

如果需要在BscScan上验证合约源代码，需要获取BscScan API Key：

1. 访问 https://bscscan.com/myapikey
2. 注册账户并生成API密钥
3. 将API密钥添加到 `.env` 文件中：
   ```
   BSCSCAN_API_KEY=your_api_key_here
   ```
4. 运行验证命令：
   ```bash
   npx hardhat verify --network bscTestnet 0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA \
     "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06" \
     "0xCC79157eb46F5624204f47AB42b3906cAA40eaB7" \
     "0x6361393833363663633733313439353762386330313263373266303561656562" \
     "100000000000000000"

   npx hardhat verify --network bscTestnet 0x8fd3c246AA277435781bbcDF60Efc6Bd55f46c68 \
     "0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA"
   ```

### 2. 为ChainlinkAdapter充值LINK代币

预言机操作需要LINK代币作为手续费。从测试网水龙头获取LINK：

**BSC测试网LINK水龙头**: https://faucets.chain.link/bnb-chain-testnet

向ChainlinkAdapter地址发送至少 1 LINK：
```
0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA
```

### 3. 测试前端

1. 配置WalletConnect Project ID（在 `frontend/src/wagmi.config.ts`）
2. 启动开发服务器：
   ```bash
   cd frontend
   npm run dev
   ```
3. 在浏览器中打开 http://localhost:5173
4. 连接MetaMask钱包（切换到BSC测试网）
5. 测试功能：
   - 创建预测市场
   - 买入/卖出outcome代币
   - 添加流动性

### 4. 获取测试用BNB

**BSC测试网水龙头**: https://testnet.bnbchain.org/faucet-smart

---

## 智能合约功能说明

### 创建市场

**成本**: 0.01 BNB (创建费) + 初始流动性（最少1 BNB）

**二元市场**（YES/NO）:
```solidity
factory.createBinaryMarket(
  "市场问题?",
  endTime,        // 结束时间戳
  resolutionTime  // 解析时间戳
)
```

**分类市场**（多个结果）:
```solidity
factory.createCategoricalMarket(
  "市场问题?",
  ["结果1", "结果2", "结果3"],
  endTime,
  resolutionTime,
  liquidityParam  // 流动性参数
)
```

### 交易

**买入**:
```solidity
market.buyShares(
  outcomeId,     // 0 = YES/第一个结果, 1 = NO/第二个结果
  sharesToBuy,   // 购买数量
  maxCost        // 最大花费（滑点保护）
)
```

**卖出**:
```solidity
market.sellShares(
  outcomeId,
  sharesToSell,
  minPayout      // 最小收益（滑点保护）
)
```

### 流动性管理

**添加流动性**:
```solidity
market.addLiquidity() // 发送BNB
```

**移除流动性**:
```solidity
market.removeLiquidity(shares)
```

### 市场解析

**预言机解析**（自动）:
- 市场结束后，调用 `chainlinkAdapter.requestMarketResolution(marketAddress, apiUrl, jsonPath)`
- Chainlink节点获取数据并回调
- 市场自动解析为获胜结果

**手动解析**（备用）:
```solidity
chainlinkAdapter.manualResolve(marketAddress, winningOutcome)
```

### 领取奖金

```solidity
market.claimWinnings()
```

---

## 安全提示

⚠️ **这是测试网部署，仅用于开发和测试目的**

- 不要在主网使用测试网私钥
- 测试网代币没有实际价值
- 合约未经过安全审计
- 建议在主网部署前进行专业审计

---

## 技术支持

- 项目文档: [README.md](./README.md)
- 快速开始: [QUICKSTART.md](./QUICKSTART.md)
- 测试报告: [TEST_REPORT.md](./TEST_REPORT.md)

**BscScan 合约页面**:
- Factory: https://testnet.bscscan.com/address/0x8fd3c246AA277435781bbcDF60Efc6Bd55f46c68
- Adapter: https://testnet.bscscan.com/address/0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA
