import { useAccount, useReadContract } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { getContractAddress } from '../contracts/addresses';
import PriceMarketFactoryABI from '../contracts/abis/PriceMarketFactory.json';
import PortfolioPosition from '../components/PortfolioPosition';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { address: userAddress, chain } = useAccount();

  // Read all markets from PriceMarketFactory
  const { data: marketCount } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'PRICE_MARKET_FACTORY') as `0x${string}` : undefined,
    abi: PriceMarketFactoryABI.abi,
    functionName: 'getMarketCount',
  });

  const { data: markets } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'PRICE_MARKET_FACTORY') as `0x${string}` : undefined,
    abi: PriceMarketFactoryABI.abi,
    functionName: 'getMarkets',
    args: [0n, marketCount || 10n],
  }) as { data: string[] | undefined };

  if (!userAddress) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 glass-card rounded-2xl">
        <div className="text-7xl mb-6">💼</div>
        <h2 className="font-display text-2xl font-bold text-white mb-4">{t('portfolio.connect_title')}</h2>
        <p className="text-[#8A9BA8] text-lg">{t('portfolio.connect_message')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6">
      <h1 className="font-display text-4xl font-bold text-white mb-8">💼 My Portfolio</h1>

      {/* TODO: Add summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card rounded-xl p-6">
          <div className="text-sm text-[#8A9BA8] mb-2">Total Positions</div>
          <div className="font-mono text-3xl font-bold text-white">
            {markets?.length || 0}
          </div>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="text-sm text-[#8A9BA8] mb-2">Active Markets</div>
          <div className="font-mono text-3xl font-bold text-white">-</div>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="text-sm text-[#8A9BA8] mb-2">Total Value</div>
          <div className="font-mono text-3xl font-bold text-white">- BNB</div>
        </div>
      </div>

      {/* Positions List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="font-display text-2xl font-bold text-white">Your Positions</h2>
        </div>
        <div className="p-6">
          {!chain ? (
            <div className="text-center py-20">
              <div className="text-7xl mb-6">🔗</div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">Connect Wallet</h3>
              <p className="text-[#8A9BA8] text-lg">Please connect your wallet to view positions</p>
            </div>
          ) : markets && markets.length > 0 ? (
            <div className="space-y-4">
              {markets.map((marketAddress) => (
                <PortfolioPosition
                  key={marketAddress}
                  marketAddress={marketAddress}
                  userAddress={userAddress}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-7xl mb-6">📊</div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">No Positions</h3>
              <p className="text-[#8A9BA8] text-lg mb-8">
                Start trading to see your positions here
              </p>
              <a
                href="/quick"
                className="inline-block px-8 py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                ⚡ Quick Trade
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
