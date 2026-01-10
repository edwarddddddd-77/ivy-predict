# tUSDT 支付解决方案

**问题**: 当前的 PricePredictionMarket 合约只接受 BNB 支付，无法使用 tUSDT

**日期**: 2026-01-11

---

## 问题分析

### 当前架构
```solidity
// PricePredictionMarket.sol - line 216
function buyShares(PriceDirection direction, uint256 minShares)
    external
    payable  // ← 只接受原生代币 (BNB)
    ...
{
    require(msg.value > 0, "Must send BNB");  // ← 硬编码 BNB
    ...
}
```

**限制**:
- `payable` + `msg.value` 只能接收原生代币（BNB）
- 无法接收 ERC20 代币（USDT、BUSD等）
- 用户虽然可以在水龙头领取 tUSDT，但无法用于交易

---

## 解决方案

### 🎯 方案 1: 创建 USDT 版本市场合约（推荐）

**优势**:
- ✅ 保留现有 BNB 市场（不影响已部署合约）
- ✅ 用户可选择使用 BNB 或 USDT
- ✅ 测试网友好（用户可用水龙头 USDT）
- ✅ 更贴近主流 DeFi 习惯（大多数人持有稳定币）

**实现步骤**:

#### 1. 创建新合约 `USDTPricePredictionMarket.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// ... 其他导入

/**
 * @title USDTPricePredictionMarket
 * @notice USDT 版本的价格预测市场
 */
contract USDTPricePredictionMarket is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // 添加 USDT 代币地址
    IERC20 public immutable usdtToken;

    // ... 其他状态变量同 PricePredictionMarket

    constructor(
        string memory _assetSymbol,
        Duration _duration,
        address _priceFeed,
        uint256 _liquidityParameter,
        address _creator,
        address _usdtToken  // ← 新增参数
    ) Ownable(_creator) {
        require(_usdtToken != address(0), "Invalid USDT address");
        usdtToken = IERC20(_usdtToken);
        // ... 其他初始化
    }

    /**
     * @notice 使用 USDT 购买份额
     */
    function buyShares(PriceDirection direction, uint256 amount, uint256 minShares)
        external
        onlyActive
        nonReentrant
        whenNotPaused
    {
        require(priceRecorded, "Start price not recorded yet");
        require(amount > 0, "Must send USDT");

        // 从用户转入 USDT
        usdtToken.safeTransferFrom(msg.sender, address(this), amount);

        // 计算手续费
        uint256 feeAmount = (amount * TOTAL_FEE) / FEE_DENOMINATOR;
        uint256 amountAfterFee = amount - feeAmount;

        // ... 其余逻辑同 BNB 版本

        emit SharesPurchased(msg.sender, direction, shares, amount);
    }

    /**
     * @notice 赎回奖金（USDT）
     */
    function claimWinnings() external nonReentrant {
        require(state == MarketState.Resolved, "Market not resolved");
        require(userShares[msg.sender][winningDirection] > 0, "No winning shares");

        uint256 shares = userShares[msg.sender][winningDirection];
        userShares[msg.sender][winningDirection] = 0;

        // 计算奖金（USDT）
        uint256 payout = calculatePayout(shares);

        // 转账 USDT
        usdtToken.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(msg.sender, payout);
    }
}
```

#### 2. 创建 USDT 市场工厂

```solidity
// contracts/core/USDTPriceMarketFactory.sol
contract USDTPriceMarketFactory {
    address public immutable usdtToken;

    constructor(address _usdtToken) {
        usdtToken = _usdtToken;
    }

    function createMarket(
        string memory assetSymbol,
        Duration duration
    ) external payable returns (address) {
        // 创建费用仍使用 BNB（或改为 USDT）
        require(msg.value >= 0.01 ether, "Insufficient creation fee");

        USDTPricePredictionMarket market = new USDTPricePredictionMarket(
            assetSymbol,
            duration,
            getPriceFeedAddress(assetSymbol),
            100 ether,  // 流动性参数
            msg.sender,
            usdtToken  // ← 传入 USDT 地址
        );

        // ... 记录市场

        return address(market);
    }
}
```

#### 3. 前端适配

**添加市场类型选择**:

```typescript
// frontend/src/pages/QuickMarketPage.tsx

