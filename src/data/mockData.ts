import { UTXO, WalletData, Tag, Transaction } from '../types/utxo';
import { subDays, format } from 'date-fns';

export const mockTags: Tag[] = [
  { id: '1', name: 'Exchange', color: '#3b82f6' },
  { id: '2', name: 'Mining', color: '#10b981' },
  { id: '3', name: 'Personal', color: '#8b5cf6' },
  { id: '4', name: 'Merchant', color: '#f59e0b' },
  { id: '5', name: 'Donation', color: '#ef4444' },
  { id: '6', name: 'Coinjoin', color: '#6366f1' },
  { id: '7', name: 'Savings', color: '#ec4899' },
  { id: '8', name: 'Bull KYC', color: '#2dd4bf' },
  { id: '9', name: 'Gift', color: '#f97316' },
  { id: '10', name: 'P2P', color: '#a855f7' },
];

const getRandomRecentDate = () => {
  const daysAgo = Math.floor(Math.random() * 364) + 1; // 1-364 days ago
  return format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');
};

const getRealisticBTCPrice = (date: string) => {
  const basePrice = 45000; // Base price around $45k
  const volatility = 0.3; // 30% volatility
  const daysFromNow = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  const trendFactor = 1 + (364 - daysFromNow) * 0.001; // Slight upward trend
  const randomFactor = 1 + (Math.random() - 0.5) * volatility;
  return Math.round(basePrice * trendFactor * randomFactor);
};

export const mockUTXOs: UTXO[] = Array.from({ length: 15 }, (_, i) => {
  const acquisitionDate = getRandomRecentDate();
  const amount = Math.round(Math.random() * 100) / 100; // 0.00-0.99 BTC
  const price = getRealisticBTCPrice(acquisitionDate);
  
  return {
    txid: `tx${i + 1}_${Math.random().toString(36).substring(2, 15)}`,
    vout: Math.floor(Math.random() * 4),
    address: `bc1${Math.random().toString(36).substring(2, 38)}`,
    amount,
    confirmations: Math.floor(Math.random() * 1000) + 1,
    scriptPubKey: `0014${Math.random().toString(36).substring(2, 38)}`,
    tags: [mockTags[Math.floor(Math.random() * mockTags.length)].name],
    createdAt: acquisitionDate + 'T' + new Date().toISOString().split('T')[1],
    privacyRisk: Math.random() < 0.2 ? 'high' : Math.random() < 0.5 ? 'medium' : 'low',
    acquisitionDate,
    acquisitionFiatValue: amount * price,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: `Demo UTXO #${i + 1}`
  };
});

export const mockWalletData: WalletData = {
  name: 'Demo Wallet',
  totalBalance: mockUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0),
  utxos: mockUTXOs
};

export const mockTransactions: Transaction[] = [
  {
    id: 'tx1',
    inputs: [mockUTXOs[0], mockUTXOs[1]],
    outputs: [
      { address: 'bc1q9jd8qh84gkl5trg6mvz729fj8xp9mjr7hjyzke', amount: 0.35 },
      { address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', amount: 0.04 }
    ],
    fee: 0.01,
    timestamp: '2024-01-20T14:32:11Z',
    privacyRisk: 'high',
    reasons: ['Address reuse detected', 'Mixed tagged coins']
  },
  {
    id: 'tx2',
    inputs: [mockUTXOs[4]],
    outputs: [
      { address: 'bc1qa2s3d4f5g6h7j8k9l0p1q2w3e4r5t6y7u8i9o', amount: 0.25 },
      { address: 'bc1qz2x3c4v5b6n7m8a9s0d1f2g3h4j5k6l7p8q9w', amount: 0.04 }
    ],
    fee: 0.01,
    timestamp: '2024-02-05T10:17:23Z',
    privacyRisk: 'low',
    reasons: ['Good input anonymity set']
  },
  {
    id: 'tx3',
    inputs: [mockUTXOs[6], mockUTXOs[7]],
    outputs: [
      { address: 'bc1q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l', amount: 0.45 },
      { address: 'bc1ql2k3j4h5g6f7d8s9a0p1o2i3u4y5t6r7e8w9', amount: 0.12 }
    ],
    fee: 0.01,
    timestamp: '2024-01-30T19:42:56Z',
    privacyRisk: 'medium',
    reasons: ['Coinjoin outputs not equally sized']
  }
];

export const mockPrivacyRecommendations: string[] = [
  "Consider using a Coinjoin transaction for your high-risk UTXOs to improve privacy",
  "Avoid reusing addresses for better transaction privacy",
  "Use separate wallets for different purposes (personal, business, etc.)",
  "Implement coin control when sending Bitcoin to prevent transaction linkability",
  "Consider using PayJoin for everyday transactions to improve transaction graph privacy",
  "Use a privacy-focused wallet that supports advanced features like coin selection",
  "Be cautious when dealing with exchange-tagged UTXOs as they can be linked to your identity",
  "When possible, batch multiple payments into a single transaction to reduce blockchain footprint",
  "Avoid combining UTXOs with different tags or origins in the same transaction",
  "Consider waiting for additional confirmations before spending high-risk UTXOs"
];

export const mockWalletJson = `{
  "name": "Demo Wallet",
  "utxos": [
    {
      "txid": "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
      "vout": 0,
      "address": "bc1qu6jf0q7cjmj9pz4ymmwdj6tt4rdh2z9vqzt3xw",
      "amount": 0.25,
      "confirmations": 145,
      "scriptPubKey": "00141a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r"
    },
    {
      "txid": "2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u",
      "vout": 1,
      "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "amount": 0.15,
      "confirmations": 234,
      "scriptPubKey": "00142b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r"
    }
  ]
}`;
