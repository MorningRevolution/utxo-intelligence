
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChartArea, ChartLine, Wallet, CircleDollarSign, Calendar as CalendarIcon, DollarSign, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/store/WalletContext";
import { formatBTC, getRiskColor, formatTxid } from "@/utils/utxo-utils";
import { BalanceChart } from "@/components/portfolio/BalanceChart";
import { FiatValueChart } from "@/components/portfolio/FiatValueChart";
import { TagAllocationChart } from "@/components/portfolio/TagAllocationChart";
import { PortfolioData } from "@/types/utxo";
import { toast } from "sonner";
import { AddUTXOModal } from "@/components/portfolio/AddUTXOModal";
import { getCurrentBitcoinPrice } from "@/services/coingeckoService";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Filter, ArrowUpDown, MoreVertical, Tag } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow, EditableCell 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { UTXODetailsModal } from "@/components/utxo/UTXODetailsModal";
import { TagSelector } from "@/components/utxo/TagSelector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TimeFilter = '30d' | '90d' | '1y' | 'all' | '2023' | '2024';

function Portfolio() {
  const navigate = useNavigate();
  const { walletData, hasWallet, getPortfolioData, selectedCurrency, tags, tagUTXO, updateUtxoCostBasis, autoPopulateUTXOCostBasis, isUTXOSelected, toggleUTXOSelection } = useWallet();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState("balance");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [isAddUTXOModalOpen, setIsAddUTXOModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: 'amount',
    direction: 'desc' as 'asc' | 'desc'
  });
  const [editableUtxo, setEditableUtxo] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [detailsUtxoId, setDetailsUtxoId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

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

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setDetailsUtxoId(null);
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

  // UTXO table related functions
  const filteredUtxos = useMemo(() => {
    if (!walletData) return [];

    return walletData.utxos.filter(utxo => {
      return searchTerm === "" || 
        utxo.txid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utxo.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utxo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (utxo.notes && utxo.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    }).sort((a, b) => {
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' 
          ? a.amount - b.amount 
          : b.amount - a.amount;
      }
      
      if (sortConfig.key === 'acquisitionBtcPrice') {
        const aPrice = a.acquisitionBtcPrice || 0;
        const bPrice = b.acquisitionBtcPrice || 0;
        return sortConfig.direction === 'asc'
          ? aPrice - bPrice
          : bPrice - aPrice;
      }
      
      if (sortConfig.key === 'acquisitionFiatValue') {
        const aValue = a.acquisitionFiatValue || 0;
        const bValue = b.acquisitionFiatValue || 0;
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      
      const aValue = String(a[sortConfig.key as keyof typeof a] || '');
      const bValue = String(b[sortConfig.key as keyof typeof b] || '');
      
      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      }
      return bValue.localeCompare(aValue);
    });
  }, [walletData, searchTerm, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleTagSelection = (utxoId: string, tagId: string, remove?: boolean) => {
    if (tagId && utxoId) {
      if (remove) {
        const utxo = walletData?.utxos.find(u => u.txid === utxoId);
        const tag = tags.find(t => t.id === tagId);
        if (utxo && tag) {
          tagUTXO(utxoId, null, tag.name);
          toast("Tag removed");
        }
      } else {
        tagUTXO(utxoId, tagId);
        toast("Tag applied");
      }
    }
  };

  const handleViewDetails = (utxoId: string) => {
    setDetailsUtxoId(utxoId);
    setModalOpen(true);
  };

  const startEditing = (utxoId: string) => {
    setEditableUtxo(utxoId);
  };

  const cancelEditing = () => {
    setEditableUtxo(null);
    setDatePickerOpen(null);
  };

  // Handle editing functions for UTXO fields
  const handleDateEdit = useCallback((utxoId: string, date: Date | undefined) => {
    if (!walletData || !date) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    // Use the existing values for other fields
    updateUtxoCostBasis(
      utxoId,
      dateStr,
      utxo.acquisitionFiatValue,
      utxo.notes
    );
    
    toast("Acquisition date updated");
    
    // Auto-populate BTC price based on the new date
    autoPopulateUTXOCostBasis(utxoId)
      .then(success => {
        if (!success) {
          toast.error("Could not fetch historical Bitcoin price for the selected date");
        }
      })
      .catch(err => {
        console.error("Error auto-populating price:", err);
      });
    
    setEditableUtxo(null);
    setDatePickerOpen(null);
    fetchPortfolioData();
  }, [walletData, updateUtxoCostBasis, autoPopulateUTXOCostBasis, fetchPortfolioData]);

  const handleBtcPriceEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue) && newValue !== '') {
      toast.error("Please enter a valid number");
      return;
    }

    // Calculate new acquisition fiat value based on BTC price and amount
    const newAcquisitionFiatValue = newValue === '' ? null : parsedValue * utxo.amount;
    
    // Update the UTXO with the new BTC price and calculated fiat value
    updateUtxoCostBasis(
      utxoId,
      utxo.acquisitionDate,
      newAcquisitionFiatValue,
      utxo.notes
    );
    
    toast("BTC price updated");
    
    setEditableUtxo(null);
    fetchPortfolioData();
  }, [walletData, updateUtxoCostBasis, fetchPortfolioData]);

  const handleCostBasisEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue) && newValue !== '') {
      toast.error("Please enter a valid number");
      return;
    }
    
    // Use the existing values for other fields
    updateUtxoCostBasis(
      utxoId,
      utxo.acquisitionDate,
      newValue === '' ? null : parsedValue,
      utxo.notes
    );
    
    toast("Cost basis updated");
    
    setEditableUtxo(null);
    fetchPortfolioData();
  }, [walletData, updateUtxoCostBasis, fetchPortfolioData]);

  const handleNotesEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    // Use the existing values for other fields
    updateUtxoCostBasis(
      utxoId,
      utxo.acquisitionDate,
      utxo.acquisitionFiatValue,
      newValue
    );
    
    toast("Notes updated");
    
    setEditableUtxo(null);
    fetchPortfolioData();
  }, [walletData, updateUtxoCostBasis, fetchPortfolioData]);

  const getCurrencySymbol = () => {
    switch (selectedCurrency) {
      case 'usd': return '$';
      case 'eur': return '€';
      case 'gbp': return '£';
      case 'jpy': return '¥';
      case 'aud': return 'A$';
      case 'cad': return 'C$';
      default: return '$';
    }
  };

  const formatCurrencyValue = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${getCurrencySymbol()}${value.toLocaleString()}`;
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
      
      <div className="mb-4">
        <ToggleGroup type="single" value={timeFilter} onValueChange={(value) => value && setTimeFilter(value as TimeFilter)}>
          <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
          <ToggleGroupItem value="90d">90 days</ToggleGroupItem>
          <ToggleGroupItem value="1y">1 year</ToggleGroupItem>
          <ToggleGroupItem value="2024">2024</ToggleGroupItem>
          <ToggleGroupItem value="2023">2023</ToggleGroupItem>
          <ToggleGroupItem value="all">All time</ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
        <TabsList className="mb-4">
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
        
        <TabsContent value="balance" className="h-[400px]">
          <BalanceChart 
            data={getFilteredChartData()} 
            height={350}
            timeFilter={timeFilter} 
          />
        </TabsContent>
        
        <TabsContent value="fiat" className="h-[400px]">
          <FiatValueChart 
            data={getFilteredChartData()} 
            height={350}
            currencySymbol={selectedCurrency.toUpperCase()}
            timeFilter={timeFilter}
          />
        </TabsContent>
        
        <TabsContent value="allocation" className="h-[400px]">
          <TagAllocationChart data={portfolioData.tagAllocation} height={350} />
        </TabsContent>
      </Tabs>
      
      <Card className="bg-dark-card border-dark-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>UTXO Management</CardTitle>
            <CardDescription>
              View and edit your UTXOs, including cost basis information
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsAddUTXOModalOpen(true)}
              className="ml-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add UTXO
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/utxo-table")}
            >
              View All UTXOs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableCaption>
                {filteredUtxos.length} of {walletData.utxos.length} UTXOs • Total Balance: {formatBTC(walletData.totalBalance)}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort('txid')}>
                      TxID
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort('amount')}>
                      Amount
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort('acquisitionDate')}>
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      Acq. Date
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort('acquisitionBtcPrice')}>
                      <DollarSign className="mr-1 h-4 w-4" />
                      BTC Price
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort('acquisitionFiatValue')}>
                      Cost Basis
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[100px]">
                    Notes
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">
                      <Tag className="mr-1 h-4 w-4" />
                      Tags
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort('privacyRisk')}>
                      Risk
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUtxos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-foreground">
                      No UTXOs in the wallet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUtxos.slice(0, 10).map((utxo) => {
                    const isEditing = editableUtxo === utxo.txid;
                    
                    return (
                      <TableRow key={utxo.txid + "-" + utxo.vout}>
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            {isUTXOSelected(utxo) && (
                              <div className="bg-green-500/10 text-green-500 p-1 rounded">
                                <Check className="h-4 w-4" />
                              </div>
                            )}
                            {formatTxid(utxo.txid)}
                          </div>
                        </TableCell>
                        
                        {/* Amount Cell - Read-only */}
                        <TableCell>
                          {formatBTC(utxo.amount)}
                        </TableCell>
                        
                        {/* Acquisition Date Cell - Editable */}
                        {isEditing ? (
                          <TableCell>
                            <Popover open={datePickerOpen === utxo.txid} onOpenChange={(open) => {
                              if (open) setDatePickerOpen(utxo.txid);
                              else setDatePickerOpen(null);
                            }}>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="w-full justify-start text-left font-normal"
                                  size="sm"
                                >
                                  {utxo.acquisitionDate 
                                    ? format(new Date(utxo.acquisitionDate), "PPP")
                                    : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : undefined}
                                  onSelect={(date) => handleDateEdit(utxo.txid, date)}
                                  disabled={(date) => date > new Date()}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <div className="flex justify-end mt-2 space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={cancelEditing} 
                                className="h-7 px-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        ) : (
                          <EditableCell
                            isEditing={false}
                            initialValue={utxo.acquisitionDate 
                              ? new Date(utxo.acquisitionDate).toLocaleDateString() 
                              : ""}
                            onSave={() => startEditing(utxo.txid)}
                            inputType="text"
                            placeholder="Set date..."
                          />
                        )}
                        
                        {/* BTC Price Cell - Editable */}
                        <EditableCell
                          isEditing={isEditing}
                          initialValue={utxo.acquisitionBtcPrice !== null 
                            ? String(utxo.acquisitionBtcPrice)
                            : ""}
                          onSave={(value) => handleBtcPriceEdit(utxo.txid, value)}
                          inputType="number"
                          placeholder="Enter BTC price..."
                        />
                        
                        {/* Cost Basis Cell - Editable */}
                        <EditableCell
                          isEditing={isEditing}
                          initialValue={utxo.acquisitionFiatValue !== null 
                            ? String(utxo.acquisitionFiatValue)
                            : ""}
                          onSave={(value) => handleCostBasisEdit(utxo.txid, value)}
                          inputType="number"
                          placeholder="Enter cost basis..."
                        >
                          <div className="flex items-center">
                            {utxo.acquisitionFiatValue !== null 
                              ? formatCurrencyValue(utxo.acquisitionFiatValue) 
                              : ""}
                            {utxo.costAutoPopulated && !isEditing && (
                              <span className="ml-1 text-xs text-muted-foreground">(auto)</span>
                            )}
                          </div>
                        </EditableCell>
                        
                        {/* Notes Cell - Editable */}
                        <EditableCell
                          isEditing={isEditing}
                          initialValue={utxo.notes || ""}
                          onSave={(value) => handleNotesEdit(utxo.txid, value)}
                          inputType="text"
                          placeholder="Add notes..."
                          className="max-w-[200px]"
                        />
                        
                        {/* Tags Cell */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {utxo.tags.map((tagName, index) => {
                              const tag = tags.find(t => t.name === tagName);
                              return tag ? (
                                <Badge 
                                  key={index}
                                  style={{ 
                                    backgroundColor: tag.color, 
                                    color: '#ffffff' 
                                  }} 
                                >
                                  {tagName}
                                </Badge>
                              ) : null;
                            })}
                            {utxo.tags.length === 0 && (
                              <span className="text-muted-foreground text-sm">No tags</span>
                            )}
                          </div>
                        </TableCell>
                        
                        {/* Risk Cell */}
                        <TableCell>
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${getRiskColor(utxo.privacyRisk)}`}></div>
                            <span className="ml-2 capitalize">{utxo.privacyRisk}</span>
                          </div>
                        </TableCell>
                        
                        {/* Actions Cell */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {isEditing ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={cancelEditing}
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => startEditing(utxo.txid)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card text-foreground">
                                <DropdownMenuItem onClick={() => handleViewDetails(utxo.txid)}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  <TagSelector 
                                    utxoId={utxo.txid}
                                    onSelect={(tagId, remove) => handleTagSelection(utxo.txid, tagId, remove)}
                                    utxoTags={utxo.tags}
                                    trigger={
                                      <div className="flex items-center w-full">
                                        <Tag className="mr-2 h-4 w-4" />
                                        <span>Manage Tags</span>
                                      </div>
                                    }
                                  />
                                </DropdownMenuItem>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <DropdownMenuItem 
                                          onClick={() => !isUTXOSelected(utxo) && toggleUTXOSelection(utxo)}
                                          disabled={isUTXOSelected(utxo)}
                                          className={isUTXOSelected(utxo) ? "cursor-not-allowed opacity-50" : ""}
                                        >
                                          {isUTXOSelected(utxo) ? "Already in Simulation" : "Add to Simulation"}
                                        </DropdownMenuItem>
                                      </div>
                                    </TooltipTrigger>
                                    {isUTXOSelected(utxo) && (
                                      <TooltipContent>
                                        <p>Already added to simulation</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddUTXOModal
        open={isAddUTXOModalOpen}
        onOpenChange={handleAddUTXOModalClose}
      />

      <UTXODetailsModal 
        utxoId={detailsUtxoId}
        open={modalOpen} 
        onOpenChange={handleModalOpenChange}
        onTagUpdate={handleTagSelection}
      />
    </div>
  );
}

export default Portfolio;
