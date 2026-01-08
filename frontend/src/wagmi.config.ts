import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bscTestnet, bsc } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'IVY Predict',
  projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com/
  chains: [bscTestnet, bsc],
  ssr: false,
});
