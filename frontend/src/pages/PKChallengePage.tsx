import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getContractAddress } from '../contracts/addresses';
import PKChallengeABI from '../contracts/abis/PKChallenge.json';
import MockUSDTABI from '../contracts/abis/MockUSDT.json';
import { useReferral } from '../contexts/ReferralContext';
import { Duration, DURATION_LABELS } from '../hooks/usePKChallenge';
import OpenPKChallengeList from '../components/OpenPKChallengeList';

// Asset configuration
const ASSETS = [
  { symbol: 'BTC/USD', name: 'Bitcoin', icon: '₿', color: 'from-orange-500 to-yellow-600' },
  { symbol: 'ETH/USD', name: 'Ethereum', icon: 'Ξ', color: 'from-purple-500 to-indigo-600' },
  { symbol: 'BNB/USD', name: 'BNB', icon: '◆', color: 'from-yellow-400 to-amber-500' },
];

const DURATIONS = [
  { value: Duration.FIVE_MINUTES, label: '5 Minutes', emoji: '⚡' },
  { value: Duration.FIFTEEN_MINUTES, label: '15 Minutes', emoji: '🔥' },
  { value: Duration.ONE_HOUR, label: '1 Hour', emoji: '⏰' },
  { value: Duration.FOUR_HOURS, label: '4 Hours', emoji: '📊' },
  { value: Duration.ONE_DAY, label: '24 Hours', emoji: '📅' },
];

const PRESET_AMOUNTS = ['10', '50', '100', '500'];

