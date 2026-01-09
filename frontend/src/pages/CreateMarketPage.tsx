import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useTranslation } from 'react-i18next';
import { getContractAddress } from '../contracts/addresses';
import FactoryABI from '../contracts/abis/PredictionMarketFactory.json';

export default function CreateMarketPage() {
  const { t } = useTranslation();
  const { chain, address: userAddress } = useAccount();
  const [marketType, setMarketType] = useState<'binary' | 'categorical'>('binary');
  const [question, setQuestion] = useState('');
  const [outcomes, setOutcomes] = useState(['', '']);
  const [duration, setDuration] = useState('30');
  const [initialLiquidity, setInitialLiquidity] = useState('1.0');

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleAddOutcome = () => {
    if (outcomes.length < 10) {
      setOutcomes([...outcomes, '']);
    }
  };

  const handleRemoveOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const handleCreate = () => {
    if (!chain || !question) return;

    const now = Math.floor(Date.now() / 1000);
    const durationSeconds = parseInt(duration) * 24 * 60 * 60;
    const endTime = now + durationSeconds;
    const resolutionTime = endTime + 7 * 24 * 60 * 60; // 7 days after end

    // Get creation fee (0.01 BNB default) + initial liquidity
    const totalValue = parseEther('0.01') + parseEther(initialLiquidity);

    if (marketType === 'binary') {
      writeContract({
        address: getContractAddress(chain.id, 'FACTORY') as `0x${string}`,
        abi: FactoryABI.abi,
        functionName: 'createBinaryMarket',
        args: [question, BigInt(endTime), BigInt(resolutionTime)],
        value: totalValue,
      });
    } else {
      const filteredOutcomes = outcomes.filter((o) => o.trim() !== '');
      writeContract({
        address: getContractAddress(chain.id, 'FACTORY') as `0x${string}`,
        abi: FactoryABI.abi,
        functionName: 'createCategoricalMarket',
        args: [
          question,
          filteredOutcomes,
          BigInt(endTime),
          BigInt(resolutionTime),
          parseEther('100'), // Default liquidity parameter
        ],
        value: totalValue,
      });
    }
  };

  if (!userAddress) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 glass-card rounded-2xl">
        <div className="text-7xl mb-6">🔗</div>
        <h2 className="font-display text-2xl font-bold text-white mb-4">{t('create.connect_title')}</h2>
        <p className="text-[#8A9BA8] text-lg">{t('create.connect_message')}</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 glass-card rounded-2xl">
        <div className="text-7xl mb-6">🎉</div>
        <h2 className="font-display text-2xl font-bold text-white mb-4">{t('create.success_title')}</h2>
        <p className="text-[#8A9BA8] text-lg mb-8">{t('create.success_message')}</p>
        <a
          href="/"
          className="inline-block px-8 py-4 bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          {t('create.view_markets')}
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6">
      <h1 className="font-display text-4xl font-bold text-white mb-8">{t('create.title')}</h1>

      <div className="glass-card rounded-2xl p-8">
        {/* Market Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-3">{t('create.market_type')}</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMarketType('binary')}
              className={`p-4 rounded-lg transition-all duration-300 ${
                marketType === 'binary'
                  ? 'glass-card border-[#00C9A7]'
                  : 'border border-white/10 hover:border-[#00C9A7]/50 bg-[#0A2342]/30'
              }`}
            >
              <div className="text-lg font-semibold mb-1 text-white">{t('create.binary')}</div>
              <div className="text-sm text-[#8A9BA8]">{t('create.binary_desc')}</div>
            </button>
            <button
              onClick={() => setMarketType('categorical')}
              className={`p-4 rounded-lg transition-all duration-300 ${
                marketType === 'categorical'
                  ? 'glass-card border-[#00C9A7]'
                  : 'border border-white/10 hover:border-[#00C9A7]/50 bg-[#0A2342]/30'
              }`}
            >
              <div className="text-lg font-semibold mb-1 text-white">{t('create.categorical')}</div>
              <div className="text-sm text-[#8A9BA8]">{t('create.categorical_desc')}</div>
            </button>
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-2">
            {t('create.question')}
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('create.question_placeholder')}
            className="w-full px-4 py-3 bg-[#0A2342]/30 border border-white/10 rounded-lg text-white placeholder-[#8A9BA8] focus:outline-none focus:border-[#00C9A7] transition-all"
          />
        </div>

        {/* Outcomes (for categorical) */}
        {marketType === 'categorical' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/90 mb-2">
              Outcomes (2-10)
            </label>
            <div className="space-y-2">
              {outcomes.map((outcome, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => {
                      const newOutcomes = [...outcomes];
                      newOutcomes[index] = e.target.value;
                      setOutcomes(newOutcomes);
                    }}
                    placeholder={`${t('create.outcome_placeholder')} ${index + 1}`}
                    className="flex-1 px-4 py-2 bg-[#0A2342]/30 border border-white/10 rounded-lg text-white placeholder-[#8A9BA8] focus:outline-none focus:border-[#00C9A7] transition-all"
                  />
                  {outcomes.length > 2 && (
                    <button
                      onClick={() => handleRemoveOutcome(index)}
                      className="px-3 py-2 text-red-400 hover:bg-red-500/10 border border-red-400/30 rounded-lg transition-all"
                    >
                      {t('create.remove')}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {outcomes.length < 10 && (
              <button
                onClick={handleAddOutcome}
                className="mt-2 text-sm text-energy-cyan hover:text-energy-bright font-medium transition-colors"
              >
                {t('create.add_outcome')}
              </button>
            )}
          </div>
        )}

        {/* Duration */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-2">
            {t('create.duration')}
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="1"
            max="365"
            className="w-full px-4 py-3 bg-[#0A2342]/30 border border-white/10 rounded-lg text-white placeholder-[#8A9BA8] focus:outline-none focus:border-[#00C9A7] transition-all"
          />
          <p className="mt-1 text-sm text-[#8A9BA8]">
            {t('create.duration_help', { days: duration })}
          </p>
        </div>

        {/* Initial Liquidity */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-2">
            {t('create.liquidity')}
          </label>
          <input
            type="number"
            value={initialLiquidity}
            onChange={(e) => setInitialLiquidity(e.target.value)}
            min="0.1"
            step="0.1"
            className="w-full px-4 py-3 bg-[#0A2342]/30 border border-white/10 rounded-lg text-white placeholder-[#8A9BA8] focus:outline-none focus:border-[#00C9A7] transition-all"
          />
          <p className="mt-1 text-sm text-[#8A9BA8]">
            {t('create.liquidity_help')}
          </p>
        </div>

        {/* Cost Summary */}
        <div className="glass-card rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-white mb-2">{t('create.cost_summary')}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8A9BA8]">{t('create.creation_fee')}</span>
              <span className="font-medium text-white">0.01 BNB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A9BA8]">{t('create.liquidity')}</span>
              <span className="font-medium text-white">{initialLiquidity} BNB</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="font-medium text-white">{t('create.total')}</span>
              <span className="font-mono font-bold glow-text-cyan">
                {(0.01 + parseFloat(initialLiquidity)).toFixed(2)} BNB
              </span>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={!question || isPending || isConfirming}
          className="w-full py-4 px-4 bg-gradient-to-r from-[#005F6B] to-[#0A2342] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg"
        >
          {isPending || isConfirming ? t('create.creating') : t('create.create_button')}
        </button>
      </div>
    </div>
  );
}