const [paymentToken, setPaymentToken] = useState<'BNB' | 'USDT'>('USDT');

// 根据选择调用不同工厂
const factoryAddress = paymentToken === 'USDT'
  ? getContractAddress(chain.id, 'USDT_PRICE_MARKET_FACTORY')
  : getContractAddress(chain.id, 'PRICE_MARKET_FACTORY');
```

**交易面板支持 USDT**:

```typescript
// frontend/src/pages/PriceMarketDetailPage.tsx

// 检测市场类型
const isUSDTMarket = /* 检查合约是否为 USDT 版本 */;

// USDT 交易需要先 approve
if (isUSDTMarket) {
  // 1. approve USDT
  await usdtContract.approve(marketAddress, amount);

  // 2. buyShares (不需要 value)
  await marketContract.buyShares(direction, amount, minShares);
} else {
  // BNB 交易
  await marketContract.buyShares(direction, minShares, { value: amount });
}
```

---

### 方案 2: 修改现有合约支持双币（不推荐）

**缺点**:
- ❌ 需要重新部署所有合约
- ❌ 已有市场会失效
- ❌ 增加合约复杂度
- ❌ Gas 成本更高

---

## 实施建议

### 推荐路径：分阶段实施

#### Phase 1: 测试网 (本周)
1. ✅ 保留现有 BNB 市场用于演示
2. ✅ 部署 USDT 版本合约
3. ✅ 创建 3-5 个 USDT 市场
4. ✅ 前端添加币种切换

#### Phase 2: 主网 (下月)
1. 使用真实 USDT/BUSD
2. 两种市场并存
3. 根据用户偏好决定主推哪种

---

## 快速原型代码

### 最小可行版本（30分钟实现）

仅修改关键部分，创建简化版 USDT 市场：

```solidity
// contracts/core/SimplifiedUSDTMarket.sol
contract SimplifiedUSDTMarket {
    IERC20 public usdtToken;

    constructor(address _usdt) {
        usdtToken = IERC20(_usdt);
    }

    function buyShares(uint256 amount) external {
        // 1. 转入 USDT
        usdtToken.transferFrom(msg.sender, address(this), amount);

        // 2. 铸造份额
        shares[msg.sender] += amount;
    }

    function claimWinnings() external {
        uint256 payout = shares[msg.sender] * winMultiplier;
        usdtToken.transfer(msg.sender, payout);
    }
}
```

---

## 对比表

| 特性 | BNB 市场 | USDT 市场 |
|------|---------|-----------|
| **用户门槛** | 需要 BNB (测试网难获取) | ✅ 水龙头免费领 |
| **主网可行性** | BSC 原生代币 | ✅ 最常用稳定币 |
| **价格稳定性** | BNB 波动大 | ✅ USDT 稳定 |
| **Gas 成本** | 低（原生代币） | 稍高（ERC20） |
| **用户习惯** | 币圈老手 | ✅ 主流 DeFi 用户 |

---

## 下一步行动

### 选择方案后的任务清单

如果选择**方案1（推荐）**:

- [ ] 创建 `USDTPricePredictionMarket.sol`
- [ ] 创建 `USDTPriceMarketFactory.sol`
- [ ] 编写部署脚本 `deploy-usdt-markets.ts`
- [ ] 部署到 BSC Testnet
- [ ] 前端添加 USDT 支持
  - [ ] 添加币种选择器
  - [ ] 实现 USDT approve 流程
  - [ ] 更新交易面板
- [ ] 测试完整流程
- [ ] 创建 5 个 USDT 测试市场

**预计时间**: 2-3 小时

---

## 结论

**强烈推荐使用方案1**，原因：
1. ✅ 用户可以用水龙头 USDT 立即测试
2. ✅ 主网部署时 USDT 是主流选择
3. ✅ 不影响现有 BNB 市场
4. ✅ 给用户更多选择

这样我们可以同时支持两种市场：
- **BNB 市场** - 适合快速创建（无需 approve）
- **USDT 市场** - 适合稳定币用户（测试网友好）

**你希望我现在就开始实现 USDT 版本的市场合约吗？**
