# Vercel 快速部署指南

## 自动部署步骤

### 1. 访问Vercel并登录
访问：https://vercel.com/
点击 "Continue with GitHub" 使用GitHub账号登录

### 2. 导入项目
1. 点击 "Add New..." → "Project"
2. 在仓库列表中找到 `ivy-predict`
3. 点击 "Import"

### 3. 配置项目

**重要配置项**：

```
Framework Preset: Vite
Root Directory: frontend  (点击Edit修改)
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**环境变量**（可选，稍后添加）：
```
VITE_WALLETCONNECT_PROJECT_ID = 从 https://cloud.walletconnect.com/ 获取
```

### 4. 部署
点击 "Deploy" 按钮，等待2-3分钟

### 5. 获取URL
部署成功后，您会得到一个URL，例如：
```
https://ivy-predict.vercel.app
或
https://ivy-predict-xxx.vercel.app
```

---

## 配置WalletConnect（必需）

### 获取Project ID
1. 访问：https://cloud.walletconnect.com/
2. 注册/登录账号
3. 点击 "Create Project"
4. 项目名称：`IVY Predict`
5. 复制 Project ID

### 添加到Vercel
1. 在Vercel项目页面，点击 "Settings"
2. 点击 "Environment Variables"
3. 添加变量：
   - Name: `VITE_WALLETCONNECT_PROJECT_ID`
   - Value: `粘贴您的Project ID`
4. 点击 "Save"
5. 重新部署：点击 "Deployments" → 最新部署右侧的 "..." → "Redeploy"

---

## 自动部署（已配置）

每次推送代码到GitHub，Vercel会自动：
1. 检测新提交
2. 运行构建
3. 部署更新

推送代码流程：
```bash
# 修改代码后
git add .
git commit -m "描述您的更改"
git push
```

Vercel会在约2分钟内完成自动部署！

---

## 测试部署

访问您的Vercel URL并测试：

1. **连接钱包**
   - 点击右上角 "Connect Wallet"
   - 选择MetaMask或其他钱包
   - 切换到BSC Testnet (Chain ID: 97)

2. **浏览市场**
   - 首页显示所有市场（初始为空）
   - 点击 "Create Market" 创建测试市场

3. **创建市场**
   - 选择市场类型（Binary或Categorical）
   - 输入问题
   - 设置持续时间
   - 添加初始流动性（最少1.01 BNB = 0.01创建费 + 1流动性）
   - 点击 "Create Market"

4. **交易测试**
   - 点击市场卡片查看详情
   - 买入YES或NO代币
   - 查看实时赔率变化

---

## 常见问题

### Q: 页面显示空白？
**A**:
1. 检查浏览器控制台是否有错误
2. 确认已配置WalletConnect Project ID
3. 清除浏览器缓存重试

### Q: 无法连接钱包？
**A**:
1. 确认安装了MetaMask
2. 确认切换到BSC Testnet网络
3. 检查WalletConnect Project ID是否正确

### Q: 交易失败？
**A**:
1. 确认钱包有足够的BNB（测试网）
2. 确认网络是BSC Testnet (Chain ID: 97)
3. 查看MetaMask错误信息

### Q: 如何回滚部署？
**A**:
1. 在Vercel中点击 "Deployments"
2. 找到之前的成功部署
3. 点击 "..." → "Promote to Production"

---

## 监控和分析

Vercel提供实时监控：
- **Analytics**: 访问量、页面性能
- **Logs**: 构建和运行日志
- **Speed Insights**: 页面加载速度

访问：https://vercel.com/edwarddddddd-77/ivy-predict

---

## 自定义域名（可选）

1. 在Vercel项目中点击 "Settings" → "Domains"
2. 输入您的域名，例如：`predict.yourdomain.com`
3. 按照提示添加DNS记录：
   - Type: `CNAME`
   - Name: `predict`
   - Value: `cname.vercel-dns.com`
4. 等待DNS生效（可能需要几分钟到几小时）

---

## 生产环境检查清单

部署到生产环境前，确保：

- [x] 合约已部署到BSC测试网
- [ ] 合约已通过安全审计（主网前必需）
- [x] 前端合约地址已配置
- [ ] WalletConnect Project ID已配置
- [ ] 错误边界已添加
- [ ] 分析工具已集成（Google Analytics等）
- [ ] 用户反馈机制已建立
- [ ] 社区支持渠道已开放（Discord/Telegram）

---

## 有用的链接

- **Vercel文档**: https://vercel.com/docs
- **Vite部署指南**: https://vitejs.dev/guide/static-deploy.html
- **WalletConnect文档**: https://docs.walletconnect.com/
- **项目仓库**: https://github.com/edwarddddddd-77/ivy-predict
- **部署状态**: https://vercel.com/edwarddddddd-77/ivy-predict

---

🎉 **恭喜！您的预测市场平台已上线！**

现在您可以：
1. 分享URL给测试用户
2. 收集反馈
3. 迭代改进
4. 准备主网部署

每次更新代码后，只需 `git push`，Vercel会自动部署更新！
