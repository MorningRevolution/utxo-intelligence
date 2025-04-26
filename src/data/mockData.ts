import { UTXO, WalletData, Tag, Transaction } from '../types/utxo';

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

export const mockUTXOs: UTXO[] = [
  {
    txid: '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
    vout: 0,
    address: 'bc1qu6jf0q7cjmj9pz4ymmwdj6tt4rdh2z9vqzt3xw',
    amount: 0.25,
    confirmations: 145,
    scriptPubKey: '00141a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r',
    tags: ['Exchange', 'Bull KYC'],
    createdAt: '2023-10-12T14:32:11Z',
    privacyRisk: 'high',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: '2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u',
    vout: 1,
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    amount: 0.15,
    confirmations: 234,
    scriptPubKey: '00142b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r',
    tags: ['Personal'],
    createdAt: '2023-11-05T08:17:23Z',
    privacyRisk: 'low',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: '3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v',
    vout: 0,
    address: 'bc1qk0d8kpxzmvz83d8h8am9pt3vzs80rz2wvmrj4f',
    amount: 0.05,
    confirmations: 67,
    scriptPubKey: '00143c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r',
    tags: ['Mining'],
    createdAt: '2024-01-15T19:42:56Z',
    privacyRisk: 'medium',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: '4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w',
    vout: 2,
    address: 'bc1q9jd8qh84gkl5trg6mvz729fj8xp9mjr7hjyzke',
    amount: 0.1,
    confirmations: 312,
    scriptPubKey: '00144d5e6f7g8h9i0j1k2l3m4n5o6p7q8r',
    tags: ['Merchant'],
    createdAt: '2023-09-20T11:25:37Z',
    privacyRisk: 'medium',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: '5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x',
    vout: 1,
    address: 'bc1qy0kc8h7j4f5g6h7j8k9l0p1q2r3s4t5u6v7w8x',
    amount: 0.3,
    confirmations: 89,
    scriptPubKey: '00145e6f7g8h9i0j1k2l3m4n5o6p7q8r',
    tags: ['Savings'],
    createdAt: '2024-02-01T15:10:44Z',
    privacyRisk: 'low',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: '6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y',
    vout: 0,
    address: 'bc1qa2s3d4f5g6h7j8k9l0p1q2w3e4r5t6y7u8i9o',
    amount: 0.02,
    confirmations: 423,
    scriptPubKey: '00146f7g8h9i0j1k2l3m4n5o6p7q8r',
    tags: ['Donation'],
    createdAt: '2023-07-03T22:14:09Z',
    privacyRisk: 'low',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: '7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z',
    vout: 3,
    address: 'bc1qz2x3c4v5b6n7m8a9s0d1f2g3h4j5k6l7p8q9w',
    amount: 0.5,
    confirmations: 156,
    scriptPubKey: '00147g8h9i0j1k2l3m4n5o6p7q8r',
    tags: ['Coinjoin'],
    createdAt: '2023-12-12T03:45:21Z',
    privacyRisk: 'low',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: '8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a',
    vout: 1,
    address: 'bc1q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l',
    amount: 0.08,
    confirmations: 267,
    scriptPubKey: '00148h9i0j1k2l3m4n5o6p7q8r',
    tags: ['Exchange', 'Bull KYC'],
    createdAt: '2023-10-30T16:22:38Z',
    privacyRisk: 'high',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: '9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b',
    vout: 2,
    address: 'bc1q9o8i7u6y5t4r3e2w1q0p9a8s7d6f5g4h3j2k',
    amount: 0.12,
    confirmations: 78,
    scriptPubKey: '00149i0j1k2l3m4n5o6p7q8r',
    tags: ['Personal', 'Gift'],
    createdAt: '2024-01-25T09:11:53Z',
    privacyRisk: 'medium',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: '0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c',
    vout: 0,
    address: 'bc1ql2k3j4h5g6f7d8s9a0p1o2i3u4y5t6r7e8w9',
    amount: 0.35,
    confirmations: 213,
    scriptPubKey: '00140j1k2l3m4n5o6p7q8r',
    tags: ['Mining'],
    createdAt: '2023-11-18T05:37:42Z',
    privacyRisk: 'low',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
    vout: 1,
    address: 'bc1qw3e4r5t6y7u8i9o0p1a2s3d4f5g6h7j8k9l0',
    amount: 0.17,
    confirmations: 324,
    scriptPubKey: '0014a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5',
    tags: ['P2P'],
    createdAt: '2023-08-22T13:19:27Z',
    privacyRisk: 'medium',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1',
    vout: 2,
    address: 'bc1q3e4r5t6y7u8i9o0p1a2s3d4f5g6h7j8k9l0z',
    amount: 0.42,
    confirmations: 175,
    scriptPubKey: '0014b2c3d4e5f6g7h8i9j0k1l2m3n4o5',
    tags: ['Coinjoin'],
    createdAt: '2023-12-05T18:02:13Z',
    privacyRisk: 'low',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2',
    vout: 0,
    address: 'bc1qe4r5t6y7u8i9o0p1a2s3d4f5g6h7j8k9l0z1',
    amount: 0.22,
    confirmations: 97,
    scriptPubKey: '0014c3d4e5f6g7h8i9j0k1l2m3n4o5',
    tags: ['Gift'],
    createdAt: '2024-01-30T20:45:18Z',
    privacyRisk: 'low',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  },
  {
    txid: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3',
    vout: 3,
    address: 'bc1qr5t6y7u8i9o0p1a2s3d4f5g6h7j8k9l0z1x2',
    amount: 0.63,
    confirmations: 284,
    scriptPubKey: '0014d4e5f6g7h8i9j0k1l2m3n4o5',
    tags: ['Savings', 'P2P'],
    createdAt: '2023-09-10T08:33:51Z',
    privacyRisk: 'medium',
    acquisitionDate: null,
    acquisitionFiatValue: null,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: false,
    notes: ''
  }
];

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
