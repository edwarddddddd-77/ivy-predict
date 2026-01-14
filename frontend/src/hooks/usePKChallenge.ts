import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import PKChallengeABI from '../contracts/abis/PKChallenge.json';
import { getContractAddress } from '../contracts/addresses';

// Types
export interface Challenge {
  challengeId: bigint;
  creator: string;
  opponent: string;
  minAmount: bigint;
  maxAmount: bigint;
  creatorAmount: bigint;
  opponentAmount: bigint;
  assetSymbol: string;
  duration: number;
  creatorDirection: number;
  priceFeed: string;
  startPrice: bigint;
  endPrice: bigint;
  createdAt: bigint;
  acceptedAt: bigint;
  expiresAt: bigint;
  settleTime: bigint;
  state: number;
  winner: string;
  creatorReferrer: string;
  opponentReferrer: string;
}

export interface CreateChallengeParams {
  assetSymbol: string;
  duration: number;
  direction: number;
  minAmount: string;
  maxAmount: string;
  creatorAmount: string;
  referrer?: string;
  isPublic?: boolean;
}

// Challenge states
export const ChallengeState = {
  Created: 0,
  Active: 1,
  Resolved: 2,
  Cancelled: 3,
  Expired: 4,
} as const;

// Price directions
export const PriceDirection = {
  UP: 0,
  DOWN: 1,
} as const;

// Duration options
export const Duration = {
  FIVE_MINUTES: 0,
  FIFTEEN_MINUTES: 1,
  ONE_HOUR: 2,
  FOUR_HOURS: 3,
  ONE_DAY: 4,
} as const;

export const DURATION_LABELS: Record<number, string> = {
  0: '5 Minutes',
  1: '15 Minutes',
  2: '1 Hour',
  3: '4 Hours',
  4: '24 Hours',
};

export const DURATION_SECONDS: Record<number, number> = {
  0: 5 * 60,
  1: 15 * 60,
  2: 60 * 60,
  3: 4 * 60 * 60,
  4: 24 * 60 * 60,
};

/**
 * Hook for PK Challenge contract interactions
 */
export function usePKChallenge() {
  const { chain } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;

  // Create challenge
  const createChallenge = async (params: CreateChallengeParams) => {
    if (!pkChallengeAddress) return;

    writeContract({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'createChallenge',
      args: [
        params.assetSymbol,
        params.duration,
        params.direction,
        parseUnits(params.minAmount, 18),
        parseUnits(params.maxAmount, 18),
        parseUnits(params.creatorAmount, 18),
        params.referrer || '0x0000000000000000000000000000000000000000',
        params.isPublic || false,
      ],
    });
  };

  // Accept challenge
  const acceptChallenge = async (challengeId: bigint, amount: string, referrer?: string) => {
    if (!pkChallengeAddress) return;

    writeContract({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'acceptChallenge',
      args: [
        challengeId,
        parseUnits(amount, 18),
        referrer || '0x0000000000000000000000000000000000000000',
      ],
    });
  };

  // Resolve challenge
  const resolveChallenge = async (challengeId: bigint) => {
    if (!pkChallengeAddress) return;

    writeContract({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'resolveChallenge',
      args: [challengeId],
    });
  };

  // Cancel challenge
  const cancelChallenge = async (challengeId: bigint) => {
    if (!pkChallengeAddress) return;

    writeContract({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'cancelChallenge',
      args: [challengeId],
    });
  };

  // Expire challenge
  const expireChallenge = async (challengeId: bigint) => {
    if (!pkChallengeAddress) return;

    writeContract({
      address: pkChallengeAddress,
      abi: PKChallengeABI.abi,
      functionName: 'expireChallenge',
      args: [challengeId],
    });
  };

  return {
    createChallenge,
    acceptChallenge,
    resolveChallenge,
    cancelChallenge,
    expireChallenge,
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
 * Hook for reading challenge data
 */
export function useChallengeData(challengeId: bigint | undefined) {
  const { chain } = useAccount();
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: pkChallengeAddress,
    abi: PKChallengeABI.abi,
    functionName: 'getChallenge',
    args: challengeId !== undefined ? [challengeId] : undefined,
    query: {
      enabled: challengeId !== undefined && !!pkChallengeAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });
}

/**
 * Hook for reading user's challenges
 */
export function useUserChallenges(userAddress: `0x${string}` | undefined) {
  const { chain } = useAccount();
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: pkChallengeAddress,
    abi: PKChallengeABI.abi,
    functionName: 'getUserChallenges',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && !!pkChallengeAddress,
    },
  });
}

/**
 * Hook for reading open challenges
 */
export function useOpenChallenges() {
  const { chain } = useAccount();
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: pkChallengeAddress,
    abi: PKChallengeABI.abi,
    functionName: 'getOpenChallenges',
    query: {
      enabled: !!pkChallengeAddress,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });
}

/**
 * Hook for checking if a challenge can be resolved
 */
export function useCanResolve(challengeId: bigint | undefined) {
  const { chain } = useAccount();
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: pkChallengeAddress,
    abi: PKChallengeABI.abi,
    functionName: 'canResolve',
    args: challengeId !== undefined ? [challengeId] : undefined,
    query: {
      enabled: challengeId !== undefined && !!pkChallengeAddress,
      refetchInterval: 5000, // Check every 5 seconds
    },
  });
}

/**
 * Hook for getting time remaining
 */
export function useTimeRemaining(challengeId: bigint | undefined) {
  const { chain } = useAccount();
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: pkChallengeAddress,
    abi: PKChallengeABI.abi,
    functionName: 'getTimeRemaining',
    args: challengeId !== undefined ? [challengeId] : undefined,
    query: {
      enabled: challengeId !== undefined && !!pkChallengeAddress,
      refetchInterval: 1000, // Update every second
    },
  });
}

/**
 * Hook for getting supported assets
 */
export function useSupportedAssets() {
  const { chain } = useAccount();
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: pkChallengeAddress,
    abi: PKChallengeABI.abi,
    functionName: 'getSupportedAssets',
    query: {
      enabled: !!pkChallengeAddress,
    },
  });
}

/**
 * Hook for getting statistics
 */
export function usePKStatistics() {
  const { chain } = useAccount();
  const pkChallengeAddress = chain?.id
    ? getContractAddress(chain.id, 'PK_CHALLENGE') as `0x${string}`
    : undefined;

  return useReadContract({
    address: pkChallengeAddress,
    abi: PKChallengeABI.abi,
    functionName: 'getStatistics',
    query: {
      enabled: !!pkChallengeAddress,
      refetchInterval: 60000, // Refetch every minute
    },
  });
}

/**
 * Utility function to format address
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Utility function to get state label
 */
export function getStateLabel(state: number): string {
  switch (state) {
    case ChallengeState.Created:
      return 'Waiting';
    case ChallengeState.Active:
      return 'Active';
    case ChallengeState.Resolved:
      return 'Resolved';
    case ChallengeState.Cancelled:
      return 'Cancelled';
    case ChallengeState.Expired:
      return 'Expired';
    default:
      return 'Unknown';
  }
}
