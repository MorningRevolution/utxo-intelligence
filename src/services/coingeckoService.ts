
import { toast } from "sonner";

const API_BASE_URL = 'https://api.coingecko.com/api/v3';

/**
 * Fetches the historical price of Bitcoin on a specific date
 * @param date ISO string date
 * @returns Promise with the Bitcoin price in USD on that date
 */
export const getBitcoinHistoricalPrice = async (date: string): Promise<number | null> => {
  try {
    // Format date to dd-mm-yyyy for CoinGecko API
    const formattedDate = new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');

    const response = await fetch(
      `${API_BASE_URL}/coins/bitcoin/history?date=${formattedDate}&localization=false`
    );

    if (!response.ok) {
      if (response.status === 429) {
        toast.error("Rate limit exceeded for CoinGecko API. Please try again later.");
      } else {
        toast.error(`Failed to fetch Bitcoin price: ${response.statusText}`);
      }
      console.error('CoinGecko API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.market_data?.current_price?.usd || null;
  } catch (error) {
    console.error('Error fetching Bitcoin historical price:', error);
    return null;
  }
};

/**
 * Fetches Bitcoin price history for a specified range
 * @param days Number of days of price history to fetch
 * @returns Price history array of [timestamp, price] tuples
 */
export const getBitcoinPriceHistory = async (days: number = 30): Promise<[number, number][] | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`
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
 * @returns Promise with the current Bitcoin price in USD
 */
export const getCurrentBitcoinPrice = async (): Promise<number | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/simple/price?ids=bitcoin&vs_currencies=usd`
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
    return data.bitcoin?.usd || null;
  } catch (error) {
    console.error('Error fetching current Bitcoin price:', error);
    return null;
  }
};
