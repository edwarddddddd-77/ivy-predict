import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { formatEther, parseEther } from 'viem';
import PriceMarketABI from '../contracts/abis/PricePredictionMarket.json';

// Asset configurations matching QuickMarketPage
const ASSETS: Record<string, { icon: string; color: string; name: string }> = {
  'BTC/USD': { icon: '₿', color: 'from-orange-500 to-yellow-600', name: 'Bitcoin' },
  'ETH/USD': { icon: 'Ξ', color: 'from-purple-500 to-indigo-600', name: 'Ethereum' },
  'BNB/USD': { icon: '◆', color: 'from-yellow-400 to-amber-500', name: 'BNB Chain' },
};

const DURATION_LABELS: Record<number, string> = {
  0: '1 Hour',
  1: '4 Hours',
  2: '24 Hours',
};

// Countdown timer component
function CountdownTimer({ endTime }: { endTime: number }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [percentage, setPercentage] = useState<number>(100);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = endTime - now;

      if (remaining <= 0) {
        setTimeLeft('Ended');
        setPercentage(0);
        return;
      }

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );

      // Calculate percentage (assuming max 24 hours)
      const maxDuration = 24 * 3600;
      setPercentage((remaining / maxDuration) * 100);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const isUrgent = percentage < 10;
  const isWarning = percentage < 30 && percentage >= 10;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#8A9BA8]">Time Remaining</span>
        <span
          className={`text-2xl font-bold ${
            isUrgent
              ? 'text-red-500 animate-pulse'
              : isWarning
              ? 'text-yellow-500'
              : 'text-[#00C9A7]'
          }`}
        >
          {timeLeft}
        </span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${
            isUrgent
              ? 'bg-gradient-to-r from-red-500 to-red-600'
              : isWarning
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
              : 'bg-gradient-to-r from-[#00C9A7] to-[#005F6B]'
          }`}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        ></div>
      </div>
    </div>
  );
}

export default function PriceMarketDetailPage() {
  const { address } = useParams<{ address: string }>();
  const { address: userAddress } = useAccount();
  const [amount, setAmount] = useState('');

  // Read market info
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

  const { data: startTime } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'startTime',
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

  const { data: endPrice } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'endPrice',
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

  const { data: quantityUP } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'quantities',
    args: [0n], // UP = 0
  });

  const { data: quantityDOWN } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'quantities',
    args: [1n], // DOWN = 1
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

  const { data: userSharesUP } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'getUserShares',
    args: userAddress ? [userAddress, 0n] : undefined,
  });

  const { data: userSharesDOWN } = useReadContract({
    address: address as `0x${string}`,
    abi: PriceMarketABI.abi,
    functionName: 'getUserShares',
    args: userAddress ? [userAddress, 1n] : undefined,
  });

  // Write functions
  const {
    data: hash,
    writeContract,
    isPending,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleBuyShares = (direction: 0 | 1) => {
    if (!amount || parseFloat(amount) <= 0) return;

    writeContract({
      address: address as `0x${string}`,
      abi: PriceMarketABI.abi,
      functionName: 'buyShares',
      args: [direction, 0n], // direction, minShares (0 for simplicity)
      value: parseEther(amount),
    });
  };

  const handleClaimWinnings = () => {
    writeContract({
      address: address as `0x${string}`,
      abi: PriceMarketABI.abi,
      functionName: 'claimWinnings',
    });
  };

  // Loading state
  if (!assetSymbol || !duration || !startTime || !endTime) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C9A7]"></div>
      </div>
    );
  }

  const asset = ASSETS[assetSymbol as string] || {
    icon: '?',
    color: 'from-gray-500 to-gray-600',
    name: assetSymbol,
  };
  const durationLabel = DURATION_LABELS[Number(duration)] || 'Unknown';
  const now = Math.floor(Date.now() / 1000);
  const isActive = now < Number(endTime) && !isSettled;

  // Calculate probabilities
  const probUP = priceUP ? Number(formatEther(priceUP as bigint)) * 100 : 50;
  const probDOWN = priceDOWN ? Number(formatEther(priceDOWN as bigint)) * 100 : 50;

  // Format prices
  const startPriceFormatted = startPrice
    ? (Number(startPrice) / 1e8).toFixed(2)
    : 'Recording...';
  const endPriceFormatted = endPrice
    ? (Number(endPrice) / 1e8).toFixed(2)
    : 'Pending...';

  // Determine winner
  let winner = '';
  if (isSettled && startPrice && endPrice) {
    winner = Number(endPrice) > Number(startPrice) ? 'UP' : 'DOWN';
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Back button */}
      <Link
        to="/quick"
        className="inline-flex items-center gap-2 text-[#8A9BA8] hover:text-[#00C9A7] mb-6 transition-colors"
      >
        ← Back to Quick Trade
      </Link>

      {/* Market Header */}
      <div className="glass-card rounded-2xl p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${asset.color} flex items-center justify-center text-5xl text-white font-bold shadow-lg`}
            >
              {asset.icon}
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-white mb-2">
                {String(assetSymbol)} Price Prediction
              </h1>
              <p className="text-xl text-[#8A9BA8]">
                Will price go <span className="text-green-400">UP</span> or{' '}
                <span className="text-red-400">DOWN</span> in {durationLabel}?
              </p>
            </div>
          </div>
          <div
            className={`px-6 py-3 rounded-xl font-bold text-lg ${
              isActive
                ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                : Boolean(isSettled)
                ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/50'
                : 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50'
            }`}
          >
            {isActive ? '🟢 Active' : Boolean(isSettled) ? '✅ Settled' : '⏳ Locked'}
          </div>
        </div>

        {/* Countdown Timer */}
        {isActive && endTime && <CountdownTimer endTime={Number(endTime)} />}

        {/* Price Info */}
        <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-white/10">
          <div>
            <div className="text-sm text-[#8A9BA8] mb-1">Start Price</div>
            <div className="text-3xl font-bold text-white">
              ${startPriceFormatted}
            </div>
          </div>
          <div>
            <div className="text-sm text-[#8A9BA8] mb-1">
              {Boolean(isSettled) ? 'End Price' : 'Current Price'}
            </div>
            <div className="text-3xl font-bold text-white">
              ${endPriceFormatted}
            </div>
          </div>
          <div>
            <div className="text-sm text-[#8A9BA8] mb-1">Total Volume</div>
            <div className="text-3xl font-bold text-[#00C9A7]">
              {totalVolume ? formatEther(totalVolume as bigint) : '0'} BNB
            </div>
          </div>
        </div>

        {/* Settlement Result */}
        {Boolean(isSettled) && winner && (
          <div className="mt-6 p-6 bg-gradient-to-r from-[#00C9A7]/20 to-[#005F6B]/20 rounded-xl border border-[#00C9A7]/50">
            <div className="text-center">
              <div className="text-sm text-[#8A9BA8] mb-2">Final Result</div>
              <div
                className={`text-5xl font-bold ${
                  winner === 'UP' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {winner === 'UP' ? '📈 PRICE WENT UP!' : '📉 PRICE WENT DOWN!'}
              </div>
              <div className="text-lg text-white mt-2">
                ${startPriceFormatted} → ${endPriceFormatted}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trading Panel */}
        <div className="lg:col-span-2 space-y-6">
          {isActive ? (
            <>
              {/* UP Button */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">📈</div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        Buy UP
                      </div>
                      <div className="text-sm text-[#8A9BA8]">
                        Bet that price will increase
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#8A9BA8]">Probability</div>
                    <div className="text-3xl font-bold text-green-400">
                      {probUP.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0 BNB"
                    className="flex-1 px-4 py-3 bg-[#0A2342]/60 border border-white/10 rounded-lg text-white placeholder-[#8A9BA8] focus:outline-none focus:border-[#00C9A7]"
                    step="0.01"
                    min="0"
                  />
                  <button
                    onClick={() => handleBuyShares(0)}
                    disabled={isPending || isConfirming || !amount}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isPending || isConfirming ? 'Buying...' : 'Buy UP'}
                  </button>
                </div>
              </div>

              {/* DOWN Button */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">📉</div>
                    <div>
                      <div className="text-2xl font-bold text-white">
                        Buy DOWN
                      </div>
                      <div className="text-sm text-[#8A9BA8]">
                        Bet that price will decrease
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#8A9BA8]">Probability</div>
                    <div className="text-3xl font-bold text-red-400">
                      {probDOWN.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0 BNB"
                    className="flex-1 px-4 py-3 bg-[#0A2342]/60 border border-white/10 rounded-lg text-white placeholder-[#8A9BA8] focus:outline-none focus:border-[#00C9A7]"
                    step="0.01"
                    min="0"
                  />
                  <button
                    onClick={() => handleBuyShares(1)}
                    disabled={isPending || isConfirming || !amount}
                    className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isPending || isConfirming ? 'Buying...' : 'Buy DOWN'}
                  </button>
                </div>
              </div>
            </>
          ) : Boolean(isSettled) ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">
                {winner === 'UP' ? '🎉' : '💰'}
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Market Settled
              </h3>
              <p className="text-[#8A9BA8] mb-6">
                {(userSharesUP && typeof userSharesUP === 'bigint' && Number(userSharesUP) > 0 && winner === 'UP')
                  ? 'Congratulations! You won! Click below to claim your winnings.'
                  : (userSharesDOWN && typeof userSharesDOWN === 'bigint' &&
                    Number(userSharesDOWN) > 0 &&
                    winner === 'DOWN')
                  ? 'Congratulations! You won! Click below to claim your winnings.'
                  : 'This market has been settled.'}
              </p>
              {Boolean(
                ((userSharesUP && typeof userSharesUP === 'bigint' && Number(userSharesUP) > 0 && winner === 'UP') ||
                  (userSharesDOWN && typeof userSharesDOWN === 'bigint' &&
                    Number(userSharesDOWN) > 0 &&
                    winner === 'DOWN'))
              ) && (
                <button
                  onClick={handleClaimWinnings}
                  disabled={isPending || isConfirming}
                  className="px-12 py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {isPending || isConfirming
                    ? 'Claiming...'
                    : '💎 Claim Winnings'}
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Market Locked
              </h3>
              <p className="text-[#8A9BA8]">
                Trading has ended. Waiting for settlement...
              </p>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="glass-card rounded-xl p-6 bg-green-500/10 border-2 border-green-500/50">
              <div className="flex items-center gap-3">
                <div className="text-3xl">✅</div>
                <div>
                  <div className="text-lg font-bold text-white">
                    Transaction Successful!
                  </div>
                  <div className="text-sm text-[#8A9BA8]">
                    Your shares have been purchased
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Market Distribution */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Market Distribution
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[#8A9BA8]">📈 UP Shares</span>
                  <span className="font-bold text-green-400">
                    {quantityUP ? formatEther(quantityUP as bigint) : '0'}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div
                    className="h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
                    style={{ width: `${probUP}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[#8A9BA8]">📉 DOWN Shares</span>
                  <span className="font-bold text-red-400">
                    {quantityDOWN ? formatEther(quantityDOWN as bigint) : '0'}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div
                    className="h-3 bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all"
                    style={{ width: `${probDOWN}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Your Position */}
          {userAddress && (
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                Your Position
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-[#8A9BA8]">📈 UP Shares</span>
                  <span className="font-bold text-white">
                    {userSharesUP ? formatEther(userSharesUP as bigint) : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-[#8A9BA8]">📉 DOWN Shares</span>
                  <span className="font-bold text-white">
                    {userSharesDOWN
                      ? formatEther(userSharesDOWN as bigint)
                      : '0'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Market Info */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Market Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-[#8A9BA8]">Duration</span>
                <span className="font-medium text-white">{durationLabel}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#8A9BA8]">Trading Fee</span>
                <span className="font-medium text-white">2.0%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#8A9BA8]">Contract</span>
                <a
                  href={`https://testnet.bscscan.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#00C9A7] hover:underline"
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
