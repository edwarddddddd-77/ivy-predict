import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { getContractAddress } from '../contracts/addresses';
import PriceMarketFactoryABI from '../contracts/abis/PriceMarketFactory.json';
import PriceMarketCard from '../components/PriceMarketCard';
import FaucetBanner from '../components/FaucetBanner';

export default function HomePage() {
  const { t } = useTranslation();
  const { chain } = useAccount();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  // Read total market count from PriceMarketFactory
  const { data: marketCount } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'PRICE_MARKET_FACTORY') as `0x${string}` : undefined,
    abi: PriceMarketFactoryABI.abi,
    functionName: 'getMarketCount',
  });

  // Read markets from PriceMarketFactory
  const { data: markets } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'PRICE_MARKET_FACTORY') as `0x${string}` : undefined,
    abi: PriceMarketFactoryABI.abi,
    functionName: 'getMarkets',
    args: [0n, marketCount || 10n],
  }) as { data: string[] | undefined };

  return (
    <div className="min-h-screen geometric-pattern">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-20 mb-16">
        {/* Prism glow blob - positioned behind text */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#005F6B] rounded-full blur-3xl opacity-30 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#00C9A7] rounded-full blur-3xl opacity-20"></div>

        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <h1 className="font-display text-7xl font-black mb-6 leading-tight">
            <span className="text-white">⚡ Predict </span>
            <span className="glow-text-cyan">Crypto Prices</span>
            <span className="text-white"> in </span>
            <span className="glow-text-cyan">Minutes</span>
          </h1>
          <p className="text-xl text-[#8A9BA8] mb-10 max-w-2xl leading-relaxed">
            Ultra-short-term price prediction markets. Trade UP/DOWN on BTC, ETH, BNB in 1-24 hours. Instant settlement via Chainlink oracles.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 mb-16">
            <a
              href="/quick"
              className="px-8 py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              ⚡ Quick Trade
            </a>
            <a
              href="/portfolio"
              className="px-8 py-4 border-2 border-[#00C9A7]/50 text-[#00C9A7] font-semibold rounded-lg hover:bg-[#00C9A7]/10 transition-all duration-300"
            >
              💼 My Portfolio
            </a>
          </div>

          {/* Stats - Glass Cards */}
          <div className="grid grid-cols-3 gap-6 max-w-4xl">
            <div className="glass-card rounded-xl p-6">
              <div className="font-mono text-4xl font-bold glow-text-cyan mb-2">
                {marketCount?.toString() || '0'}
              </div>
              <div className="text-sm text-[#8A9BA8]">{t('home.stats_markets')}</div>
            </div>
            <div className="glass-card rounded-xl p-6">
              <div className="font-mono text-4xl font-bold glow-text-cyan mb-2">$0</div>
              <div className="text-sm text-[#8A9BA8]">{t('home.stats_volume')}</div>
            </div>
            <div className="glass-card rounded-xl p-6">
              <div className="font-mono text-4xl font-bold glow-text-cyan mb-2">0</div>
              <div className="text-sm text-[#8A9BA8]">{t('home.stats_traders')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Test USDT Faucet Banner (TESTNET ONLY) */}
      <div className="max-w-7xl mx-auto px-6">
        <FaucetBanner />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-8 px-6 max-w-7xl mx-auto">
        <h3 className="font-display text-3xl font-bold text-white">{t('home.title')}</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
              filter === 'all'
                ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white'
                : 'border border-white/10 text-[#8A9BA8] hover:text-[#00C9A7] hover:border-[#00C9A7]/50'
            }`}
          >
            {t('home.filter_all')}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
              filter === 'active'
                ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white'
                : 'border border-white/10 text-[#8A9BA8] hover:text-[#00C9A7] hover:border-[#00C9A7]/50'
            }`}
          >
            {t('home.filter_active')}
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
              filter === 'resolved'
                ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white'
                : 'border border-white/10 text-[#8A9BA8] hover:text-[#00C9A7] hover:border-[#00C9A7]/50'
            }`}
          >
            {t('home.filter_resolved')}
          </button>
        </div>
      </div>

      {/* Markets Grid */}
      <div className="max-w-7xl mx-auto px-6">
        {!chain ? (
          <div className="text-center py-20 glass-card rounded-2xl">
            <div className="text-7xl mb-6">🔗</div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">
              {t('home.connect_wallet')}
            </h3>
            <p className="text-[#8A9BA8] text-lg">
              {t('home.connect_message')}
            </p>
          </div>
        ) : markets && markets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((marketAddress) => (
              <PriceMarketCard key={marketAddress} address={marketAddress} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass-card rounded-2xl">
            <div className="text-7xl mb-6">📊</div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">
              {t('home.no_markets')}
            </h3>
            <p className="text-[#8A9BA8] text-lg mb-6">
              {t('home.no_markets_message')}
            </p>
            <a
              href="/quick"
              className="inline-block px-8 py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              ⚡ Create First Market
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
