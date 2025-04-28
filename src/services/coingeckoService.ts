
import { toast } from "sonner";
import { format, isAfter, subDays } from "date-fns";

const API_BASE_URL = 'https://api.coingecko.com/api/v3';

type SupportedCurrency = 'usd' | 'eur' | 'gbp' | 'jpy' | 'aud' | 'cad';

export const getBitcoinHistoricalPrice = async (
  date: string, 
  currency: SupportedCurrency = 'usd'
): Promise<number | null> => {
  try {
    const requestDate = new Date(date);
    const now = new Date();
    
    // If date is in the future, use current price
    if (isAfter(requestDate, now)) {
      return getCurrentBitcoinPrice(currency);
    }
    
    // Format date for CoinGecko API
    const formattedDate = format(requestDate, "dd-MM-yyyy");
    
    const response = await fetch(
      `${API_BASE_URL}/coins/bitcoin/history?date=${formattedDate}&localization=false`
    );

    if (!response.ok) {
      if (response.status === 429) {
        toast.error("Rate limit exceeded for CoinGecko API. Please try again later.");
        return null;
      } 
      
      // Only fallback to current price for very recent dates (last 24h)
      if ((response.status === 401 || response.status === 404) && 
          isAfter(requestDate, subDays(now, 1))) {
        const currentPrice = await getCurrentBitcoinPrice(currency);
        if (currentPrice) {
          toast.info("Using current BTC price as historical data is unavailable.");
          return currentPrice;
        }
      }
      
      console.error('CoinGecko API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const price = data.market_data?.current_price?.[currency];
    
    if (!price) {
      console.error('No price data found for', formattedDate, currency);
      return null;
    }
    
    return price;
  } catch (error) {
    console.error('Error fetching Bitcoin historical price:', error);
    return null;
  }
};

/**
 * Fetches Bitcoin price history for a specified range
 * @param days Number of days of price history to fetch
 * @param currency Currency to get prices in
 * @returns Price history array of [timestamp, price] tuples
 */
export const getBitcoinPriceHistory = async (
  days: number = 30,
  currency: SupportedCurrency = 'usd'
): Promise<[number, number][] | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/coins/bitcoin/market_chart?vs_currency=${currency}&days=${days}&interval=daily`
    );

    if (!response.ok) {
      if (response.status === 429) {
        toast.error("Rate limit exceeded for CoinGecko API. Please try again later.");
      } else {
        toast.error(`Failed to fetch price history: ${response.statusText}`);
      }
      console.error('CoinGecko API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.prices || null;
  } catch (error) {
    console.error('Error fetching Bitcoin price history:', error);
    return null;
  }
};

/**
 * Fetches the current Bitcoin price
 * @param currency Currency to get the price in
 * @returns Promise with the current Bitcoin price in specified currency
 */
export const getCurrentBitcoinPrice = async (
  currency: SupportedCurrency = 'usd'
): Promise<number | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/simple/price?ids=bitcoin&vs_currencies=${currency}`
    );

    if (!response.ok) {
      if (response.status === 429) {
        toast.error("Rate limit exceeded for CoinGecko API. Please try again later.");
      } else {
        toast.error(`Failed to fetch current Bitcoin price: ${response.statusText}`);
      }
      console.error('CoinGecko API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.bitcoin?.[currency] || null;
  } catch (error) {
    console.error('Error fetching current Bitcoin price:', error);
    return null;
  }
};
