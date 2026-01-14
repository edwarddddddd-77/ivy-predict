import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { getContractAddress } from '../contracts/addresses';
import PriceMarketFactoryABI from '../contracts/abis/PriceMarketFactory.json';
import USDTPriceMarketFactoryABI from '../contracts/abis/USDTPriceMarketFactory.json';
import PriceMarketCard from '../components/PriceMarketCard';
import FaucetBanner from '../components/FaucetBanner';

export default function HomePage() {
  const { t } = useTranslation();
  const { chain } = useAccount();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [paymentType, setPaymentType] = useState<'USDT' | 'BNB'>('USDT');

  // Read USDT market count
  const { data: usdtMarketCount } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'USDT_PRICE_MARKET_FACTORY') as `0x${string}` : undefined,
    abi: USDTPriceMarketFactoryABI.abi,
    functionName: 'getMarketCount',
  });

  // Read USDT markets
  const { data: usdtMarkets } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'USDT_PRICE_MARKET_FACTORY') as `0x${string}` : undefined,
    abi: USDTPriceMarketFactoryABI.abi,
    functionName: 'getMarkets',
    args: [0n, usdtMarketCount || 10n],
  }) as { data: string[] | undefined };

  // Read BNB market count
  const { data: bnbMarketCount } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'PRICE_MARKET_FACTORY') as `0x${string}` : undefined,
    abi: PriceMarketFactoryABI.abi,
    functionName: 'getMarketCount',
  });

  // Read BNB markets
  const { data: bnbMarkets } = useReadContract({
    address: chain?.id ? getContractAddress(chain.id, 'PRICE_MARKET_FACTORY') as `0x${string}` : undefined,
    abi: PriceMarketFactoryABI.abi,
    functionName: 'getMarkets',
    args: [0n, bnbMarketCount || 10n],
  }) as { data: string[] | undefined };

  // Select markets based on payment type
  const markets = paymentType === 'USDT' ? usdtMarkets : bnbMarkets;
  const marketCount = paymentType === 'USDT' ? usdtMarketCount : bnbMarketCount;

  return (
    <div className="min-h-screen geometric-pattern">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-10 md:py-16 lg:py-20 mb-8 md:mb-12 lg:mb-16">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#005F6B] rounded-full blur-3xl opacity-30 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-[#00C9A7] rounded-full blur-3xl opacity-20"></div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6">
          {/* Hero Title - Responsive */}
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-4 md:mb-6 leading-tight">
            <span className="text-white">⚡ </span>
            <span className="glow-text-cyan">Predict</span>
            <span className="text-white"> Crypto </span>
            <span className="glow-text-cyan">Prices</span>
            <br className="hidden sm:block" />
            <span className="text-white"> in </span>
            <span className="glow-text-cyan">Minutes</span>
          </h1>

          <p className="text-base md:text-lg lg:text-xl text-[#8A9BA8] mb-6 md:mb-10 max-w-2xl leading-relaxed">
            Ultra-short-term price prediction markets. Trade UP/DOWN on BTC, ETH, BNB in 1-24 hours. Instant settlement via Chainlink oracles.
          </p>

          {/* CTA Buttons - Stack on mobile */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-10 md:mb-16">
            <a
              href="/quick"
              className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg text-center"
            >
              ⚡ Quick Trade
            </a>
            <a
              href="/portfolio"
              className="px-6 md:px-8 py-3 md:py-4 border-2 border-[#00C9A7]/50 text-[#00C9A7] font-semibold rounded-lg hover:bg-[#00C9A7]/10 transition-all duration-300 text-center"
            >
              💼 My Portfolio
            </a>
          </div>

          {/* Stats - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl">
            <div className="glass-card rounded-xl p-4 md:p-6">
              <div className="font-mono text-2xl md:text-3xl lg:text-4xl font-bold glow-text-cyan mb-1 md:mb-2">
                {marketCount?.toString() || '0'}
              </div>
              <div className="text-xs md:text-sm text-[#8A9BA8]">{t('home.stats_markets')}</div>
            </div>
            <div className="glass-card rounded-xl p-4 md:p-6">
              <div className="font-mono text-2xl md:text-3xl lg:text-4xl font-bold glow-text-cyan mb-1 md:mb-2">$0</div>
              <div className="text-xs md:text-sm text-[#8A9BA8]">{t('home.stats_volume')}</div>
            </div>
            <div className="glass-card rounded-xl p-4 md:p-6">
              <div className="font-mono text-2xl md:text-3xl lg:text-4xl font-bold glow-text-cyan mb-1 md:mb-2">0</div>
              <div className="text-xs md:text-sm text-[#8A9BA8]">{t('home.stats_traders')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Test USDT Faucet Banner */}
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <FaucetBanner />
      </div>

      {/* Payment Type & Filters - Responsive */}
      <div className="mb-6 md:mb-8 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
            <h3 className="font-display text-2xl md:text-3xl font-bold text-white">{t('home.title')}</h3>

            {/* Payment Type Toggle */}
            <div className="flex gap-2 bg-[#0A2342]/60 rounded-lg p-1 w-fit">
              <button
                onClick={() => setPaymentType('USDT')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                  paymentType === 'USDT'
                    ? 'bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white shadow-lg'
                    : 'text-[#8A9BA8] hover:text-white'
                }`}
              >
                💵 USDT
              </button>
              <button
                onClick={() => setPaymentType('BNB')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                  paymentType === 'BNB'
                    ? 'bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white shadow-lg'
                    : 'text-[#8A9BA8] hover:text-white'
                }`}
              >
                ⚡ BNB
              </button>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 md:gap-3 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white'
                  : 'border border-white/10 text-[#8A9BA8] hover:text-[#00C9A7] hover:border-[#00C9A7]/50'
              }`}
            >
              {t('home.filter_all')}
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                filter === 'active'
                  ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white'
                  : 'border border-white/10 text-[#8A9BA8] hover:text-[#00C9A7] hover:border-[#00C9A7]/50'
              }`}
            >
              {t('home.filter_active')}
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                filter === 'resolved'
                  ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white'
                  : 'border border-white/10 text-[#8A9BA8] hover:text-[#00C9A7] hover:border-[#00C9A7]/50'
              }`}
            >
              {t('home.filter_resolved')}
            </button>
          </div>
        </div>
      </div>

      {/* Markets Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-10">
        {!chain ? (
          <div className="text-center py-12 md:py-20 glass-card rounded-2xl">
            <div className="text-5xl md:text-7xl mb-4 md:mb-6">🔗</div>
            <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">
              {t('home.connect_wallet')}
            </h3>
            <p className="text-[#8A9BA8] text-base md:text-lg px-4">
              {t('home.connect_message')}
            </p>
          </div>
        ) : markets && markets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {markets.map((marketAddress) => (
              <PriceMarketCard key={marketAddress} address={marketAddress} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 md:py-20 glass-card rounded-2xl">
            <div className="text-5xl md:text-7xl mb-4 md:mb-6">📊</div>
            <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">
              {t('home.no_markets')}
            </h3>
            <p className="text-[#8A9BA8] text-base md:text-lg mb-4 md:mb-6 px-4">
              {t('home.no_markets_message')}
            </p>
            <a
              href="/quick"
              className="inline-block px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              ⚡ Create First Market
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
