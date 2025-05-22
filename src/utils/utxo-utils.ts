
import { UTXO } from "@/types/utxo";

// Format BTC amount with options to trim trailing zeros and specify decimal places
export const formatBTC = (amount: number, options?: { trimZeros?: boolean; minDecimals?: number; maxDecimals?: number }): string => {
  const { trimZeros = true, minDecimals = 2, maxDecimals = 8 } = options || {};
  
  if (trimZeros) {
    // Format with max decimal places
    const formatted = amount.toFixed(maxDecimals);
    // Remove trailing zeros (but keep decimal point)
    const trimmed = formatted.replace(/\.?0+$/, '');
    
    // If there's no decimal point or fewer decimals than minimum, format again
    if (!trimmed.includes('.') || trimmed.split('.')[1].length < minDecimals) {
      return `${Number(amount).toFixed(minDecimals)} BTC`;
    }
    
    return `${trimmed} BTC`;
  }
  
  // Traditional formatting without trimming
  return `${amount.toFixed(maxDecimals)} BTC`;
};

// Format fiat amount for display
export const formatFiat = (amount: number | null, currency: string = "USD"): string => {
  if (amount === null) return "-";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Calculate fiat value based on BTC amount and price
export const calculateFiatValue = (btcAmount: number, btcPrice: number | null): number | null => {
  if (btcPrice === null) return null;
  return btcAmount * btcPrice;
};

// Get badge style for risk level
export const getRiskBadgeStyle = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'high':
      return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20';
    case 'low':
      return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
    default:
      return 'bg-primary/10 text-primary hover:bg-primary/20';
  }
};

// Get color for risk level
export const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'high':
      return '#ea384c'; // Red
    case 'medium':
      return '#f97316'; // Orange
    case 'low':
      return '#10b981'; // Green
    default:
      return '#8E9196'; // Gray
  }
};

// Get text color for risk level (for text on contrasting backgrounds)
export const getRiskTextColor = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-amber-500';
    case 'low':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

// Format txid to a shorter form
export const formatTxid = (txid: string, length: number = 8) => {
  if (!txid) return '';
  if (txid.length <= length * 2) return txid;
  return `${txid.substring(0, length)}...${txid.substring(txid.length - length)}`;
};

// Calculate privacy score from UTXOs
export const calculatePrivacyScore = (utxos: any[]) => {
  if (!utxos || utxos.length === 0) return 0;
  
  // Count UTXOs by risk level
  const riskCounts = {
    low: 0,
    medium: 0,
    high: 0
  };
  
  utxos.forEach(utxo => {
    if (utxo.privacyRisk in riskCounts) {
      riskCounts[utxo.privacyRisk as keyof typeof riskCounts]++;
    }
  });
  
  // Calculate weighted score (low: 100, medium: 50, high: 0)
  const totalUtxos = utxos.length;
  const weightedScore = (
    (riskCounts.low * 100) +
    (riskCounts.medium * 50) +
    (riskCounts.high * 0)
  ) / totalUtxos;
  
  return weightedScore;
};

// Calculate transaction privacy risk
export const calculateTransactionPrivacyRisk = (
  inputs: any[], 
  outputAddresses: string[]
): { 
  transaction: any;
  privacyRisk: 'low' | 'medium' | 'high';
  reasons: string[];
  recommendations: string[];
  safeAlternative?: string | null;
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check input risk levels
  const hasHighRiskInput = inputs.some(input => input.privacyRisk === 'high');
  const hasMediumRiskInput = inputs.some(input => input.privacyRisk === 'medium');
  
  // Check for mixed inputs
  const inputWallets = new Set(inputs.map(input => input.wallet));
  const hasMixedWallets = inputWallets.size > 1;
  
  // Check for mixed tags
  const allTags = inputs.flatMap(input => input.tags);
  const uniqueTags = new Set(allTags);
  const hasMixedTags = uniqueTags.size > 1;
  
  // Check for date diversity (if inputs are from very different times)
  const dates = inputs
    .filter(input => input.acquisitionDate)
    .map(input => new Date(input.acquisitionDate).getTime());
  
  let hasDateDiversity = false;
  if (dates.length > 1) {
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    // Over 30 days difference is concerning
    hasDateDiversity = (maxDate - minDate) > 30 * 24 * 60 * 60 * 1000;
  }
  
  // Determine risk level and add relevant issues/suggestions
  let privacyRisk: 'low' | 'medium' | 'high' = 'low';
  
  if (hasHighRiskInput) {
    privacyRisk = 'high';
    issues.push("Transaction includes high-risk inputs");
    suggestions.push("Avoid using high-risk UTXOs in transactions");
  }
  
  if (hasMixedWallets) {
    privacyRisk = privacyRisk === 'low' ? 'medium' : privacyRisk;
    issues.push("Transaction combines UTXOs from different wallets");
    suggestions.push("Use UTXOs from a single wallet in each transaction");
  }
  
  if (hasMixedTags && uniqueTags.size > 2) {
    privacyRisk = privacyRisk === 'low' ? 'medium' : privacyRisk;
    issues.push("Transaction combines UTXOs with different sources/purposes");
    suggestions.push("Keep different types of funds separate");
  }
  
  if (hasDateDiversity) {
    privacyRisk = privacyRisk === 'low' ? 'medium' : privacyRisk;
    issues.push("Transaction combines UTXOs from very different time periods");
    suggestions.push("Use UTXOs from similar time periods when possible");
  }
  
  if (hasMediumRiskInput && privacyRisk === 'low') {
    privacyRisk = 'medium';
    issues.push("Transaction includes medium-risk inputs");
  }
  
  // If no issues found, add a positive note
  if (issues.length === 0) {
    issues.push("No significant privacy issues detected");
    suggestions.push("Continue using good privacy practices");
  }
  
  // Create a transaction object to satisfy the SimulationResult type
  const transaction = {
    id: `sim-${Date.now()}`,
    inputs: inputs,
    outputs: outputAddresses.map(address => ({ address, amount: 0 })),
    fee: 0,
    timestamp: new Date().toISOString(),
    privacyRisk,
    reasons: issues,
  };
  
  return {
    transaction,
    privacyRisk,
    reasons: issues,
    recommendations: suggestions,
    safeAlternative: null
  };
};

