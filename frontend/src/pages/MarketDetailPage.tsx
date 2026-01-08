import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { format } from 'date-fns';
import MarketABI from '../contracts/abis/PredictionMarket.json';

export default function MarketDetailPage() {
  const { address } = useParams<{ address: string }>();
  const { address: userAddress } = useAccount();
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'buy' | 'sell'>('buy');

  // Read market info
  const { data: marketInfo } = useReadContract({
    address: address as `0x${string}`,
    abi: MarketABI.abi,
    functionName: 'getMarketInfo',
  });

  // Read user shares
  const { data: userShares } = useReadContract({
    address: address as `0x${string}`,
    abi: MarketABI.abi,
    functionName: 'getUserShares',
    args: userAddress ? [userAddress, BigInt(selectedOutcome)] : undefined,
  });

  // Read prices for all outcomes
  const { data: outcome0Price } = useReadContract({
    address: address as `0x${string}`,
    abi: MarketABI.abi,
    functionName: 'getPrice',
    args: [0n],
  });

  const { data: outcome1Price } = useReadContract({
    address: address as `0x${string}`,
    abi: MarketABI.abi,
    functionName: 'getPrice',
    args: [1n],
  });

  // Write contract
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const handleTrade = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    if (action === 'buy') {
      writeContract({
        address: address as `0x${string}`,
        abi: MarketABI.abi,
        functionName: 'buyShares',
        args: [BigInt(selectedOutcome), 0n],
        value: parseEther(amount),
      });
    } else {
      writeContract({
        address: address as `0x${string}`,
        abi: MarketABI.abi,
        functionName: 'sellShares',
        args: [BigInt(selectedOutcome), parseEther(amount), 0n],
      });
    }
  };

  if (!marketInfo) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const info = marketInfo as any;
  const state = ['Active', 'Locked', 'Resolved', 'Disputed', 'Cancelled'][info.state];
  const isActive = info.state === 0;

  const yesPrice = outcome0Price ? Number(formatEther(outcome0Price as bigint)) : 0.5;
  const noPrice = outcome1Price ? Number(formatEther(outcome1Price as bigint)) : 0.5;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Market Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  state === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : state === 'Resolved'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {state}
              </span>
              <span className="text-sm text-gray-500">
                Ends {format(new Date(Number(info.endTime) * 1000), 'PPP')}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{info.question}</h1>
            <p className="text-gray-600">
              Created by {info.creator.slice(0, 6)}...{info.creator.slice(-4)}
            </p>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Volume</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatEther(info.totalVolume)} BNB
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Resolution Time</div>
            <div className="text-2xl font-bold text-gray-900">
              {format(new Date(Number(info.resolutionTime) * 1000), 'PPP')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Your Shares</div>
            <div className="text-2xl font-bold text-gray-900">
              {userShares ? formatEther(userShares as bigint) : '0'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Trade</h2>

            {/* Buy/Sell Tabs */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setAction('buy')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  action === 'buy'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setAction('sell')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  action === 'sell'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sell
              </button>
            </div>

            {/* Outcome Selection */}
            <div className="space-y-3 mb-4">
              {info.outcomes.map((outcome: string, index: number) => {
                const price = index === 0 ? yesPrice : noPrice;
                const prob = price * 100;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedOutcome(index)}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      selectedOutcome === index
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{outcome}</span>
                      <span className="text-lg font-bold text-blue-600">
                        {prob.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (BNB)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>

            {/* Trade Button */}
            <button
              onClick={handleTrade}
              disabled={!isActive || !amount || isPending || isConfirming}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isPending || isConfirming
                ? 'Confirming...'
                : action === 'buy'
                ? `Buy ${info.outcomes[selectedOutcome]}`
                : `Sell ${info.outcomes[selectedOutcome]}`}
            </button>

            {!isActive && (
              <p className="mt-4 text-center text-sm text-gray-600">
                Trading is closed for this market
              </p>
            )}
          </div>
        </div>

        {/* Market Info Sidebar */}
        <div className="space-y-6">
          {/* Current Probabilities */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Probabilities</h3>
            <div className="space-y-4">
              {info.outcomes.map((outcome: string, index: number) => {
                const price = index === 0 ? yesPrice : noPrice;
                const prob = price * 100;

                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">{outcome}</span>
                      <span className="font-bold text-gray-900">{prob.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          index === 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${prob}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Your Position */}
          {userAddress && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Your Position</h3>
              {info.outcomes.map((outcome: string, index: number) => (
                <div key={index} className="flex justify-between py-2">
                  <span className="text-gray-700">{outcome}</span>
                  <span className="font-medium">
                    {userShares && selectedOutcome === index
                      ? formatEther(userShares as bigint)
                      : '0'}{' '}
                    shares
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Market Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Liquidity Parameter</span>
                <span className="font-medium">
                  {formatEther(info.liquidityParameter)} BNB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trading Fee</span>
                <span className="font-medium">2.0%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contract</span>
                <a
                  href={`https://testnet.bscscan.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  View on BscScan ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
