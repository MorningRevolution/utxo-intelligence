// Format BTC amount for display
export const formatBTC = (amount: number): string => {
  return `${amount.toFixed(8)} BTC`;
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

// Format BTC amount with options to trim trailing zeros and specify decimal places
export const formatBTC = (amount: number, options?: { trimZeros?: boolean; minDecimals?: number; maxDecimals?: number }) => {
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
