// Contract addresses - Deployed on 2026-01-09
export const CONTRACTS = {
  // BSC Testnet
  97: {
    FACTORY: '0x8fd3c246AA277435781bbcDF60Efc6Bd55f46c68',
    CHAINLINK_ADAPTER: '0x0cC60D6A782Ae5c312f4075C8E8e42E50E3d88AA',
  },
  // BSC Mainnet
  56: {
    FACTORY: '0x0000000000000000000000000000000000000000',
    CHAINLINK_ADAPTER: '0x0000000000000000000000000000000000000000',
  },
};

export function getContractAddress(chainId: number, contract: 'FACTORY' | 'CHAINLINK_ADAPTER') {
  const addresses = CONTRACTS[chainId as keyof typeof CONTRACTS];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return addresses[contract];
}
