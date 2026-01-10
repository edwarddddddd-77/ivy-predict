import { Link } from 'react-router-dom';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PriceMarketABI from '../contracts/abis/PricePredictionMarket.json';

interface PriceMarketCardProps {
  address: string;
}

// Asset configurations
const ASSETS: Record<string, { icon: string; color: string; name: string }> = {
  'BTC/USD': { icon: '₿', color: 'from-orange-500 to-yellow-600', name: 'Bitcoin' },
  'ETH/USD': { icon: 'Ξ', color: 'from-purple-500 to-indigo-600', name: 'Ethereum' },
  'BNB/USD': { icon: '◆', color: 'from-yellow-400 to-amber-500', name: 'BNB Chain' },
};

const DURATION_LABELS: Record<number, string> = {
  0: '1H',
  1: '4H',
  2: '24H',
};

export default function PriceMarketCard({ address }: PriceMarketCardProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Read market data
  const { data: assetSymbol } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'assetSymbol',
  });

  const { data: duration } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'duration',
  });

  const { data: endTime } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'endTime',
  });

  const { data: startPrice } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'startPrice',
  });

  const { data: isSettled } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'isSettled',
  });

  const { data: totalVolume } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'totalVolume',
  });

  const { data: priceUP } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'getPrice',
    args: [0n],
  });

  const { data: priceDOWN } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'getPrice',
    args: [1n],
  });

  // Countdown timer
  useEffect(() => {
    if (!endTime) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Number(endTime) - now;

      if (remaining <= 0) {
        setTimeLeft(t('common.ended'));
        return;
      }

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endTime, t]);

  if (!assetSymbol || !duration) {
    return (
      <div className="glass-card rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-4"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
      </div>
    );
  }

  const asset = ASSETS[String(assetSymbol)] || {
    icon: '?',
    color: 'from-gray-500 to-gray-600',
    name: String(assetSymbol),
  };

  const durationLabel = DURATION_LABELS[Number(duration)] || 'Unknown';
  const now = Math.floor(Date.now() / 1000);
  const isActive = now < Number(endTime) && !isSettled;
  const settled = Boolean(isSettled);

  // Calculate probabilities
  const probUP = priceUP ? Number(formatEther(priceUP as bigint)) * 100 : 50;
  const probDOWN = priceDOWN ? Number(formatEther(priceDOWN as bigint)) * 100 : 50;

  // Format start price
  const startPriceFormatted = startPrice
    ? `$${(Number(startPrice) / 1e8).toFixed(2)}`
    : t('priceMarket.not_recorded');

  return (
    <Link
      to={`/price-market/${address}`}
      className="glass-card rounded-xl p-6 block transition-all duration-300 hover:scale-[1.02] hover:border-[#00C9A7]/50"
    >
      {/* Header: Icon + Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${asset.color} flex items-center justify-center text-2xl text-white font-bold shadow-lg`}
          >
            {asset.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{String(assetSymbol)}</h3>
            <p className="text-xs text-[#8A9BA8]">{durationLabel} {t('priceMarket.prediction_suffix')}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : settled
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}
        >
          {isActive ? `🟢 ${t('priceMarket.status_live')}` : settled ? `✅ ${t('priceMarket.status_settled')}` : `⏳ ${t('priceMarket.status_locked')}`}
        </span>
      </div>

      {/* Countdown / Start Price */}
      <div className="mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#8A9BA8]">
            {isActive ? t('priceMarket.time_left') : t('priceMarket.start_price')}
          </span>
          <span className="font-bold text-white">
            {isActive ? timeLeft : startPriceFormatted}
          </span>
        </div>
      </div>

      {/* UP/DOWN Probabilities */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <span className="font-medium text-white">{t('common.up')}</span>
          </div>
          <span className="font-bold text-green-400 text-lg">
            {probUP.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all"
            style={{ width: `${probUP}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📉</span>
            <span className="font-medium text-white">{t('common.down')}</span>
          </div>
          <span className="font-bold text-red-400 text-lg">
            {probDOWN.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-red-400 to-red-500 h-2 rounded-full transition-all"
            style={{ width: `${probDOWN}%` }}
          ></div>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-between text-sm text-[#8A9BA8] pt-4 border-t border-white/10">
        <span>{t('priceMarket.volume')}</span>
        <span className="font-medium text-[#00C9A7]">
          {totalVolume ? formatEther(totalVolume as bigint) : '0'} BNB
        </span>
      </div>
    </Link>
  );
}
