
import { UTXO, WalletData, Tag, Transaction } from '../types/utxo';
import { subDays, format, subMonths, subYears, addDays } from 'date-fns';

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

// More realistic historical Bitcoin prices (USD)
const historicalBtcPrices: Record<string, number> = {
  '2022-01': 38000,
  '2022-04': 40000,
  '2022-07': 23000,
  '2022-10': 19000,
  '2023-01': 16500,
  '2023-04': 28000,
  '2023-07': 30000,
  '2023-10': 27000,
  '2024-01': 42000,
  '2024-04': 70000,
};

// Generate realistic date in the past 2 years
const getRealisticDate = () => {
  const randomMonths = Math.floor(Math.random() * 24); // 0-23 months ago
  return format(subMonths(new Date(), randomMonths), 'yyyy-MM-dd');
};

// Get realistic BTC price based on date
const getRealisticBTCPrice = (date: string) => {
  const yearMonth = date.substring(0, 7); // Get YYYY-MM part
  
  // Find closest month in our historical data
  const months = Object.keys(historicalBtcPrices).sort();
  let closestMonth = months[0];
  
  for (const month of months) {
    if (month <= yearMonth) {
      closestMonth = month;
    } else {
      break;
    }
  }
  
  // Add some randomness to the price (±5%)
  const basePrice = historicalBtcPrices[closestMonth];
  const randomFactor = 0.95 + (Math.random() * 0.1); // 0.95 to 1.05
  
  return Math.round(basePrice * randomFactor);
};

// Generate realistic amounts based on common UTXO patterns
const getRealisticAmount = () => {
  const pattern = Math.floor(Math.random() * 5);
  
  switch (pattern) {
    case 0: // Small change (~0.001 - 0.01 BTC)
      return Math.round(Math.random() * 900 + 100) / 100000;
    case 1: // Medium (~0.01 - 0.1 BTC)
      return Math.round(Math.random() * 90 + 10) / 1000;
    case 2: // Standard (~0.1 - 0.5 BTC)
      return Math.round(Math.random() * 400 + 100) / 1000;
    case 3: // Large (~0.5 - 2 BTC)
      return Math.round(Math.random() * 150 + 50) / 100;
    case 4: // Round number (exactly 0.1, 0.5, 1.0 BTC)
      const roundOptions = [0.1, 0.2, 0.5, 1.0, 2.0];
      return roundOptions[Math.floor(Math.random() * roundOptions.length)];
    default:
      return Math.round(Math.random() * 100) / 100;
  }
};

// Generate realistic cost basis (could be higher or lower than market price)
const getRealisticCostBasis = (marketPrice: number, amount: number) => {
  const premiumFactor = 0.85 + (Math.random() * 0.3); // 0.85 to 1.15 (±15% from market)
  return Math.round(marketPrice * premiumFactor * amount);
};

// Create fixed addresses for address reuse scenarios
const commonAddresses = [
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', // Donation address
  'bc1q9jd8qh84gkl5trg6mvz729fj8xp9mjr7hjyzke', // Exchange deposit address
  'bc1qz2x3c4v5b6n7m8a9s0d1f2g3h4j5k6l7p8q9w', // Merchant payment address
  'bc1q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l', // Personal wallet address
];

// Generate a batch of random addresses for other UTXOs
const randomAddresses = Array.from({ length: 40 }, () => 
  `bc1${Math.random().toString(36).substring(2, 38)}`
);

// Create address relationship groups to simulate realistic transaction graphs
const addressGroups = {
  exchange: [
    commonAddresses[1], 
    randomAddresses[0], 
    randomAddresses[1], 
    randomAddresses[2]
  ],
  personal: [
    commonAddresses[3], 
    randomAddresses[3], 
    randomAddresses[4], 
    randomAddresses[5]
  ],
  merchant: [
    commonAddresses[2], 
    randomAddresses[6], 
    randomAddresses[7]
  ],
  donation: [
    commonAddresses[0], 
    randomAddresses[8]
  ],
};

// Assign realistic wallet names
const walletNames = ["Main Wallet", "Cold Storage", "Wallet 2", "Hardware Wallet"];

