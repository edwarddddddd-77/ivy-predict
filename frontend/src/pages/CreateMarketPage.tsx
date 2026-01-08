import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { getContractAddress } from '../contracts/addresses';
import FactoryABI from '../contracts/abis/PredictionMarketFactory.json';

export default function CreateMarketPage() {
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to create a market</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Market Created!</h2>
        <p className="text-gray-600 mb-6">Your prediction market has been successfully created.</p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          View Markets
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Prediction Market</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Market Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Market Type</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMarketType('binary')}
              className={`p-4 rounded-lg border-2 transition-all ${
                marketType === 'binary'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-lg font-semibold mb-1">Binary</div>
              <div className="text-sm text-gray-600">YES / NO outcomes</div>
            </button>
            <button
              onClick={() => setMarketType('categorical')}
              className={`p-4 rounded-lg border-2 transition-all ${
                marketType === 'categorical'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-lg font-semibold mb-1">Categorical</div>
              <div className="text-sm text-gray-600">Multiple outcomes</div>
            </button>
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Market Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Will BTC reach $100,000 by March 2026?"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Outcomes (for categorical) */}
        {marketType === 'categorical' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    placeholder={`Outcome ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {outcomes.length > 2 && (
                    <button
                      onClick={() => handleRemoveOutcome(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {outcomes.length < 10 && (
              <button
                onClick={handleAddOutcome}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Outcome
              </button>
            )}
          </div>
        )}

        {/* Duration */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (days)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="1"
            max="365"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500">
            Market will close in {duration} days. Resolution happens 7 days after closing.
          </p>
        </div>

        {/* Initial Liquidity */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Liquidity (BNB)
          </label>
          <input
            type="number"
            value={initialLiquidity}
            onChange={(e) => setInitialLiquidity(e.target.value)}
            min="0.1"
            step="0.1"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500">
            Higher liquidity = more stable prices. Recommended: 1-10 BNB
          </p>
        </div>

        {/* Cost Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Cost Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Creation Fee</span>
              <span className="font-medium">0.01 BNB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Initial Liquidity</span>
              <span className="font-medium">{initialLiquidity} BNB</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-900">Total</span>
              <span className="font-bold text-gray-900">
                {(0.01 + parseFloat(initialLiquidity)).toFixed(2)} BNB
              </span>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={!question || isPending || isConfirming}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isPending || isConfirming ? 'Creating Market...' : 'Create Market'}
        </button>
      </div>
    </div>
  );
}
