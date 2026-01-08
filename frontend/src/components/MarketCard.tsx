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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 block"
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            state === 'Active'
              ? 'bg-green-100 text-green-800'
              : state === 'Resolved'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {state}
        </span>
        <span className="text-xs text-gray-500">
          Ends {format(new Date(Number(info.endTime) * 1000), 'MMM d')}
        </span>
      </div>

      {/* Question */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4 line-clamp-2">
        {info.question}
      </h3>

      {/* Probabilities */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">YES</span>
          <span className="font-bold text-green-600">{yesProb.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${yesProb}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">NO</span>
          <span className="font-bold text-red-600">{noProb.toFixed(1)}%</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-100">
        <span>Volume</span>
        <span className="font-medium">{formatEther(info.totalVolume)} BNB</span>
      </div>
    </Link>
  );
}
