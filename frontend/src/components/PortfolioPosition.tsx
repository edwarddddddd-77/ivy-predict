import { Link } from 'react-router-dom';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import PriceMarketABI from '../contracts/abis/PricePredictionMarket.json';

interface PortfolioPositionProps {
  marketAddress: string;
  userAddress: string;
}

// Asset configurations
const ASSETS: Record<string, { icon: string; color: string }> = {
  'BTC/USD': { icon: '₿', color: 'from-orange-500 to-yellow-600' },
  'ETH/USD': { icon: 'Ξ', color: 'from-purple-500 to-indigo-600' },
  'BNB/USD': { icon: '◆', color: 'from-yellow-400 to-amber-500' },
};

export default function PortfolioPosition({ marketAddress, userAddress }: PortfolioPositionProps) {
  // Read market data
  const { data: assetSymbol } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'assetSymbol',
  });

  const { data: isSettled } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'isSettled',
  });

  const { data: userSharesUP } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'getUserShares',
    args: [userAddress as `0x${string}`, 0n],
  });

  const { data: userSharesDOWN } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'getUserShares',
    args: [userAddress as `0x${string}`, 1n],
  });

  const { data: endTime } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'endTime',
  });

  // Skip if no positions
  const hasUP = userSharesUP && Number(userSharesUP) > 0;
  const hasDOWN = userSharesDOWN && Number(userSharesDOWN) > 0;

  if (!hasUP && !hasDOWN) {
    return null;
  }

  const asset = ASSETS[String(assetSymbol)] || { icon: '?', color: 'from-gray-500 to-gray-600' };
  const settled = Boolean(isSettled);
  const now = Math.floor(Date.now() / 1000);
  const isActive = now < Number(endTime) && !settled;

  return (
    <Link
      to={`/price-market/${marketAddress}`}
      className="glass-card rounded-xl p-6 block hover:border-[#00C9A7]/50 transition-all"
    >
      <div className="flex items-center justify-between">
        {/* Left: Market Info */}
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${asset.color} flex items-center justify-center text-2xl text-white font-bold shadow-lg`}
          >
            {asset.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{String(assetSymbol)}</h3>
            <p className="text-sm text-[#8A9BA8]">
              {isActive ? '🟢 Active' : settled ? '✅ Settled' : '⏳ Locked'}
            </p>
          </div>
        </div>

        {/* Right: Positions */}
        <div className="flex items-center gap-6">
          {Boolean(hasUP && userSharesUP && typeof userSharesUP === 'bigint') && (
            <div className="text-right">
              <div className="text-xs text-[#8A9BA8] mb-1">📈 UP Shares</div>
              <div className="text-lg font-bold text-green-400">
                {formatEther(userSharesUP as bigint)}
              </div>
            </div>
          )}
          {Boolean(hasDOWN && userSharesDOWN && typeof userSharesDOWN === 'bigint') && (
            <div className="text-right">
              <div className="text-xs text-[#8A9BA8] mb-1">📉 DOWN Shares</div>
              <div className="text-lg font-bold text-red-400">
                {formatEther(userSharesDOWN as bigint)}
              </div>
            </div>
          )}
          <div className="text-[#00C9A7]">→</div>
        </div>
      </div>
    </Link>
  );
}
