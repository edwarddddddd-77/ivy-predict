import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import EventPKChallengeABI from '../contracts/abis/EventPKChallenge.json';
import { getContractAddress } from '../contracts/addresses';

// Types
export interface EventChallenge {
  challengeId: bigint;
  question: string;
  category: string;
  creator: string;
  opponent: string;
  creatorPosition: number;
  minAmount: bigint;
  maxAmount: bigint;
  creatorAmount: bigint;
  opponentAmount: bigint;
  createdAt: bigint;
  acceptedAt: bigint;
  expiresAt: bigint;
  resolveTime: bigint;
  state: number;
  result: number;
  winner: string;
  creatorVote: number;
  opponentVote: number;
  creatorVoted: boolean;
  opponentVoted: boolean;
  creatorReferrer: string;
  opponentReferrer: string;
  isPublic: boolean;
}

export interface CreateEventChallengeParams {
  question: string;
  category: string;
  position: number;
  minAmount: string;
  maxAmount: string;
  creatorAmount: string;
  resolveTime: number;
  referrer?: string;
  isPublic?: boolean;
}

// Challenge states
export const EventChallengeState = {
  Created: 0,
  Active: 1,
  Resolved: 2,
  Cancelled: 3,
  Expired: 4,
  Disputed: 5,
} as const;

// Positions
export const Position = {
  YES: 0,
  NO: 1,
} as const;

// Results
export const EventResult = {
  Pending: 0,
  YES_Wins: 1,
  NO_Wins: 2,
  Draw: 3,
} as const;

// Category options
export const CATEGORIES = [
  { value: 'Politics', label: 'Politics', emoji: '🏛️' },
  { value: 'Sports', label: 'Sports', emoji: '⚽' },
  { value: 'Crypto', label: 'Crypto', emoji: '₿' },
  { value: 'Entertainment', label: 'Entertainment', emoji: '🎬' },
  { value: 'Technology', label: 'Technology', emoji: '💻' },
  { value: 'Finance', label: 'Finance', emoji: '📈' },
  { value: 'Other', label: 'Other', emoji: '🔮' },
];

/**
 * Hook for Event PK Challenge contract interactions
 */
export function useEventPKChallenge() {
  const { chain } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const eventPKChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'EVENT_PK_CHALLENGE') as `0x${string}`
    : undefined;

  // Create challenge
  const createChallenge = async (params: CreateEventChallengeParams) => {
    if (!eventPKChallengeAddress) return;

    writeContract({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'createChallenge',
      args: [
        params.question,
        params.category,
        params.position,
        parseUnits(params.minAmount, 18),
        parseUnits(params.maxAmount, 18),
        parseUnits(params.creatorAmount, 18),
        BigInt(params.resolveTime),
        params.referrer || '0x0000000000000000000000000000000000000000',
        params.isPublic || false,
      ],
    });
  };

  // Accept challenge
  const acceptChallenge = async (challengeId: bigint, amount: string, referrer?: string) => {
    if (!eventPKChallengeAddress) return;

    writeContract({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'acceptChallenge',
      args: [
        challengeId,
        parseUnits(amount, 18),
        referrer || '0x0000000000000000000000000000000000000000',
      ],
    });
  };

  // Submit vote
  const submitVote = async (challengeId: bigint, vote: number) => {
    if (!eventPKChallengeAddress) return;

    writeContract({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'submitVote',
      args: [challengeId, vote],
    });
  };

  // Cancel challenge
  const cancelChallenge = async (challengeId: bigint) => {
    if (!eventPKChallengeAddress) return;

    writeContract({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'cancelChallenge',
      args: [challengeId],
    });
  };

  // Expire challenge
  const expireChallenge = async (challengeId: bigint) => {
    if (!eventPKChallengeAddress) return;

    writeContract({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'expireChallenge',
      args: [challengeId],
    });
  };

  // Force resolve
  const forceResolve = async (challengeId: bigint) => {
    if (!eventPKChallengeAddress) return;

    writeContract({
      address: eventPKChallengeAddress,
      abi: EventPKChallengeABI.abi,
      functionName: 'forceResolve',
      args: [challengeId],
    });
  };

  return {
    createChallenge,
    acceptChallenge,
    submitVote,
    cancelChallenge,
    expireChallenge,
    forceResolve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    reset,
  };
}

/**
 * Hook for reading event challenge data
 */
export function useEventChallengeData(challengeId: bigint | undefined) {
  const { chain } = useAccount();
  const eventPKChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'EVENT_PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: eventPKChallengeAddress,
    abi: EventPKChallengeABI.abi,
    functionName: 'getChallenge',
    args: challengeId !== undefined ? [challengeId] : undefined,
    query: {
      enabled: challengeId !== undefined && !!eventPKChallengeAddress,
      refetchInterval: 10000,
    },
  });
}

/**
 * Hook for reading user's event challenges
 */
export function useUserEventChallenges(userAddress: `0x${string}` | undefined) {
  const { chain } = useAccount();
  const eventPKChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'EVENT_PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: eventPKChallengeAddress,
    abi: EventPKChallengeABI.abi,
    functionName: 'getUserChallenges',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && !!eventPKChallengeAddress,
    },
  });
}

/**
 * Hook for reading open event challenges
 */
export function useOpenEventChallenges() {
  const { chain } = useAccount();
  const eventPKChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'EVENT_PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: eventPKChallengeAddress,
    abi: EventPKChallengeABI.abi,
    functionName: 'getOpenChallenges',
    query: {
      enabled: !!eventPKChallengeAddress,
      refetchInterval: 30000,
    },
  });
}

/**
 * Hook for reading event PK statistics
 */
export function useEventPKStatistics() {
  const { chain } = useAccount();
  const eventPKChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'EVENT_PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: eventPKChallengeAddress,
    abi: EventPKChallengeABI.abi,
    functionName: 'getStatistics',
    query: {
      enabled: !!eventPKChallengeAddress,
      refetchInterval: 60000,
    },
  });
}

/**
 * Utility function to get state label
 */
export function getEventStateLabel(state: number): string {
  switch (state) {
    case EventChallengeState.Created:
      return 'Waiting';
    case EventChallengeState.Active:
      return 'Active';
    case EventChallengeState.Resolved:
      return 'Resolved';
    case EventChallengeState.Cancelled:
      return 'Cancelled';
    case EventChallengeState.Expired:
      return 'Expired';
    case EventChallengeState.Disputed:
      return 'Disputed';
    default:
      return 'Unknown';
  }
}

/**
 * Utility function to get result label
 */
export function getResultLabel(result: number): string {
  switch (result) {
    case EventResult.Pending:
      return 'Pending';
    case EventResult.YES_Wins:
      return 'YES Wins';
    case EventResult.NO_Wins:
      return 'NO Wins';
    case EventResult.Draw:
      return 'Draw';
    default:
      return 'Unknown';
  }
}

/**
 * Utility function to format address
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
