# IVY Predict - 快速开始指南

## 项目概述

IVY Predict 是一个基于 BNB Chain 的去中心化预测市场平台，采用 LMSR (Logarithmic Market Scoring Rule) 算法实现自动做市。

## 已实现的功能

### ✅ 智能合约
1. **MarketMath.sol** - LMSR 数学库
   - LMSR 成本函数
   - 价格计算
   - 赔率计算
   - 近似指数和对数函数

2. **PredictionMarket.sol** - 核心市场合约
   - 买入/卖出 outcome tokens
   - 流动性管理
   - 市场结算
   - 奖金赎回
   - 手续费分配

3. **PredictionMarketFactory.sol** - 市场工厂
   - 创建二元市场 (YES/NO)
   - 创建分类市场 (多选项)
   - 市场注册表

4. **ChainlinkAdapter.sol** - 预言机集成
   - 请求外部数据
   - 自动市场结算
   - 手动结算备用方案

## 快速开始

### 1. 安装依赖

```bash
cd ivy-predict
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加：
```
PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key
```

### 3. 编译合约

```bash
npm run compile
```

### 4. 运行测试

```bash
npm run test
```

### 5. 部署到本地测试网

```bash
# 启动本地节点
npm run node

# 在另一个终端部署
npm run deploy:local
```

### 6. 部署到 BSC 测试网

```bash
npm run deploy:testnet
```

### 7. 验证合约

```bash
# 更新 scripts/deploy/verify.ts 中的合约地址
npm run verify
```

## 智能合约架构

```
PredictionMarketFactory
    ↓ (创建市场)
PredictionMarket
    ↓ (使用)
MarketMath (LMSR算法)
    ↓ (结算)
ChainlinkAdapter (预言机)
```

## 创建第一个预测市场

### 使用脚本创建

部署脚本会自动创建一个测试市场："Will BTC reach $100,000 by March 2026?"

### 手动创建二元市场

```javascript
const factory = await ethers.getContractAt("PredictionMarketFactory", FACTORY_ADDRESS);

const question = "你的预测问题？";
const endTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30天后
const resolutionTime = endTime + 7 * 24 * 60 * 60; // 结束后7天结算

const creationFee = await factory.marketCreationFee();

const tx = await factory.createBinaryMarket(
  question,
  endTime,
  resolutionTime,
  { value: creationFee }
);

const receipt = await tx.wait();
// 从事件中获取市场地址
```

### 手动创建分类市场

```javascript
const outcomes = ["选项A", "选项B", "选项C", "选项D"];
const liquidityParameter = ethers.parseEther("10"); // 10 BNB

const tx = await factory.createCategoricalMarket(
  question,
  outcomes,
  endTime,
  resolutionTime,
  liquidityParameter,
  { value: creationFee }
);
```

## 与市场交互

### 买入 Outcome Tokens

```javascript
const market = await ethers.getContractAt("PredictionMarket", MARKET_ADDRESS);

// 买入 YES (outcomeId = 1)
const outcomeId = 1;
const minShares = 0; // 滑点保护，设为0表示接受任何赔率

const tx = await market.buyShares(outcomeId, minShares, {
  value: ethers.parseEther("0.1") // 0.1 BNB
});
```

### 卖出 Outcome Tokens

```javascript
const outcomeId = 1;
const sharesToSell = ethers.parseEther("10");
const minPayout = 0; // 最小期望收益

const tx = await market.sellShares(outcomeId, sharesToSell, minPayout);
```

### 添加流动性

```javascript
const tx = await market.addLiquidity({
  value: ethers.parseEther("1.0") // 1 BNB
});
```

### 查看市场信息

```javascript
// 获取市场基本信息
const info = await market.getMarketInfo();
console.log("问题:", info.question);
console.log("选项:", info.outcomes);
console.log("状态:", info.state);

// 获取实时赔率
const odds = await market.getOdds(0); // YES的赔率
console.log("YES赔率:", ethers.formatEther(odds));

// 获取价格(概率)
const price = await market.getPrice(0); // YES的价格
console.log("YES概率:", (Number(price) / 1e18 * 100).toFixed(2) + "%");

