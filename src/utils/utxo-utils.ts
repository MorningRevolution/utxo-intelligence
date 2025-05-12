
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
    reasons.push('Address reuse detected in outputs');
    recommendations.push('Use unique addresses for each output to improve privacy');
  }

  // Check for mixing tagged UTXOs with different origins
  const tags = inputs.flatMap(input => input.tags);
  const uniqueTags = new Set(tags);

  if (uniqueTags.size > 1) {
    risk = risk === 'high' ? 'high' : 'medium';
    reasons.push('Mixing UTXOs with different tags/sources can link your activities');
    recommendations.push('Try to use UTXOs with the same tag/source in a single transaction');
    
    // Check for specific high-risk tag combinations
    if (tags.includes('Exchange') || tags.includes('Bull KYC')) {
      if (tags.some(tag => ['Personal', 'Gift', 'P2P'].includes(tag))) {
        risk = 'high';
        reasons.push('Mixing KYC exchange UTXOs with personal/P2P UTXOs compromises privacy');
        recommendations.push('Never combine KYC exchange UTXOs with personal/anonymous UTXOs');
      }
    }
  }

  // Check for high-risk inputs
  const highRiskInputs = inputs.filter(input => input.privacyRisk === 'high');
  if (highRiskInputs.length > 0) {
    risk = 'high';
    reasons.push('Using high-risk UTXOs as inputs exposes transaction history');
    recommendations.push('Consider using CoinJoin or other privacy techniques before spending high-risk UTXOs');
  }

  // Check input amount diversity
  const amounts = inputs.map(input => input.amount);
  const uniqueAmounts = new Set(amounts);
  if (uniqueAmounts.size < inputs.length / 2) {
    risk = risk === 'high' ? 'high' : 'medium';
    reasons.push('Low input amount diversity makes transaction easier to identify');
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
  } else {
    // If there's significant time diversity (over 90 days), flag it as potentially problematic
    if ((maxDate - minDate) > 90 * 24 * 60 * 60 * 1000) {
      risk = risk === 'high' ? 'high' : 'medium';
      reasons.push('Mixing very old UTXOs with recent ones may reveal spending patterns');
      recommendations.push('Consider grouping UTXOs by age ranges when spending');
    }
  }

  // Check for potential identifier outputs (round numbers that could be change addresses)
  const roundAmounts = outputAddresses.filter((_, i) => {
    // This is a placeholder for checking if amounts are suspiciously round
    // In a real implementation, we would check the actual amount values
    return i % 2 === 0; // Simplified check for demo purposes
  });
  
  if (roundAmounts.length > 0 && inputs.length > 1) {
    risk = risk === 'high' ? 'high' : 'medium';
    reasons.push('Round amount outputs may reveal change addresses');
    recommendations.push('Consider using a technique like PayJoin to obscure change outputs');
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

  // Generate safe alternative suggestion
  let safeAlternative = null;
  if (risk === 'high' || risk === 'medium') {
    // In a real implementation, this would analyze UTXOs and suggest safer combinations
    // For the demo, we'll just make a placeholder recommendation
    safeAlternative = "Consider using only Coinjoin UTXOs with similar age profiles";
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
    recommendations,
    safeAlternative
  };
};

// Format BTC amount with appropriate precision
export const formatBTC = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) {
    return "₿0.00000000";
  }
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

// Get risk badge style
export const getRiskBadgeStyle = (risk: 'low' | 'medium' | 'high'): string => {
  switch (risk) {
    case 'low':
      return 'bg-risk-low/20 text-risk-low border border-risk-low/20';
    case 'medium':
      return 'bg-risk-medium/20 text-risk-medium border border-risk-medium/20';
    case 'high':
      return 'bg-risk-high/20 text-risk-high border border-risk-high/20';
    default:
      return 'bg-gray-500/20 text-gray-500 border border-gray-500/20';
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
