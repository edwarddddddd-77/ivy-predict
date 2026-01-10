// Contract addresses - Last deployed: 2026-01-09
export const CONTRACTS = {
  // BSC Testnet
  97: {
    // Original prediction market factory (long-term markets)
    FACTORY: '0x8fd3c246AA277435781bbcDF60Efc6Bd55f46c68',
    CHAINLINK_ADAPTER: '0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA',

    // Ultra-short-term price prediction market factory (NEW - deployed 2026-01-09)
    PRICE_MARKET_FACTORY: '0x8820b123aC0174d65C7b29CFEeED7f671EA672A0',

    // First test market (BTC 1-hour)
    TEST_MARKET_BTC_1H: '0x183AcDD93B599405c520CF28cF96c6Ad6f54b820',

    // Test USDT Faucet (TESTNET ONLY - deployed 2026-01-11)
    MOCK_USDT: '0x846314aA0461E7ae9F1B69F52A565ad8A335E72b',
    USDT_FAUCET: '0x2fb19570EC97b8Be0CfE390765ab1DaD4a3BeD99',
  },
  // BSC Mainnet
  56: {
    FACTORY: '0x0000000000000000000000000000000000000000',
    CHAINLINK_ADAPTER: '0x0000000000000000000000000000000000000000',
    PRICE_MARKET_FACTORY: '0x0000000000000000000000000000000000000000',
    TEST_MARKET_BTC_1H: '0x0000000000000000000000000000000000000000',
    MOCK_USDT: '0x0000000000000000000000000000000000000000', // Not used on mainnet
    USDT_FAUCET: '0x0000000000000000000000000000000000000000', // Not used on mainnet
  },
};

// Chainlink Price Feeds (BSC Testnet)
export const PRICE_FEEDS = {
  97: {
    'BTC/USD': '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
    'ETH/USD': '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
    'BNB/USD': '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
    'USDT/USD': '0xEca2605f0BCF2BA5966372C99837b1F182d3D620',
    'LINK/USD': '0x1B329402Cb1825C6F30A0d92aB9E2862BE47333f',
    'DAI/USD': '0xE4eE17114774713d2De0eC0f035d4F7665fc025D',
  },
  56: {
    'BTC/USD': '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
    'ETH/USD': '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
    'BNB/USD': '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
  },
};

export function getContractAddress(
  chainId: number,
  contract: 'FACTORY' | 'CHAINLINK_ADAPTER' | 'PRICE_MARKET_FACTORY' | 'TEST_MARKET_BTC_1H' | 'MOCK_USDT' | 'USDT_FAUCET'
) {
  const addresses = CONTRACTS[chainId as keyof typeof CONTRACTS];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return addresses[contract];
}

export function getPriceFeed(chainId: number, symbol: string) {
  const feeds = PRICE_FEEDS[chainId as keyof typeof PRICE_FEEDS];
  if (!feeds) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return feeds[symbol as keyof typeof feeds];
}
