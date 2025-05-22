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

// Get badge style for risk level with modern color palette
export const getRiskBadgeStyle = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'high':
      return 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20';
    case 'low':
      return 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20';
    default:
      return 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20';
  }
};

// Get color for risk level with modern color palette
export const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'high':
      return '#f43f5e'; // rose-500
    case 'medium':
      return '#f59e0b'; // amber-500
    case 'low':
      return '#10b981'; // emerald-500
    default:
      return '#64748b'; // slate-500
  }
};

// Get text color for risk level (for text on contrasting backgrounds)
export const getRiskTextColor = (risk: 'low' | 'medium' | 'high') => {
  switch (risk) {
    case 'high':
      return 'text-rose-500';
    case 'medium':
      return 'text-amber-500';
    case 'low':
      return 'text-emerald-500';
    default:
      return 'text-slate-500';
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

// Calculate the size of a node based on BTC amount with enhanced logarithmic scaling
export const calculateNodeSize = (amount: number, minSize: number = 40, maxSize: number = 120) => {
  // Improved logarithmic scale for better visual representation
  const logBase = 10;
  const logMin = Math.log(0.0001) / Math.log(logBase); // Support smaller amounts
  const logMax = Math.log(100) / Math.log(logBase);   
  const logAmount = Math.log(Math.max(0.0001, amount)) / Math.log(logBase);
  
  // Map the logarithmic value to the desired size range with a smoother curve
  const normalized = Math.pow((logAmount - logMin) / (logMax - logMin), 0.8); // Slight power curve for better scaling
  return minSize + normalized * (maxSize - minSize);
};

// Group UTXOs by month for timeline visualization with improved spacing
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

// Find related UTXOs with improved connection logic
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

// New function for calculating curved connection paths between nodes
export const calculateCurvedPath = (
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number, 
  curvature: number = 0.4
): string => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Adjust curvature based on distance
  const adjustedCurvature = Math.min(0.9, curvature * (1 + distance / 500));
  
  // Calculate control points for the curve
  const mx = x1 + dx * 0.5;
  const my = y1 + dy * 0.5;
  
  // Determine if curve should go clockwise or counter-clockwise
  const sign = y2 > y1 ? 1 : -1;
  
  // Calculate control point offset
  const controlX = mx - adjustedCurvature * dy * sign;
  const controlY = my + adjustedCurvature * dx * sign;
  
  // Generate SVG path for a quadratic bezier curve
  return `M${x1},${y1} Q${controlX},${controlY} ${x2},${y2}`;
};

// New helper for consistent UTXO size calculation across visualizations
export const getUtxoSizeScale = (
  utxos: UTXO[],
  minSize: number = 24, 
  maxSize: number = 100,
  logarithmic: boolean = true
) => {
  // Find min/max BTC values
  let minBtc = Math.min(...utxos.map(u => u.amount));
  let maxBtc = Math.max(...utxos.map(u => u.amount));
  
  // Prevent division by zero
  if (minBtc === maxBtc) {
    return () => (minSize + maxSize) / 2;
  }
  
  return (amount: number) => {
    if (logarithmic) {
      // Logarithmic scaling for better distribution
      const logMin = Math.log(Math.max(0.0001, minBtc));
      const logMax = Math.log(maxBtc);
      const logVal = Math.log(Math.max(0.0001, amount));
      
      const normalized = (logVal - logMin) / (logMax - logMin);
      return minSize + normalized * (maxSize - minSize);
    } else {
      // Linear scaling
      const normalized = (amount - minBtc) / (maxBtc - minBtc);
      return minSize + normalized * (maxSize - minSize);
    }
  };
};

// New function to generate a tooltip content for UTXO visualization
export const getUtxoTooltipContent = (utxo: UTXO): string => {
  // Format date if available
  const dateStr = utxo.acquisitionDate 
    ? new Date(utxo.acquisitionDate).toLocaleDateString() 
    : 'Unknown date';
  
  // Format amount
  const amountStr = formatBTC(utxo.amount, { trimZeros: true });
  
  // Create tooltip content with all relevant data
  return `
    <div class="p-2">
      <div class="font-bold">${amountStr}</div>
      <div class="text-xs opacity-80">${utxo.txid.substring(0, 8)}...${utxo.vout}</div>
      <div class="text-xs">${dateStr}</div>
      ${utxo.tags.length ? `<div class="text-xs mt-1">Tags: ${utxo.tags.join(', ')}</div>` : ''}
      ${utxo.walletName ? `<div class="text-xs">Wallet: ${utxo.walletName}</div>` : ''}
      <div class="text-xs font-medium mt-1">Risk: 
        <span class="${getRiskTextColor(utxo.privacyRisk)}">
          ${utxo.privacyRisk.toUpperCase()}
        </span>
      </div>
    </div>
  `;
};

// Calculate optimal spacing for timeline visualization
export const calculateTimelineSpacing = (
  utxos: UTXO[], 
  containerWidth: number,
  containerHeight: number
): {
  xScale: (date: Date) => number,
  getTxHeight: (amount: number) => number,
  monthWidth: number
} => {
  // Get the date range
  const dates = utxos
    .filter(u => u.acquisitionDate)
    .map(u => new Date(u.acquisitionDate!));
  
  if (dates.length === 0) return { 
    xScale: () => 0, 
    getTxHeight: () => 40,
    monthWidth: 200
  };
  
  // Sort dates and find min/max
  dates.sort((a, b) => a.getTime() - b.getTime());
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  // Add padding of 1 month on each side
  minDate.setMonth(minDate.getMonth() - 1);
  maxDate.setMonth(maxDate.getMonth() + 1);
  
  // Calculate total months between min and max dates
  const totalMonths = 
    (maxDate.getFullYear() - minDate.getFullYear()) * 12 + 
    (maxDate.getMonth() - minDate.getMonth());
  
  // Calculate month width with padding
  const monthWidth = Math.max(200, containerWidth / Math.min(totalMonths, 12));
  
  // Create scale function to map dates to x positions
  const xScale = (date: Date) => {
    const monthsDiff = 
      (date.getFullYear() - minDate.getFullYear()) * 12 + 
      (date.getMonth() - minDate.getMonth());
    
    return monthsDiff * monthWidth + 100; // Add left padding
  };
  
  // Create height scale based on BTC amount
  const getTxHeight = (amount: number) => {
    const minSize = 30;
    const maxSize = 100;
    
    // Use logarithmic scale
    const normalized = Math.log10(1 + amount * 10) / Math.log10(100);
    return minSize + normalized * (maxSize - minSize);
  };
  
  return { xScale, getTxHeight, monthWidth };
};

// Helper for modern matrix view layout
export const generateMatrixLayout = (
  utxos: UTXO[],
  width: number,
  height: number
) => {
  // Extract all unique addresses
  const addresses = new Set<string>();
  utxos.forEach(utxo => {
    if (utxo.address) addresses.add(utxo.address);
    if (utxo.senderAddress) addresses.add(utxo.senderAddress);
    if (utxo.receiverAddress) addresses.add(utxo.receiverAddress);
  });
  
  // Group transactions by address
  const addressGroups: Record<string, UTXO[]> = {};
  addresses.forEach(address => {
    addressGroups[address] = utxos.filter(utxo => 
      utxo.address === address || 
      utxo.senderAddress === address || 
      utxo.receiverAddress === address
    );
  });
  
  // Calculate importance score for each address (by number of connections and total BTC)
  const addressImportance: Record<string, number> = {};
  Object.entries(addressGroups).forEach(([address, utxos]) => {
    const totalAmount = utxos.reduce((sum, u) => sum + u.amount, 0);
    addressImportance[address] = utxos.length * totalAmount;
  });
  
  // Sort addresses by importance
  const sortedAddresses = Array.from(addresses).sort((a, b) => 
    addressImportance[b] - addressImportance[a]
  );
  
  // Calculate node positions
  const nodePositions: Record<string, {x: number, y: number, size: number}> = {};
  const txPositions: Record<string, {x: number, y: number, size: number}> = {};
  
  // Position addresses on the left side
  const addressCount = sortedAddresses.length;
  const addressSpacing = Math.min(50, height / (addressCount + 1));
  
  sortedAddresses.forEach((address, index) => {
    nodePositions[`addr-${address}`] = {
      x: 100,
      y: (index + 1) * addressSpacing,
      size: 8 + Math.sqrt(addressImportance[address]) * 2
    };
  });
  
  // Position transactions on the right side
  const txIds = new Set<string>();
  utxos.forEach(utxo => txIds.add(utxo.txid));
  
  const txCount = txIds.size;
  const txSpacing = Math.min(50, height / (txCount + 1));
  
  Array.from(txIds).forEach((txid, index) => {
    // Get all UTXOs for this transaction
    const txUtxos = utxos.filter(u => u.txid === txid);
    const totalAmount = txUtxos.reduce((sum, u) => sum + u.amount, 0);
    
    txPositions[`tx-${txid}`] = {
      x: width - 100,
      y: (index + 1) * txSpacing,
      size: 10 + Math.sqrt(totalAmount) * 3
    };
  });
  
  return {
    nodePositions,
    txPositions,
    sortedAddresses,
    txIds: Array.from(txIds)
  };
};
