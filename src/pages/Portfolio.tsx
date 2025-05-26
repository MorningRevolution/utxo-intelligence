import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChartArea, ChartLine, Wallet, CircleDollarSign, CalendarIcon, DollarSign, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/store/WalletContext";
import { formatBTC } from "@/utils/utxo-utils";
import { BalanceChart } from "@/components/portfolio/BalanceChart";
import { FiatValueChart } from "@/components/portfolio/FiatValueChart";
import { TagAllocationChart } from "@/components/portfolio/TagAllocationChart";
import { PortfolioData } from "@/types/utxo";
import { toast } from "sonner";
import { AddUTXOModal } from "@/components/portfolio/AddUTXOModal";
import { getCurrentBitcoinPrice } from "@/services/coingeckoService";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus } from "lucide-react";

type TimeFilter = '30d' | '90d' | '1y' | 'all' | '2023' | '2024';

function Portfolio() {
  const navigate = useNavigate();
  const { walletData, hasWallet, getPortfolioData, selectedCurrency } = useWallet();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState("balance");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [isAddUTXOModalOpen, setIsAddUTXOModalOpen] = useState(false);

  const fetchPortfolioData = useCallback(async () => {
    if (!hasWallet) return;
    
    setIsLoading(true);
    try {
      const price = await getCurrentBitcoinPrice(selectedCurrency);
      setCurrentPrice(price);
      
      const data = await getPortfolioData();
      if (data) {
        setPortfolioData(data);
      } else {
        toast.error("Failed to load portfolio data");
      }
    } catch (error) {
      console.error("Error fetching portfolio data:", error);
      toast.error("An error occurred while loading portfolio data");
    } finally {
      setIsLoading(false);
    }
  }, [hasWallet, getPortfolioData, selectedCurrency]);
  
  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  const handleAddUTXOModalClose = (success: boolean) => {
    setIsAddUTXOModalOpen(false);
    if (success) {
      fetchPortfolioData();
    }
  };

  const getFilteredChartData = () => {
    if (!portfolioData) return [];
    
    const now = new Date();
    const data = [...portfolioData.balanceHistory];
    
    switch (timeFilter) {
      case '30d':
        return data.slice(-30);
      case '90d':
        return data.slice(-90);
      case '1y':
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        return data.filter(item => new Date(item.date) >= oneYearAgo);
      case '2023':
        return data.filter(item => {
          const date = new Date(item.date);
          return date.getFullYear() === 2023;
        });
      case '2024':
        return data.filter(item => {
          const date = new Date(item.date);
          return date.getFullYear() === 2024;
        });
      case 'all':
      default:
        return data;
    }
  };

  const formatPercentage = (value: number) => {
    const percentage = value * 100;
    const formatted = percentage.toFixed(2) + "%";
    return percentage >= 0 ? `+${formatted}` : formatted;
  };

  const formatCurrency = (value: number) => {
    const currencySymbol = selectedCurrency === 'usd' ? '$' : 
                          selectedCurrency === 'eur' ? '€' : 
                          selectedCurrency === 'gbp' ? '£' : 
                          selectedCurrency === 'jpy' ? '¥' : 
                          selectedCurrency === 'aud' ? 'A$' : 
                          selectedCurrency === 'cad' ? 'C$' : '$';
    
    return `${currencySymbol}${value.toLocaleString()}`;
  };

  const getStatusClass = (value: number) => {
    return value >= 0 ? "text-green-500" : "text-red-500";
  };

  if (!hasWallet) {
    return (
      <div className="container py-6">
        <div className="flex flex-col items-center justify-center h-[70vh] text-center">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">No Wallet Found</h1>
          <p className="text-muted-foreground mb-6">
            Import a wallet or load the demo wallet to view your portfolio.
          </p>
          <Button onClick={() => navigate("/wallet-import")}>
            Import Wallet
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !portfolioData) {
    return (
      <div className="container py-6">
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-bitcoin mb-4"></div>
          <h2 className="text-xl font-medium">Loading portfolio data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Portfolio Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-dark-card border-dark-border shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">BTC Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-bitcoin">{formatBTC(walletData!.totalBalance)}</div>
            <p className="text-muted-foreground text-sm mt-1">{walletData?.utxos.length} UTXOs</p>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-card border-dark-border shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(portfolioData.currentValue)}</div>
            <p className="text-muted-foreground text-sm mt-1">
              {formatCurrency(currentPrice || 0)} per BTC
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-card border-dark-border shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Unrealized Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getStatusClass(portfolioData.unrealizedGain)}`}>
              {formatCurrency(portfolioData.unrealizedGain)}
            </div>
            <p className={`text-sm mt-1 ${getStatusClass(portfolioData.unrealizedGainPercentage)}`}>
              {formatPercentage(portfolioData.unrealizedGainPercentage)} from cost basis
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-6">
        <ToggleGroup type="single" value={timeFilter} onValueChange={(value) => value && setTimeFilter(value as TimeFilter)}>
          <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
          <ToggleGroupItem value="90d">90 days</ToggleGroupItem>
          <ToggleGroupItem value="1y">1 year</ToggleGroupItem>
          <ToggleGroupItem value="2024">2024</ToggleGroupItem>
          <ToggleGroupItem value="2023">2023</ToggleGroupItem>
          <ToggleGroupItem value="all">All time</ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      <div className="space-y-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
          <TabsList className="mb-6">
            <TabsTrigger value="balance">
              <ChartLine className="mr-2 h-4 w-4" />
              Balance History
            </TabsTrigger>
            <TabsTrigger value="fiat">
              <CircleDollarSign className="mr-2 h-4 w-4" />
              Fiat Value
            </TabsTrigger>
            <TabsTrigger value="allocation">
              <ChartArea className="mr-2 h-4 w-4" />
              Tag Allocation
            </TabsTrigger>
          </TabsList>
          
          <div className="h-[400px] mb-8">
            <TabsContent value="balance" className="h-full mt-0">
              <BalanceChart 
                data={getFilteredChartData()} 
                height={350}
                timeFilter={timeFilter} 
              />
            </TabsContent>
            
            <TabsContent value="fiat" className="h-full mt-0">
              <FiatValueChart 
                data={getFilteredChartData()} 
                height={350}
                currencySymbol={selectedCurrency.toUpperCase()}
                timeFilter={timeFilter}
              />
            </TabsContent>
            
            <TabsContent value="allocation" className="h-full mt-0">
              <TagAllocationChart data={portfolioData.tagAllocation} height={350} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <AddUTXOModal
        open={isAddUTXOModalOpen}
        onOpenChange={handleAddUTXOModalClose}
      />
    </div>
  );
}

export default Portfolio;
