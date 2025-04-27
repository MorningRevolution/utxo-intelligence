
import { toast } from "sonner";
import { format, isAfter, subDays } from "date-fns";

const API_BASE_URL = 'https://api.coingecko.com/api/v3';

type SupportedCurrency = 'usd' | 'eur' | 'gbp' | 'jpy' | 'aud' | 'cad';

/**
 * Fetches the historical price of Bitcoin on a specific date
 * @param date ISO string date
 * @param currency Currency to get the price in
 * @returns Promise with the Bitcoin price in specified currency on that date
 */
export const getBitcoinHistoricalPrice = async (
  date: string, 
  currency: SupportedCurrency = 'usd'
): Promise<number | null> => {
  try {
    // Check if date is within the allowed range (CoinGecko free API limitation)
    const requestDate = new Date(date);
    const now = new Date();
    const oneYearAgo = subDays(now, 365);
    
    // Format date to dd-MM-yyyy for CoinGecko API using date-fns
    const formattedDate = format(requestDate, "dd-MM-yyyy");

    const response = await fetch(
      `${API_BASE_URL}/coins/bitcoin/history?date=${formattedDate}&localization=false`
    );

    if (!response.ok) {
      if (response.status === 429) {
        toast.error("Rate limit exceeded for CoinGecko API. Please try again later.");
      } else if (response.status === 401) {
        if (isAfter(oneYearAgo, requestDate)) {
          toast.error("CoinGecko API restricts free historical data to the past 365 days.");
        } else {
          toast.error("CoinGecko API access error: Authentication required for this request.");
        }
      } else {
        toast.error(`Failed to fetch Bitcoin price: ${response.statusText}`);
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
