import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { getContractAddress } from '../contracts/addresses';
import FactoryABI from '../contracts/abis/PredictionMarketFactory.json';
import MarketCard from '../components/MarketCard';

export default function HomePage() {
  const { t } = useTranslation();
  const { chain } = useAccount();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  // Read total market count
  const { data: marketCount } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'FACTORY') as `0x${string}` : undefined,
    abi: FactoryABI.abi,
    functionName: 'getMarketCount',
  });

  // Read markets
  const { data: markets } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'FACTORY') as `0x${string}` : undefined,
    abi: FactoryABI.abi,
    functionName: 'getMarkets',
    args: [0n, marketCount || 10n],
  }) as { data: string[] | undefined };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden geometric-pattern border border-energy-cyan/20 rounded-3xl p-12 mb-12">
        {/* Prism glow effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-energy-cyan/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-fintech-teal/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-4xl">
          <h1 className="font-display text-6xl font-extrabold mb-6 bg-gradient-to-r from-white via-energy-bright to-energy-cyan bg-clip-text text-transparent">
            {t('home.hero_title')}
          </h1>
          <p className="text-xl text-data-grey-light mb-8 max-w-2xl">
            {t('home.hero_subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 mb-12">
            <a
              href="/create"
              className="px-8 py-4 bg-brand-gradient text-white font-semibold rounded-lg shadow-glow-cyan hover:shadow-glow-cyan-lg transition-all duration-300 transform hover:scale-105"
            >
              {t('home.create_market')}
            </a>
            <button className="px-8 py-4 border-2 border-energy-cyan/50 text-energy-cyan font-semibold rounded-lg hover:bg-energy-cyan/10 transition-all duration-300">
              {t('home.learn_more')}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl">
            <div className="bg-prism-deep/50 backdrop-blur-sm border border-energy-cyan/30 rounded-xl p-6 hover:border-energy-bright/50 transition-all duration-300">
              <div className="font-mono text-4xl font-bold text-energy-bright glow-text mb-2">
                {marketCount?.toString() || '0'}
              </div>
              <div className="text-sm text-data-grey">{t('home.stats_markets')}</div>
            </div>
            <div className="bg-prism-deep/50 backdrop-blur-sm border border-energy-cyan/30 rounded-xl p-6 hover:border-energy-bright/50 transition-all duration-300">
              <div className="font-mono text-4xl font-bold text-energy-bright glow-text mb-2">$0</div>
              <div className="text-sm text-data-grey">{t('home.stats_volume')}</div>
            </div>
            <div className="bg-prism-deep/50 backdrop-blur-sm border border-energy-cyan/30 rounded-xl p-6 hover:border-energy-bright/50 transition-all duration-300">
              <div className="font-mono text-4xl font-bold text-energy-bright glow-text mb-2">0</div>
              <div className="text-sm text-data-grey">{t('home.stats_traders')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-display text-3xl font-bold text-white">{t('home.title')}</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
              filter === 'all'
                ? 'bg-brand-gradient text-white shadow-glow-cyan'
                : 'bg-prism-deep/50 border border-energy-cyan/30 text-data-grey-light hover:text-energy-cyan hover:border-energy-cyan/50'
            }`}
          >
            {t('home.filter_all')}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
              filter === 'active'
                ? 'bg-brand-gradient text-white shadow-glow-cyan'
                : 'bg-prism-deep/50 border border-energy-cyan/30 text-data-grey-light hover:text-energy-cyan hover:border-energy-cyan/50'
            }`}
          >
            {t('home.filter_active')}
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
              filter === 'resolved'
                ? 'bg-brand-gradient text-white shadow-glow-cyan'
                : 'bg-prism-deep/50 border border-energy-cyan/30 text-data-grey-light hover:text-energy-cyan hover:border-energy-cyan/50'
            }`}
          >
            {t('home.filter_resolved')}
          </button>
        </div>
      </div>

      {/* Markets Grid */}
      {!chain ? (
        <div className="text-center py-20 bg-prism-deep/30 border border-energy-cyan/20 rounded-2xl">
          <div className="text-7xl mb-6">🔗</div>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            {t('home.connect_wallet')}
          </h3>
          <p className="text-data-grey-light text-lg">
            {t('home.connect_message')}
          </p>
        </div>
      ) : markets && markets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((marketAddress) => (
            <MarketCard key={marketAddress} address={marketAddress} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-prism-deep/30 border border-energy-cyan/20 rounded-2xl">
          <div className="text-7xl mb-6">📊</div>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            {t('home.no_markets')}
          </h3>
          <p className="text-data-grey-light text-lg mb-6">
            {t('home.no_markets_message')}
          </p>
          <a
            href="/create"
            className="inline-block px-8 py-4 bg-brand-gradient text-white font-semibold rounded-lg shadow-glow-cyan hover:shadow-glow-cyan-lg transition-all duration-300 transform hover:scale-105"
          >
            {t('home.create_market')}
          </a>
        </div>
      )}
    </div>
  );
}
