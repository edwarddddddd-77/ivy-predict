import { Link } from 'react-router-dom';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { format } from 'date-fns';
import MarketABI from '../contracts/abis/PredictionMarket.json';

interface MarketCardProps {
  address: string;
}

export default function MarketCard({ address }: MarketCardProps) {
  // Read market info
  const { data: marketInfo } = useReadContract({
    address: address as `0x${string}`,
    abi: MarketABI.abi,
    functionName: 'getMarketInfo',
  });

  // Read YES price
  const { data: yesPrice } = useReadContract({
    address: address as `0x${string}`,
    abi: MarketABI.abi,
    functionName: 'getPrice',
    args: [0n],
  });

  if (!marketInfo) {
    return (
      <div className="glass-card rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-4"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
      </div>
    );
  }

  const info = marketInfo as any;
  const state = ['Active', 'Locked', 'Resolved', 'Disputed', 'Cancelled'][info.state];
  const yesProb = yesPrice ? Number(formatEther(yesPrice as bigint)) * 100 : 50;
  const noProb = 100 - yesProb;

  return (
    <Link
      to={`/market/${address}`}
      className="glass-card rounded-xl p-6 block transition-all duration-300 hover:scale-[1.02] hover:border-[#00C9A7]/50"
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            state === 'Active'
              ? 'bg-[#00C9A7]/20 text-[#00C9A7] border border-[#00C9A7]/30'
              : state === 'Resolved'
              ? 'bg-[#005F6B]/20 text-[#00C9A7] border border-[#005F6B]/30'
              : 'bg-white/10 text-[#8A9BA8] border border-white/20'
          }`}
        >
          {state}
        </span>
        <span className="text-xs text-[#8A9BA8]">
          Ends {format(new Date(Number(info.endTime) * 1000), 'MMM d')}
        </span>
      </div>

      {/* Question */}
      <h3 className="text-lg font-semibold text-white mb-4 line-clamp-2">
        {info.question}
      </h3>

      {/* Probabilities */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[#8A9BA8]">YES</span>
          <span className="font-bold text-[#00C9A7]">{yesProb.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[#00C9A7] to-[#005F6B] h-2 rounded-full transition-all"
            style={{ width: `${yesProb}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-[#8A9BA8]">NO</span>
          <span className="font-bold text-red-400">{noProb.toFixed(1)}%</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-between text-sm text-[#8A9BA8] pt-4 border-t border-white/10">
        <span>Volume</span>
        <span className="font-medium text-white">{formatEther(info.totalVolume)} BNB</span>
      </div>
    </Link>
  );
}
