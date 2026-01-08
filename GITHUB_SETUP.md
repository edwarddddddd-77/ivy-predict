# GitHub 和 Vercel 部署指南

## 方法1：使用GitHub Desktop（推荐，最简单）

### 步骤1：安装GitHub Desktop
1. 下载：https://desktop.github.com/
2. 安装并登录您的GitHub账号

### 步骤2：发布仓库
1. 打开GitHub Desktop
2. 点击 "File" → "Add Local Repository"
3. 选择文件夹：`C:\Users\Administrator\ivy-predict`
4. 点击 "Add Repository"
5. 点击 "Publish repository"
6. 仓库名称：`ivy-predict`
7. 描述：`IVY Predict - Decentralized Prediction Market Platform`
8. 取消勾选 "Keep this code private"（公开仓库）
9. 点击 "Publish Repository"

✅ 完成！代码已推送到GitHub

---

## 方法2：使用命令行

### 步骤1：在GitHub网站上创建仓库
1. 访问：https://github.com/new
2. 仓库名称：`ivy-predict`
3. 描述：`IVY Predict - Decentralized Prediction Market Platform on BNB Chain`
4. 选择 **Public**
5. **不要**勾选任何初始化选项
6. 点击 "Create repository"

### 步骤2：推送代码
打开Git Bash或命令行，执行：

```bash
cd /c/Users/Administrator/ivy-predict

# 方式A：使用个人访问令牌
git remote set-url origin https://github.com/edwarddddddd-77/ivy-predict.git
git push -u origin main
# 当提示输入密码时，粘贴您的Personal Access Token

# 方式B：或者使用SSH（需要先配置SSH密钥）
# git remote set-url origin git@github.com:edwarddddddd-77/ivy-predict.git
# git push -u origin main
```

---

## Vercel 部署步骤

### 步骤1：连接GitHub仓库到Vercel
1. 访问：https://vercel.com/
2. 使用GitHub账号登录
3. 点击 "Add New" → "Project"
4. 导入 `ivy-predict` 仓库
5. 点击 "Import"

### 步骤2：配置项目设置
在 "Configure Project" 页面：

**Framework Preset**: 选择 `Vite`

**Root Directory**: 点击 "Edit"，输入 `frontend`

**Build Settings**:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Environment Variables**（环境变量）:
点击 "Environment Variables"，添加：

| Name | Value |
|------|-------|
| `VITE_WALLETCONNECT_PROJECT_ID` | `your_walletconnect_project_id` |

> 获取WalletConnect Project ID：https://cloud.walletconnect.com/

### 步骤3：部署
1. 点击 "Deploy"
2. 等待构建完成（约2-3分钟）
3. 部署成功后会获得一个URL，例如：`https://ivy-predict.vercel.app`

### 步骤4：配置自定义域名（可选）
1. 在项目设置中，点击 "Domains"
2. 添加您的自定义域名
3. 按照提示配置DNS记录

---

## 自动部署

✅ **配置完成后，每次推送代码到GitHub，Vercel会自动部署！**

推送代码：
```bash
git add .
git commit -m "更新说明"
git push
```

Vercel会自动：
1. 检测到新提交
2. 运行构建
3. 部署到生产环境

---

## 故障排查

### 问题1：推送代码时要求输入用户名和密码
**解决**：
1. 不要输入GitHub密码
2. 用户名：输入您的GitHub用户名 `edwarddddddd-77`
3. 密码：粘贴您的Personal Access Token（不是密码！）

### 问题2：Vercel构建失败
**检查**：
1. Root Directory 是否设置为 `frontend`
2. Node.js版本是否正确（建议18.x或20.x）
3. 查看构建日志中的错误信息

### 问题3：部署成功但页面显示空白
**检查**：
1. 浏览器控制台是否有错误
2. 是否配置了WalletConnect Project ID
3. 合约地址是否正确

---

## 有用的链接

- GitHub仓库：https://github.com/edwarddddddd-77/ivy-predict（创建后）
- Vercel项目：https://vercel.com/dashboard（部署后）
- WalletConnect Cloud：https://cloud.walletconnect.com/
- BSC测试网水龙头：https://testnet.bnbchain.org/faucet-smart
- Chainlink LINK水龙头：https://faucets.chain.link/bnb-chain-testnet

---

## 下一步

部署完成后，您可以：
1. 访问部署的网站测试功能
2. 创建测试市场
3. 邀请用户测试
4. 收集反馈并迭代改进

每次修改代码后，只需：
```bash
git add .
git commit -m "描述您的更改"
git push
```

Vercel会自动重新部署！🚀
