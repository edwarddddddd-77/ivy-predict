import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { getContractAddress } from '../contracts/addresses';
import PriceMarketFactoryABI from '../contracts/abis/PriceMarketFactory.json';

// Asset options
const ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: 'from-orange-500 to-yellow-600' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'from-purple-500 to-indigo-600' },
  { symbol: 'BNB', name: 'BNB Chain', icon: '◆', color: 'from-yellow-400 to-amber-500' },
];

// Duration options
const DURATIONS = [
  { value: '1h', label: '1 Hour', emoji: '⚡', duration: 0 },
  { value: '4h', label: '4 Hours', emoji: '🔥', duration: 1 },
  { value: '24h', label: '1 Day', emoji: '📅', duration: 2 },
];

export default function QuickMarketPage() {
  const navigate = useNavigate();
  const publicClient = usePublicClient();
  const { chain, address: userAddress } = useAccount();
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [selectedDuration, setSelectedDuration] = useState('1h');
  const [createdMarketAddress, setCreatedMarketAddress] = useState<string | null>(null);

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  // Extract market address from transaction receipt and navigate
  useEffect(() => {
    if (isSuccess && receipt && publicClient) {
      // Find MarketCreated event in logs
      const marketCreatedEvent = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          '0x8b0e0cd1a643dbca06e58c7c1b9f8d3e6c3f99c0a5a6d4e2f2e0d4d3c3c3c3c3' // MarketCreated event signature (placeholder)
      );

      if (marketCreatedEvent && marketCreatedEvent.topics[1]) {
        // Market address is typically in the first indexed parameter
        const marketAddress = `0x${marketCreatedEvent.topics[1].slice(-40)}`;
        setCreatedMarketAddress(marketAddress);
      } else if (receipt.logs.length > 0) {
        // Fallback: try to extract from any log
        const possibleAddress = receipt.logs[0].address;
        setCreatedMarketAddress(possibleAddress);
      }
    }
  }, [isSuccess, receipt, publicClient]);

  const handleCreateMarket = () => {
    if (!chain) return;

    const asset = ASSETS.find(a => a.symbol === selectedAsset);
    const duration = DURATIONS.find(d => d.value === selectedDuration);
    if (!asset || !duration) return;

    const factoryAddress = getContractAddress(chain.id, 'PRICE_MARKET_FACTORY');
    const creationFee = parseEther('0.01'); // 0.01 BNB

    // Use quick create functions
    let functionName = '';
    if (selectedAsset === 'BTC' && selectedDuration === '1h') {
      functionName = 'createBTC1H';
    } else if (selectedAsset === 'ETH' && selectedDuration === '1h') {
      functionName = 'createETH1H';
    } else if (selectedAsset === 'BNB' && selectedDuration === '4h') {
      functionName = 'createBNB4H';
    } else {
      // Generic create
      functionName = 'createMarket';
    }

    if (functionName === 'createMarket') {
      writeContract({
        address: factoryAddress as `0x${string}`,
        abi: PriceMarketFactoryABI.abi,
        functionName: 'createMarket',
        args: [`${selectedAsset}/USD`, duration.duration],
        value: creationFee,
      });
    } else {
      writeContract({
        address: factoryAddress as `0x${string}`,
        abi: PriceMarketFactoryABI.abi,
        functionName,
        value: creationFee,
      });
    }
  };

  if (!userAddress) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 glass-card rounded-2xl">
        <div className="text-7xl mb-6">🔗</div>
        <h2 className="font-display text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-[#8A9BA8] text-lg">Please connect your wallet to create a market</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 glass-card rounded-2xl">
        <div className="text-7xl mb-6">🎉</div>
        <h2 className="font-display text-2xl font-bold text-white mb-4">Market Created!</h2>
        <p className="text-[#8A9BA8] text-lg mb-8">
          Your {selectedAsset} {selectedDuration} prediction market is live
        </p>
        <div className="flex gap-4 justify-center">
          {createdMarketAddress ? (
            <button
              onClick={() => navigate(`/price-market/${createdMarketAddress}`)}
              className="px-8 py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              📈 Trade Now
            </button>
          ) : (
            <a
              href="/"
              className="px-8 py-4 bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              View All Markets
            </a>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 border-2 border-[#00C9A7]/50 text-[#00C9A7] font-semibold rounded-lg hover:bg-[#00C9A7]/10 transition-all duration-300"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl font-bold text-white mb-4">
          ⚡ Quick <span className="glow-text-cyan">Price</span> Prediction
        </h1>
        <p className="text-xl text-[#8A9BA8] max-w-2xl mx-auto">
          Create ultra-short-term price markets in seconds. Will BTC go up or down in the next hour?
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left: Asset Selection */}
        <div className="glass-card rounded-2xl p-8">
          <h3 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span>📈</span> Select Asset
          </h3>
          <div className="space-y-4">
            {ASSETS.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={`w-full p-6 rounded-xl transition-all duration-300 border-2 ${
                  selectedAsset === asset.symbol
                    ? 'border-[#00C9A7] bg-[#00C9A7]/10 scale-105'
                    : 'border-white/10 hover:border-[#00C9A7]/50 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-full bg-gradient-to-br ${asset.color} flex items-center justify-center text-3xl text-white font-bold shadow-lg`}
                    >
                      {asset.icon}
                    </div>
                    <div className="text-left">
                      <div className="text-xl font-bold text-white">{asset.symbol}/USD</div>
                      <div className="text-sm text-[#8A9BA8]">{asset.name}</div>
                    </div>
                  </div>
                  {selectedAsset === asset.symbol && (
                    <div className="text-[#00C9A7] text-2xl">✓</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Duration Selection */}
        <div className="glass-card rounded-2xl p-8">
          <h3 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span>⏱️</span> Select Duration
          </h3>
          <div className="space-y-4">
            {DURATIONS.map((duration) => (
              <button
                key={duration.value}
                onClick={() => setSelectedDuration(duration.value)}
                className={`w-full p-6 rounded-xl transition-all duration-300 border-2 ${
                  selectedDuration === duration.value
                    ? 'border-[#00C9A7] bg-[#00C9A7]/10 scale-105'
                    : 'border-white/10 hover:border-[#00C9A7]/50 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{duration.emoji}</div>
                    <div className="text-left">
                      <div className="text-xl font-bold text-white">{duration.label}</div>
                      <div className="text-sm text-[#8A9BA8]">
                        {duration.value === '1h' && 'Fastest - High frequency trading'}
                        {duration.value === '4h' && 'Balanced - Medium-term prediction'}
                        {duration.value === '24h' && 'Strategic - Daily price movement'}
                      </div>
                    </div>
                  </div>
                  {selectedDuration === duration.value && (
                    <div className="text-[#00C9A7] text-2xl">✓</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary & Create Button */}
      <div className="glass-card rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-2xl font-bold text-white mb-2">Market Summary</h3>
            <p className="text-[#8A9BA8]">Review and confirm your market creation</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-[#8A9BA8] mb-1">Creation Fee</div>
            <div className="text-3xl font-bold text-[#00C9A7]">0.01 BNB</div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-[#0A2342]/40 rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-br ${
                  ASSETS.find((a) => a.symbol === selectedAsset)?.color
                } flex items-center justify-center text-4xl text-white font-bold shadow-lg`}
              >
                {ASSETS.find((a) => a.symbol === selectedAsset)?.icon}
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">
                  Will {selectedAsset} price go UP or DOWN?
                </div>
                <div className="text-lg text-[#8A9BA8]">
                  Duration: {DURATIONS.find((d) => d.value === selectedDuration)?.label}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#8A9BA8] mb-1">Ends in</div>
              <div className="text-2xl font-bold text-white">
                {selectedDuration === '1h' && '1 hour'}
                {selectedDuration === '4h' && '4 hours'}
                {selectedDuration === '24h' && '24 hours'}
              </div>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateMarket}
          disabled={isPending || isConfirming}
          className="w-full py-6 px-6 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-2xl"
        >
          {isPending || isConfirming ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating Market...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <span>🚀</span>
              Create Market Now
            </span>
          )}
        </button>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-[#8A9BA8]">
          💡 After creation, anyone can trade UP/DOWN shares until market ends
        </div>
      </div>
    </div>
  );
}
