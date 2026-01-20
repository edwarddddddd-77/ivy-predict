import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getContractAddress } from '../contracts/addresses';
import EventPKChallengeABI from '../contracts/abis/EventPKChallenge.json';
import MockUSDTABI from '../contracts/abis/MockUSDT.json';
import { useReferral } from '../contexts/ReferralContext';
import { Position, CATEGORIES } from '../hooks/useEventPKChallenge';
import OpenEventChallengeList from '../components/OpenEventChallengeList';

const PRESET_AMOUNTS = ['10', '50', '100', '500'];

// Resolve time options (days from now)
const RESOLVE_OPTIONS = [
  { value: 7, label: '1 Week', emoji: '📅' },
  { value: 14, label: '2 Weeks', emoji: '📆' },
  { value: 30, label: '1 Month', emoji: '🗓️' },
  { value: 90, label: '3 Months', emoji: '📊' },
];

export default function EventPKChallengePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { address: userAddress, chain, isConnected } = useAccount();
  const { referrer } = useReferral();

  // Form state
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Politics');
  const [position, setPosition] = useState<0 | 1>(0); // 0 = YES, 1 = NO
  const [resolveDays, setResolveDays] = useState(30);
  const [minAmount, setMinAmount] = useState('10');
  const [maxAmount, setMaxAmount] = useState('100');
  const [myAmount, setMyAmount] = useState('50');
  const [isPublic, setIsPublic] = useState(false);
  const [step, setStep] = useState<'approve' | 'create'>('approve');

  // Contract addresses
  const eventPKChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'EVENT_PK_CHALLENGE') as `0x${string}`
    : undefined;
  const usdtAddress = chain?.id
    ? getContractAddress(chain.id, 'MOCK_USDT') as `0x${string}`
    : undefined;

  // Read USDT balance and allowance
  const { data: usdtBalance } = useReadContract({
    address: usdtAddress,
    abi: MockUSDTABI.abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: usdtAddress,
    abi: MockUSDTABI.abi,
    functionName: 'allowance',
    args: userAddress && eventPKChallengeAddress ? [userAddress, eventPKChallengeAddress] : undefined,
    query: { enabled: !!userAddress && !!eventPKChallengeAddress && !!usdtAddress },
  });

  // Contract writes
  const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending, reset: resetApprove } = useWriteContract();
  const { data: createHash, writeContract: writeCreate, isPending: isCreatePending } = useWriteContract();

  // Transaction receipts
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });

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

  // After approve success, refetch allowance
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      resetApprove();
    }
  }, [isApproveSuccess, refetchAllowance, resetApprove]);

  // After create success, navigate to home
  useEffect(() => {
    if (isCreateSuccess) {
      navigate('/');
    }
  }, [isCreateSuccess, navigate]);

  // Handle approve
  const handleApprove = () => {
    if (!usdtAddress || !eventPKChallengeAddress) return;

    writeApprove({
      address: usdtAddress,
      abi: MockUSDTABI.abi,
      functionName: 'approve',
      args: [eventPKChallengeAddress, parseUnits('1000000', 18)], // Approve large amount
    });
  };

  // Handle create
  const handleCreate = () => {
    if (!eventPKChallengeAddress || !question) return;

    const resolveTime = Math.floor(Date.now() / 1000) + (resolveDays * 24 * 60 * 60);

    writeCreate({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'createChallenge',
      args: [
        question,
        category,
        position,
        parseUnits(minAmount, 18),
        parseUnits(maxAmount, 18),
        parseUnits(myAmount, 18),
        BigInt(resolveTime),
        referrer || '0x0000000000000000000000000000000000000000',
        isPublic,
      ],
    });
  };

  // Validate amounts
  const isValidAmounts = () => {
    const min = parseFloat(minAmount) || 0;
    const max = parseFloat(maxAmount) || 0;
    const my = parseFloat(myAmount) || 0;
    return min > 0 && max >= min && my >= min && my <= max;
  };

  // Check balance
  const hasEnoughBalance = () => {
    if (!usdtBalance) return false;
    const required = parseUnits(myAmount || '0', 18);
    return (usdtBalance as bigint) >= required;
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 glass-card rounded-2xl">
        <div className="text-7xl mb-6">🔗</div>
        <h2 className="font-display text-2xl font-bold text-white mb-4">
          {t('eventPk.connect_wallet', 'Connect Wallet')}
        </h2>
        <p className="text-[#8A9BA8] text-lg">
          {t('eventPk.connect_message', 'Please connect your wallet to create an event PK challenge')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
          🎯 {t('nav.event_pk', 'Event PK')}
        </h1>
        <p className="text-[#8A9BA8] text-lg">
          {t('eventPk.create_subtitle', 'Challenge friends to bet on any event outcome')}
        </p>
      </div>

      {/* Open Challenges Section */}
      <div className="mb-12">
        <OpenEventChallengeList />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-white/10"></div>
        <span className="text-[#8A9BA8] text-sm">{t('openChallenge.or_create', 'Or create your own')}</span>
        <div className="flex-1 h-px bg-white/10"></div>
      </div>

      {/* Create Challenge Section */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
          ✨ {t('eventPk.create_title', 'Create Event PK')}
        </h2>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
        {/* Question Input */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            {t('eventPk.question', 'Your Prediction Question')}
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('eventPk.question_placeholder', 'e.g., Will Trump attack Iran before April 2026?')}
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 bg-[#0A2342]/30 border border-white/10 rounded-xl text-white placeholder-[#8A9BA8] focus:outline-none focus:border-[#00C9A7] transition-all resize-none"
          />
          <div className="text-right text-xs text-[#8A9BA8] mt-1">{question.length}/500</div>
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-3">
            {t('eventPk.category', 'Category')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-xl text-center transition-all ${
                  category === cat.value
                    ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] border border-[#00C9A7]'
                    : 'bg-[#0A2342]/30 border border-white/10 hover:border-[#00C9A7]/50'
                }`}
              >
                <div className="text-2xl mb-1">{cat.emoji}</div>
                <div className="text-xs text-white">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Position Selection */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-3">
            {t('eventPk.your_position', 'Your Position')}
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setPosition(Position.YES)}
              className={`p-6 rounded-xl transition-all ${
                position === Position.YES
                  ? 'bg-gradient-to-r from-green-600 to-green-800 border-2 border-green-400 shadow-lg shadow-green-500/20'
                  : 'bg-[#0A2342]/30 border border-white/10 hover:border-green-500/50'
              }`}
            >
              <div className="text-4xl mb-2">👍</div>
              <div className="text-xl font-bold text-white">YES</div>
              <div className="text-sm text-white/70 mt-1">
                {t('eventPk.yes_desc', 'I bet this will happen')}
              </div>
            </button>
            <button
              onClick={() => setPosition(Position.NO)}
              className={`p-6 rounded-xl transition-all ${
                position === Position.NO
                  ? 'bg-gradient-to-r from-red-600 to-red-800 border-2 border-red-400 shadow-lg shadow-red-500/20'
                  : 'bg-[#0A2342]/30 border border-white/10 hover:border-red-500/50'
              }`}
            >
              <div className="text-4xl mb-2">👎</div>
              <div className="text-xl font-bold text-white">NO</div>
              <div className="text-sm text-white/70 mt-1">
                {t('eventPk.no_desc', "I bet this won't happen")}
              </div>
            </button>
          </div>
        </div>

        {/* Resolve Time */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-3">
            {t('eventPk.resolve_time', 'When should this be resolved?')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {RESOLVE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setResolveDays(opt.value)}
                className={`p-3 rounded-xl text-center transition-all ${
                  resolveDays === opt.value
                    ? 'bg-gradient-to-r from-[#005F6B] to-[#0A2342] border border-[#00C9A7]'
                    : 'bg-[#0A2342]/30 border border-white/10 hover:border-[#00C9A7]/50'
                }`}
              >
                <div className="text-xl mb-1">{opt.emoji}</div>
                <div className="text-xs text-white">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Settings */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-3">
            {t('eventPk.set_amount', 'Set Amount (USDT)')}
          </label>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-[#8A9BA8] mb-1 block">
                {t('eventPk.min_amount', 'Min Accept')}
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2342]/30 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8A9BA8] mb-1 block">
                {t('eventPk.my_stake', 'My Stake')}
              </label>
              <input
                type="number"
                value={myAmount}
                onChange={(e) => setMyAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2342]/30 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8A9BA8] mb-1 block">
                {t('eventPk.max_amount', 'Max Accept')}
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2342]/30 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setMyAmount(amt)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  myAmount === amt
                    ? 'bg-[#00C9A7] text-white'
                    : 'bg-[#0A2342]/30 text-[#8A9BA8] hover:bg-[#00C9A7]/20'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>

          {/* Balance display */}
          <div className="mt-3 text-sm text-[#8A9BA8]">
            {t('eventPk.your_balance', 'Your Balance')}: {' '}
            <span className="text-white font-mono">
              {usdtBalance ? formatUnits(usdtBalance as bigint, 18) : '0'} USDT
            </span>
          </div>
        </div>

        {/* Public Option */}
        <div className="flex items-center justify-between p-4 bg-[#0A2342]/30 rounded-xl">
          <div>
            <div className="text-white font-medium">{t('eventPk.public_challenge', 'Public Challenge')}</div>
            <div className="text-sm text-[#8A9BA8]">
              {t('eventPk.public_desc', 'Anyone can accept (shown in public pool)')}
            </div>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`w-14 h-8 rounded-full transition-all ${
              isPublic ? 'bg-[#00C9A7]' : 'bg-[#0A2342]'
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all ${
                isPublic ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Preview */}
        {question && (
          <div className="p-4 bg-gradient-to-r from-[#005F6B]/20 to-[#0A2342]/20 rounded-xl border border-[#00C9A7]/30">
            <div className="text-sm text-[#8A9BA8] mb-2">{t('eventPk.preview', 'Challenge Preview')}</div>
            <div className="text-lg text-white font-medium mb-2">"{question}"</div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#8A9BA8]">
                {t('eventPk.your_bet', 'Your Bet')}:{' '}
                <span className={position === Position.YES ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {position === Position.YES ? 'YES' : 'NO'}
                </span>
              </span>
              <span className="text-[#8A9BA8]">
                {t('eventPk.stake', 'Stake')}: <span className="text-[#00C9A7]">{myAmount} USDT</span>
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        {step === 'approve' ? (
          <button
            onClick={handleApprove}
            disabled={isApprovePending || isApproveConfirming || !question}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isApprovePending || isApproveConfirming
              ? t('eventPk.approving', 'Approving USDT...')
              : t('eventPk.approve_usdt', 'Approve USDT')}
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={
              isCreatePending ||
              isCreateConfirming ||
              !question ||
              !isValidAmounts() ||
              !hasEnoughBalance()
            }
            className="w-full py-4 bg-gradient-to-r from-[#00C9A7] to-[#005F6B] text-white text-xl font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isCreatePending || isCreateConfirming
              ? t('eventPk.creating', 'Creating Challenge...')
              : !isValidAmounts()
              ? t('eventPk.invalid_amount', 'Invalid Amount')
              : !hasEnoughBalance()
              ? t('eventPk.insufficient_balance', 'Insufficient Balance')
              : t('eventPk.create_challenge', 'Create Challenge')}
          </button>
        )}
      </div>
    </div>
  );
}