// Helper functions for report exports
export const createDownloadableJSON = (data: any) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  return URL.createObjectURL(blob);
};

export const createDownloadableCSV = (data: any[]) => {
  if (!data || data.length === 0) return '';
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV rows
  const csvRows = [
    // Headers row
    headers.join(','),
    // Data rows
    ...data.map(row => {
      return headers.map(header => {
        const cell = row[header];
        // Handle special cases (arrays, objects, null values)
        if (cell === null || cell === undefined) return '';
        if (Array.isArray(cell)) return `"${cell.join(', ')}"`;
        if (typeof cell === 'object') return `"${JSON.stringify(cell)}"`;
        // Quote strings that contain commas
        if (typeof cell === 'string' && cell.includes(',')) return `"${cell}"`;
        return cell;
      }).join(',');
    })
  ];
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  return URL.createObjectURL(blob);
};

// Calculate the size of a node based on BTC amount
export const calculateNodeSize = (amount: number, minSize: number = 40, maxSize: number = 120) => {
  // Use logarithmic scale to prevent extremely large or small nodes
  const logBase = 10;
  const logMin = Math.log(0.001) / Math.log(logBase); // log_10(0.001) for small amounts
  const logMax = Math.log(100) / Math.log(logBase);   // log_10(100) for large amounts
  const logAmount = Math.log(Math.max(0.001, amount)) / Math.log(logBase);
  
  // Map the logarithmic value to the desired size range
  const normalized = (logAmount - logMin) / (logMax - logMin);
  return minSize + normalized * (maxSize - minSize);
};

// Group UTXOs by month for timeline visualization
export const groupUtxosByMonth = (utxos: UTXO[]) => {
  const groups: Record<string, UTXO[]> = {};
  
  utxos.forEach(utxo => {
    const date = utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : new Date();
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    
    groups[monthKey].push(utxo);
  });
  
  // Sort keys chronologically
  const sortedKeys = Object.keys(groups).sort();
  
  return { 
    groups,
    sortedKeys
  };
};

// Find related UTXOs (inputs/outputs) for a given UTXO
export const findRelatedUtxos = (utxo: UTXO, allUtxos: UTXO[]): { inputs: UTXO[], outputs: UTXO[] } => {
  // This is a simplified implementation - in a real app, you would use transaction data
  // to determine actual inputs and outputs
  
  const sameAddressUtxos = allUtxos.filter(u => 
    u.txid !== utxo.txid && 
    (u.address === utxo.address || 
     (utxo.senderAddress && u.receiverAddress === utxo.senderAddress) || 
     (utxo.receiverAddress && u.senderAddress === utxo.receiverAddress))
  );
  
  // Sort by date to determine inputs vs outputs
  const utxoDate = utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : new Date();
  
  const inputs = sameAddressUtxos.filter(u => {
    const uDate = u.acquisitionDate ? new Date(u.acquisitionDate) : new Date();
    return uDate < utxoDate;
  });
  
  const outputs = sameAddressUtxos.filter(u => {
    const uDate = u.acquisitionDate ? new Date(u.acquisitionDate) : new Date();
    return uDate > utxoDate;
  });
  
  return { inputs, outputs };
};
