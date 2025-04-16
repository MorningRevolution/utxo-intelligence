import { UTXO, Transaction, SimulationResult } from "../types/utxo";

// Calculate the privacy risk for a transaction
export const calculateTransactionPrivacyRisk = (
  inputs: UTXO[],
  outputAddresses: string[]
): SimulationResult => {
  // Default values
  let risk: 'low' | 'medium' | 'high' = 'low';
  const reasons: string[] = [];
  const recommendations: string[] = [];

  // Check for address reuse
  const uniqueAddresses = new Set(outputAddresses);
  if (uniqueAddresses.size < outputAddresses.length) {
    risk = 'high';
    reasons.push('Output address reuse detected');
    recommendations.push('Avoid using the same address for multiple outputs');
  }

  // Check for mixing tagged UTXOs
  const tags = inputs.flatMap(input => input.tags);
  const uniqueTags = new Set(tags);

  if (uniqueTags.size > 1) {
    risk = risk === 'high' ? 'high' : 'medium';
    reasons.push('Mixing UTXOs with different tags can reduce privacy');
    recommendations.push('Try to use UTXOs with the same tag in a single transaction');
  }

  // Check for high-risk inputs
  const highRiskInputs = inputs.filter(input => input.privacyRisk === 'high');
  if (highRiskInputs.length > 0) {
    risk = 'high';
    reasons.push('Using high-risk UTXOs as inputs');
    recommendations.push('Consider using CoinJoin or other privacy techniques before spending high-risk UTXOs');
  }

  // Check input amount diversity
  const amounts = inputs.map(input => input.amount);
  const uniqueAmounts = new Set(amounts);
  if (uniqueAmounts.size < inputs.length / 2) {
    risk = risk === 'high' ? 'high' : 'medium';
    reasons.push('Low input amount diversity');
    recommendations.push('Use inputs with different amounts to improve privacy');
  }

  // Analyze input age diversity
  const dates = inputs.map(input => new Date(input.createdAt).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  
  // If the time range is less than 7 days, flag it
  if ((maxDate - minDate) < 7 * 24 * 60 * 60 * 1000) {
    reasons.push('Low time diversity between inputs');
    recommendations.push('Use UTXOs of different ages to improve transaction privacy');
  }

  // If no specific issues were found but we have mixed UTXOs, keep medium
  if (reasons.length === 0 && inputs.length > 1) {
    risk = 'low';
    reasons.push('No specific privacy issues detected');
    recommendations.push('Continue using good practices for UTXO management');
  }
  
  // If there's just one input, it's generally not great for privacy
  if (inputs.length === 1) {
    risk = 'medium';
    reasons.push('Single-input transaction has reduced privacy');
    recommendations.push('Consider using multiple inputs to improve transaction privacy');
  }

  return {
    transaction: {
      id: `sim-${Date.now()}`,
      inputs,
      outputs: outputAddresses.map((address, i) => ({ 
        address, 
        amount: i === 0 ? 0.5 : 0.1 // Simplified mock output amounts
      })),
      fee: 0.0001 * inputs.length, // Simple fee calculation
      timestamp: new Date().toISOString(),
      privacyRisk: risk,
      reasons
    },
    privacyRisk: risk,
    reasons,
    recommendations
  };
};

// Format BTC amount with appropriate precision
export const formatBTC = (amount: number): string => {
  return `₿${amount.toFixed(8)}`;
};

// Format shortened txid (first 6 chars...last 6 chars)
export const formatTxid = (txid: string): string => {
  if (txid.length <= 12) return txid;
  return `${txid.substring(0, 6)}...${txid.substring(txid.length - 6)}`;
};

// Calculate privacy score for a wallet (0-100)
export const calculatePrivacyScore = (utxos: UTXO[]): number => {
  if (utxos.length === 0) return 100;
  
  const highRiskCount = utxos.filter(u => u.privacyRisk === 'high').length;
  const mediumRiskCount = utxos.filter(u => u.privacyRisk === 'medium').length;
  const totalUtxos = utxos.length;
  
  // Calculate score: high risk UTXOs subtract 30 points, medium risk subtract 10 points
  const score = 100 - ((highRiskCount * 30 + mediumRiskCount * 10) / totalUtxos);
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
};

// Get color for privacy risk
export const getRiskColor = (risk: 'low' | 'medium' | 'high'): string => {
  switch (risk) {
    case 'low':
      return 'bg-risk-low';
    case 'medium':
      return 'bg-risk-medium';
    case 'high':
      return 'bg-risk-high';
    default:
      return 'bg-gray-400';
  }
};

// Get text color for privacy risk
export const getRiskTextColor = (risk: 'low' | 'medium' | 'high'): string => {
  switch (risk) {
    case 'low':
      return 'text-risk-low';
    case 'medium':
      return 'text-risk-medium';
    case 'high':
      return 'text-risk-high';
    default:
      return 'text-gray-400';
  }
};

// Create downloadable JSON file content
export const createDownloadableJSON = (data: any): string => {
  return `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
};

// Create downloadable CSV file content
export const createDownloadableCSV = (data: UTXO[]): string => {
  const headers = ['txid', 'vout', 'address', 'amount', 'confirmations', 'scriptPubKey', 'tags', 'privacyRisk'];
  const rows = data.map(utxo => [
    utxo.txid,
    utxo.vout,
    utxo.address,
    utxo.amount,
    utxo.confirmations,
    utxo.scriptPubKey,
    utxo.tags.join('|'),
    utxo.privacyRisk
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
};
