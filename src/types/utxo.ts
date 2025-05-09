export interface UTXO {
  txid: string;
  vout: number;
  address: string;
  amount: number; // In BTC
  confirmations: number;
  scriptPubKey: string;
  tags: string[];
  createdAt: string; // ISO date string
  privacyRisk: 'low' | 'medium' | 'high';
  acquisitionDate: string | null;
  acquisitionFiatValue: number | null;
  acquisitionBtcPrice: number | null; // Added field for BTC price at acquisition
  disposalDate: string | null;
  disposalFiatValue: number | null;
  realizedGainFiat: number | null;
  costAutoPopulated: boolean;
  notes: string | null;
  senderAddress: string | null;
  receiverAddress: string | null;
  walletName?: string; // Which wallet this UTXO belongs to
}

export interface WalletData {
  name: string;
  totalBalance: number; // In BTC
  utxos: UTXO[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  inputs: UTXO[];
  outputs: {
    address: string;
    amount: number;
  }[];
  fee: number;
  timestamp: string;
  privacyRisk: 'low' | 'medium' | 'high';
  reasons: string[];
}

export interface SimulationResult {
  transaction: Transaction;
  privacyRisk: 'low' | 'medium' | 'high';
  reasons: string[];
  recommendations: string[];
  safeAlternative?: string | null;
}

export interface Report {
  generatedAt: string;
  walletName: string;
  utxoCount: number;
  totalBalance: number;
  privacyScore: number; // 0-100
  tagBreakdown: {
    tagName: string;
    count: number;
    totalAmount: number;
  }[];
  riskyUtxos: UTXO[];
  recommendations: string[];
}

export interface PortfolioData {
  currentValue: number;
  totalCost: number;
  unrealizedGain: number;
  unrealizedGainPercentage: number;
  tagAllocation: TagAllocation[];
  balanceHistory: BalanceHistoryItem[];
  currency: string;
}

export interface BalanceHistoryItem {
  date: string;
  balance: number; // In BTC
  fiatValue: number; // In selected currency
  fiatGain: number; // In selected currency
}

export interface TagAllocation {
  tag: string;
  amount: number; // In BTC
  percentage: number; // As decimal
  fiatValue: number; // In selected currency
}
