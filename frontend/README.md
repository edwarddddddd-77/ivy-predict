# IVY Predict - Frontend

Frontend application for IVY Predict, a decentralized prediction market platform on BNB Chain.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Wagmi 2.0** - React hooks for Ethereum
- **Viem 2.0** - Ethereum interactions
- **RainbowKit** - Wallet connection UI
- **TanStack Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling

## Prerequisites

- Node.js 18+ and npm
- MetaMask or other Web3 wallet

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

### 1. Get WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy your Project ID

### 2. Update wagmi.config.ts

Replace `YOUR_PROJECT_ID` in `src/wagmi.config.ts`:

```typescript
export const config = getDefaultConfig({
  appName: 'IVY Predict',
  projectId: 'YOUR_PROJECT_ID_HERE', // Replace this
  chains: [bscTestnet, bsc],
  ssr: false,
});
```

### 3. Update Contract Addresses

After deploying smart contracts, update addresses in `src/contracts/addresses.ts`:

```typescript
export const CONTRACTS = {
  97: { // BSC Testnet
    FACTORY: '0xYourFactoryAddress',
    CHAINLINK_ADAPTER: '0xYourChainlinkAdapterAddress',
  },
};
```

## Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.tsx      # Navigation header
│   └── MarketCard.tsx  # Market display card
├── pages/              # Route pages
│   ├── HomePage.tsx            # Market browsing
│   ├── MarketDetailPage.tsx   # Market details & trading
│   ├── CreateMarketPage.tsx   # Create new markets
│   └── PortfolioPage.tsx      # User portfolio
├── contracts/          # Contract ABIs and addresses
│   ├── abis/          # Contract ABIs
│   └── addresses.ts   # Deployed addresses
├── wagmi.config.ts    # Wagmi configuration
├── main.tsx           # Application entry point
└── App.tsx            # Main app component
```

## Features

### Browse Markets
- View all active prediction markets
- See real-time odds and trading volumes
- Filter by status (Active, Resolved, etc.)

### Trade
- Buy outcome tokens with BNB
- Sell tokens back to the market
- View price impact and slippage

### Create Markets
- Create binary (YES/NO) markets
- Create categorical (multiple outcome) markets
- Set duration and initial liquidity
- Pay creation fee (0.01 BNB + liquidity)

### Portfolio
- View your active positions
- Track profit and loss
- Claim winnings from resolved markets

## Network Configuration

### BSC Testnet (Chain ID: 97)
- RPC: https://data-seed-prebsc-1-s1.binance.org:8545/
- Explorer: https://testnet.bscscan.com/
- Test BNB: https://testnet.bnbchain.org/faucet-smart

### BSC Mainnet (Chain ID: 56)
- RPC: https://bsc-dataseed.binance.org/
- Explorer: https://bscscan.com/

## Troubleshooting

### Wallet connection fails
- Make sure you have MetaMask or compatible wallet installed
- Check that you're on BSC Testnet or Mainnet
- Verify WalletConnect Project ID is set

### Transaction fails
- Ensure you have enough BNB for gas fees
- Check contract addresses are correct
- Verify market is in correct state (Active for trades)

### Page not loading
- Clear browser cache
- Check browser console for errors
- Verify all dependencies are installed

## Links

- [Smart Contracts](../contracts/)
- [Project Documentation](../README.md)
- [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart)