// Create UTXOs with realistic transaction relationships
export const mockUTXOs: UTXO[] = Array.from({ length: 25 }, (_, i) => {
  const acquisitionDate = getRealisticDate();
  const amount = getRealisticAmount();
  const btcPrice = getRealisticBTCPrice(acquisitionDate);
  const fiatValue = getRealisticCostBasis(btcPrice, amount);
  
  // Select 1-3 tags randomly with weighted probabilities
  const numTags = Math.random() > 0.7 ? (Math.random() > 0.5 ? 3 : 2) : 1;
  const selectedTags = [];
  
  // Assign tags based on index to create patterns
  if (i % 5 === 0) {
    selectedTags.push(mockTags[0].name); // Exchange
  } else if (i % 5 === 1) {
    selectedTags.push(mockTags[2].name); // Personal
  } else if (i % 5 === 2) {
    selectedTags.push(mockTags[3].name); // Merchant
  } else if (i % 8 === 3) {
    selectedTags.push(mockTags[5].name); // Coinjoin
  } else {
    // Random tag
    const randomTag = mockTags[Math.floor(Math.random() * mockTags.length)].name;
    selectedTags.push(randomTag);
  }
  
  // Add additional tags if needed
  while (selectedTags.length < numTags) {
    const randomTag = mockTags[Math.floor(Math.random() * mockTags.length)].name;
    if (!selectedTags.includes(randomTag)) {
      selectedTags.push(randomTag);
    }
  }
  
  // Assign sender and receiver addresses based on tag patterns
  let senderAddress: string | null = null;
  let receiverAddress: string | null = null;
  let outputAddress: string | null = null;
  
  // Base privacy risk on patterns
  let privacyRisk: 'low' | 'medium' | 'high' = 'low';
  
  if (selectedTags.includes('Exchange')) {
    // Exchange UTXOs often have known sender addresses
    senderAddress = addressGroups.exchange[Math.floor(Math.random() * addressGroups.exchange.length)];
    
    // 30% chance of address reuse (high privacy risk)
    if (Math.random() < 0.3) {
      outputAddress = senderAddress;
      privacyRisk = 'high';
    } else {
      outputAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
      privacyRisk = 'medium';
    }
    
  } else if (selectedTags.includes('Personal')) {
    senderAddress = addressGroups.personal[Math.floor(Math.random() * addressGroups.personal.length)];
    outputAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
    privacyRisk = Math.random() < 0.7 ? 'low' : 'medium';
    
  } else if (selectedTags.includes('Merchant')) {
    // Merchant payments often go to known addresses
    senderAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
    outputAddress = addressGroups.merchant[Math.floor(Math.random() * addressGroups.merchant.length)];
    
    // High risk for certain merchant patterns
    privacyRisk = Math.random() < 0.4 ? 'high' : 'medium';
    
  } else if (selectedTags.includes('Coinjoin')) {
    // Coinjoins have multiple inputs, simulated with receiverAddress
    senderAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
    receiverAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
    outputAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
    privacyRisk = 'low'; // Generally low privacy risk with coinjoins
    
  } else if (selectedTags.includes('Donation')) {
    // Donations often go to well-known addresses
    senderAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
    outputAddress = addressGroups.donation[Math.floor(Math.random() * addressGroups.donation.length)];
    privacyRisk = 'medium';
    
  } else {
    // Default case for other tags
    senderAddress = Math.random() > 0.3 ? randomAddresses[Math.floor(Math.random() * randomAddresses.length)] : null;
    outputAddress = randomAddresses[Math.floor(Math.random() * randomAddresses.length)];
    
    // Randomize privacy risk with weighted distribution
    const riskRoll = Math.random();
    if (riskRoll < 0.6) privacyRisk = 'low';
    else if (riskRoll < 0.85) privacyRisk = 'medium';
    else privacyRisk = 'high';
  }
  
  // Assign walletName with pattern - primarily for demo of wallet filter
  const walletName = i % 7 === 0 ? walletNames[1] : 
                    i % 5 === 0 ? walletNames[2] : 
                    i % 3 === 0 ? walletNames[3] : 
                    walletNames[0];
  
  return {
    txid: `tx${i + 1}_${Math.random().toString(36).substring(2, 15)}`,
    vout: Math.floor(Math.random() * 4),
    address: outputAddress || randomAddresses[Math.floor(Math.random() * randomAddresses.length)],
    amount,
    confirmations: Math.floor(Math.random() * 1000) + 1,
    scriptPubKey: `0014${Math.random().toString(36).substring(2, 38)}`,
    tags: selectedTags,
    createdAt: acquisitionDate + 'T' + new Date().toISOString().split('T')[1],
    privacyRisk,
    acquisitionDate,
    acquisitionFiatValue: fiatValue,
    acquisitionBtcPrice: btcPrice,
    disposalDate: null,
    disposalFiatValue: null,
    realizedGainFiat: null,
    costAutoPopulated: Math.random() > 0.7, // 30% are auto-populated
    notes: Math.random() > 0.6 ? `Demo UTXO #${i + 1} - ${selectedTags.join(', ')}` : null,
    senderAddress,
    receiverAddress,
    walletName: Math.random() > 0.3 ? walletName : undefined
  };
});

export const mockWalletData: WalletData = {
  name: 'Demo Wallet',
  totalBalance: mockUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0),
  utxos: mockUTXOs
};

// Create more realistic transactions with multiple inputs/outputs
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
      "scriptPubKey": "00141a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r",
      "senderAddress": null,
      "receiverAddress": null
    },
    {
      "txid": "2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u",
      "vout": 1,
      "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "amount": 0.15,
      "confirmations": 234,
      "scriptPubKey": "00142b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r",
      "senderAddress": null,
      "receiverAddress": null
    }
  ]
}`;