export default function PKChallengePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { address: userAddress, chain, isConnected } = useAccount();
  const { referrer } = useReferral();

  // Form state
  const [selectedAsset, setSelectedAsset] = useState('BTC/USD');
  const [selectedDuration, setSelectedDuration] = useState<number>(Duration.ONE_HOUR);
  const [direction, setDirection] = useState<0 | 1>(0); // 0 = UP, 1 = DOWN
  const [minAmount, setMinAmount] = useState('10');
  const [maxAmount, setMaxAmount] = useState('100');
  const [myAmount, setMyAmount] = useState('50');
  const [isPublic, setIsPublic] = useState(false);
  const [step, setStep] = useState<'approve' | 'create'>('approve');

  // Contract addresses
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;
  const usdtAddress = chain?.id
    ? getContractAddress(chain.id, 'MOCK_USDT') as `0x${string}`
    : undefined;

  // Read USDT balance
  const { data: usdtBalance } = useReadContract({
    address: usdtAddress,
    abi: MockUSDTABI.abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && !!usdtAddress },
  });

  // Read USDT allowance
  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: usdtAddress,
    abi: MockUSDTABI.abi,
    functionName: 'allowance',
    args: userAddress && pkChallengeAddress ? [userAddress, pkChallengeAddress] : undefined,
    query: { enabled: !!userAddress && !!pkChallengeAddress && !!usdtAddress },
  });

  // Contract writes
  const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending, reset: resetApprove } = useWriteContract();
  const { data: createHash, writeContract: writeCreate, isPending: isCreatePending } = useWriteContract();

  // Transaction receipts
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess, data: createReceipt } = useWaitForTransactionReceipt({ hash: createHash });

  // Check if already approved
  useEffect(() => {
    if (usdtAllowance !== undefined) {
      const requiredAmount = parseUnits(myAmount || '0', 18);
      if ((usdtAllowance as bigint) >= requiredAmount) {
        setStep('create');
      } else {
        setStep('approve');
      }
    }
  }, [usdtAllowance, myAmount]);

  // After approve success, move to create step
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setStep('create');
      resetApprove();
    }
  }, [isApproveSuccess, refetchAllowance, resetApprove]);

  // After create success, navigate to home page (user can find their challenge there)
  useEffect(() => {
    if (isCreateSuccess && createReceipt) {
      // Navigate to home page after successful creation
      // TODO: Extract challengeId from event logs and navigate to /pk/:id
      navigate('/');
    }
  }, [isCreateSuccess, createReceipt, navigate]);

  // Handle approve
  const handleApprove = () => {
    if (!usdtAddress || !pkChallengeAddress) return;

    writeApprove({
      address: usdtAddress,
      abi: MockUSDTABI.abi,
      functionName: 'approve',
      args: [pkChallengeAddress, parseUnits('1000000', 18)], // Approve large amount
    });
  };

  // Handle create challenge
  const handleCreateChallenge = () => {
    if (!pkChallengeAddress) return;

    writeCreate({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'createChallenge',
      args: [
        selectedAsset,
        selectedDuration,
        direction,
        parseUnits(minAmount, 18),
        parseUnits(maxAmount, 18),
        parseUnits(myAmount, 18),
        referrer || '0x0000000000000000000000000000000000000000',
        isPublic,
      ],
    });
  };

  // Validation
  const isValidAmount = () => {
    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    const my = parseFloat(myAmount);
    return min > 0 && max >= min && my >= min && my <= max;
  };

  const hasEnoughBalance = () => {
    if (!usdtBalance) return false;
    return (usdtBalance as bigint) >= parseUnits(myAmount || '0', 18);
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="text-7xl mb-6">🔗</div>
          <h2 className="font-display text-2xl font-bold text-white mb-4">
            {t('pk.connect_wallet', 'Connect Wallet')}
          </h2>
          <p className="text-[#8A9BA8] text-lg">
            {t('pk.connect_message', 'Please connect your wallet to create a PK challenge')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
          ⚔️ {t('pk.title', 'PK Battle')}
        </h1>
        <p className="text-[#8A9BA8] text-base md:text-lg">
          {t('pk.create_subtitle', 'Challenge your friends to a 1v1 price prediction battle')}
        </p>
      </div>

      {/* Open Challenges Section */}
      <div className="mb-12">
        <OpenPKChallengeList />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-white/10"></div>
        <span className="text-[#8A9BA8] text-sm">{t('openChallenge.or_create', 'Or create your own')}</span>
        <div className="flex-1 h-px bg-white/10"></div>
      </div>

      {/* Create Challenge Section */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
          ✨ {t('pk.create_title', 'Create PK Challenge')}
        </h2>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
        {/* Step 1: Select Asset */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#00C9A7] flex items-center justify-center text-sm">1</span>
            {t('pk.select_asset', 'Select Asset')}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {ASSETS.map(asset => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedAsset === asset.symbol
                    ? 'border-[#00C9A7] bg-[#00C9A7]/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className={`w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br ${asset.color} flex items-center justify-center text-2xl text-white`}>
                  {asset.icon}
                </div>
                <div className="text-white font-medium">{asset.symbol}</div>
                <div className="text-sm text-[#8A9BA8]">{asset.name}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Select Direction */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#00C9A7] flex items-center justify-center text-sm">2</span>
            {t('pk.select_direction', 'Your Prediction')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setDirection(0)}
              className={`p-6 rounded-xl border-2 transition-all ${
                direction === 0
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-white/10 hover:border-green-500/50'
              }`}
            >
              <div className="text-4xl mb-2">📈</div>
              <div className="text-xl font-bold text-white">{t('pk.price_up', 'Price UP')}</div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.up_desc', 'Predict price will rise')}</div>
            </button>
            <button
              onClick={() => setDirection(1)}
              className={`p-6 rounded-xl border-2 transition-all ${
                direction === 1
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-white/10 hover:border-red-500/50'
              }`}
            >
              <div className="text-4xl mb-2">📉</div>
              <div className="text-xl font-bold text-white">{t('pk.price_down', 'Price DOWN')}</div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.down_desc', 'Predict price will fall')}</div>
            </button>
          </div>
        </section>

        {/* Step 3: Select Duration */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#00C9A7] flex items-center justify-center text-sm">3</span>
            {t('pk.select_duration', 'Select Duration')}
          </h3>
          <div className="flex flex-wrap gap-3">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => setSelectedDuration(d.value)}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  selectedDuration === d.value
                    ? 'border-[#00C9A7] bg-[#00C9A7]/10 text-white'
                    : 'border-white/10 text-[#8A9BA8] hover:border-white/30'
                }`}
              >
                {d.emoji} {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* Step 4: Set Amount */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#00C9A7] flex items-center justify-center text-sm">4</span>
            {t('pk.set_amount', 'Set Amount')}
          </h3>

          {/* Balance display */}
          <div className="mb-4 p-3 bg-[#0A2342]/60 rounded-lg border border-white/10">
            <span className="text-[#8A9BA8]">{t('pk.your_balance', 'Your Balance')}: </span>
            <span className="text-white font-mono">
              {usdtBalance ? formatUnits(usdtBalance as bigint, 18) : '0'} USDT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-[#8A9BA8] mb-2 block">{t('pk.min_amount', 'Min Accept Amount')}</label>
              <div className="relative">
                <input
                  type="number"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A2342]/60 border border-white/10 rounded-lg text-white focus:border-[#00C9A7] focus:outline-none"
                  min="1"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A9BA8]">USDT</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8A9BA8] mb-2 block">{t('pk.max_amount', 'Max Accept Amount')}</label>
              <div className="relative">
                <input
                  type="number"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A2342]/60 border border-white/10 rounded-lg text-white focus:border-[#00C9A7] focus:outline-none"
                  min="1"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A9BA8]">USDT</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8A9BA8] mb-2 block">{t('pk.my_stake', 'My Stake')}</label>
              <div className="relative">
                <input
                  type="number"
                  value={myAmount}
                  onChange={e => setMyAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A2342]/60 border border-white/10 rounded-lg text-white focus:border-[#00C9A7] focus:outline-none"
                  min="1"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A9BA8]">USDT</span>
              </div>
            </div>
          </div>

          {/* Preset amounts */}
          <div className="flex gap-2">
            {PRESET_AMOUNTS.map(preset => (
              <button
                key={preset}
                onClick={() => {
                  setMyAmount(preset);
                  setMinAmount(preset);
                  setMaxAmount(preset);
                }}
                className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                  myAmount === preset
                    ? 'bg-[#00C9A7] text-white'
                    : 'bg-[#0A2342]/60 text-[#8A9BA8] hover:bg-[#00C9A7]/20 hover:text-white border border-white/10'
                }`}
              >
                {preset} USDT
              </button>
            ))}
          </div>
        </section>

        {/* Step 5: Options */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#00C9A7] flex items-center justify-center text-sm">5</span>
            {t('pk.options', 'Options')}
          </h3>
          <label className="flex items-center gap-3 p-4 bg-[#0A2342]/60 rounded-lg border border-white/10 cursor-pointer hover:border-[#00C9A7]/50">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="w-5 h-5 rounded border-white/30 bg-transparent text-[#00C9A7] focus:ring-[#00C9A7]"
            />
            <div>
              <div className="text-white font-medium">{t('pk.public_challenge', 'Public Challenge')}</div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.public_desc', 'Anyone can accept this challenge (shown in public pool)')}</div>
            </div>
          </label>
        </section>

        {/* Preview */}
        <section className="p-6 bg-gradient-to-r from-[#00C9A7]/10 to-[#005F6B]/10 rounded-xl border border-[#00C9A7]/30">
          <h4 className="text-lg font-bold text-white mb-4">{t('pk.preview', 'Challenge Preview')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.asset', 'Asset')}</div>
              <div className="text-lg font-bold text-white">{selectedAsset}</div>
            </div>
            <div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.direction', 'Direction')}</div>
              <div className={`text-lg font-bold ${direction === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {direction === 0 ? '📈 UP' : '📉 DOWN'}
              </div>
            </div>
            <div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.duration', 'Duration')}</div>
              <div className="text-lg font-bold text-white">{DURATION_LABELS[selectedDuration]}</div>
            </div>
            <div>
              <div className="text-sm text-[#8A9BA8]">{t('pk.stake', 'Stake')}</div>
              <div className="text-lg font-bold text-[#00C9A7]">{myAmount} USDT</div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        {step === 'approve' ? (
          <button
            onClick={handleApprove}
            disabled={isApprovePending || isApproveConfirming || !isValidAmount()}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isApprovePending || isApproveConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> {t('pk.approving', 'Approving USDT...')}
              </span>
            ) : (
              <span>🔓 {t('pk.approve_usdt', 'Approve USDT')}</span>
            )}
          </button>
        ) : (
          <button
            onClick={handleCreateChallenge}
            disabled={isCreatePending || isCreateConfirming || !isValidAmount() || !hasEnoughBalance()}
            className="w-full py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isCreatePending || isCreateConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> {t('pk.creating', 'Creating Challenge...')}
              </span>
            ) : !hasEnoughBalance() ? (
              <span>{t('pk.insufficient_balance', 'Insufficient USDT Balance')}</span>
            ) : (
              <span>⚔️ {t('pk.create_challenge', 'Create Challenge')}</span>
            )}
          </button>
        )}

        {/* Error messages */}
        {!isValidAmount() && (
          <p className="text-red-400 text-center text-sm">
            {t('pk.invalid_amount', 'Please enter valid amounts (min ≤ stake ≤ max)')}
          </p>
        )}
      </div>
    </div>
  );
}