// 获取用户持仓
const userAddress = "0x...";
const shares = await market.getUserShares(userAddress, 0);
console.log("用户持有YES:", ethers.formatEther(shares));
```

## 预言机结算

### 自动结算（Chainlink）

```javascript
const adapter = await ethers.getContractAt("ChainlinkAdapter", ADAPTER_ADDRESS);

// 从外部API获取结果
const apiUrl = "https://api.example.com/btc-price";
const path = "usd"; // JSON路径

const tx = await adapter.requestMarketResolution(
  MARKET_ADDRESS,
  apiUrl,
  path
);

// Chainlink会自动回调并结算市场
```

### 手动结算（备用）

```javascript
const winningOutcome = 1; // YES = 1, NO = 0

const tx = await adapter.manualResolve(
  MARKET_ADDRESS,
  winningOutcome
);
```

### 赎回奖金

```javascript
const tx = await market.claimWinnings();
// 自动将获胜的shares转换为BNB
```

## 手续费说明

每笔交易收取 2% 手续费，分配如下：
- **协议费用**: 0.5% → 协议金库
- **LP费用**: 1.0% → 流动性提供者
- **创建者费用**: 0.5% → 市场创建者

## LMSR 算法说明

LMSR (Logarithmic Market Scoring Rule) 是专为预测市场设计的AMM算法：

### 核心公式

```
成本函数: C(q) = b × ln(Σ exp(q_i / b))
价格函数: P_i = exp(q_i / b) / Σ exp(q_j / b)
```

其中：
- `b` = 流动性参数（市场深度）
- `q_i` = outcome i 已售出的数量
- `P_i` = outcome i 的价格（概率）

### 特性

1. **价格反映概率** - 价格在 0-1 之间，代表该结果发生的概率
2. **保证流动性** - 参数 b 确保市场始终有流动性
3. **公平定价** - 价格会随供需自动调整

### 示例

假设一个二元市场（YES/NO）：
- 初始状态：YES 和 NO 各有 0 shares 售出
- 价格：YES = 50%, NO = 50%

用户买入 10 BNB 的 YES：
- YES价格上升 → 约 60%
- NO价格下降 → 约 40%

## 下一步

1. ✅ **智能合约** - 已完成核心功能
2. 🔄 **前端开发** - 正在进行
   - React + Wagmi + RainbowKit
   - 市场浏览页面
   - 交易面板
   - 实时赔率图表
3. 🔄 **测试和审计**
4. 🔄 **主网部署**

## 项目结构

```
ivy-predict/
├── contracts/              # 智能合约
│   ├── core/              # 核心合约
│   │   ├── PredictionMarket.sol
│   │   └── PredictionMarketFactory.sol
│   ├── oracle/            # 预言机
│   │   └── ChainlinkAdapter.sol
│   ├── libraries/         # 数学库
│   │   └── MarketMath.sol
│   └── interfaces/        # 接口
│       └── IPredictionMarket.sol
├── scripts/               # 部署脚本
│   └── deploy/
│       ├── deploy.ts
│       └── verify.ts
├── test/                  # 测试
├── hardhat.config.ts      # Hardhat配置
└── README.md             # 项目文档
```

## 常见问题

### Q: 如何计算需要多少BNB才能买入特定数量的shares？

A: 使用 `MarketMath.calculateBuyCost()` 函数：

```javascript
const cost = await market.getPrice(outcomeId);
// 或直接调用库
const cost = MarketMath.calculateBuyCost(liquidityParameter, quantities, outcomeId, shares);
```

### Q: 流动性参数 b 如何选择？

A: 建议根据初始资金量计算：
```
b = initialFunding / ln(numOutcomes)
```

例如：
- 10 BNB 初始资金，2个结果 → b ≈ 14.4 BNB
- 100 BNB 初始资金，4个结果 → b ≈ 72 BNB

### Q: 市场创建费用可以修改吗？

A: 可以，Factory owner 可以调用：
```javascript
await factory.setMarketCreationFee(newFee);
```

## 技术支持

- GitHub: [项目链接]
- 文档: [文档链接]
- Discord: [社区链接]

## License

MIT
