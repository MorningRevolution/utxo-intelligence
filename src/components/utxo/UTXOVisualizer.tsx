
import { useState, useEffect } from "react";
import { UTXO } from "@/types/utxo";
import { useWallet } from "@/store/WalletContext";
import { formatBTC } from "@/utils/utxo-utils";
import { Wallet, ArrowRight, Database, ExternalLink, Filter, Calendar, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface UTXOVisualizerProps {
  selectedUtxo: UTXO | null;
  filteredUtxos: UTXO[];
  onUtxoSelect: (utxo: UTXO) => void;
}

export const UTXOVisualizer = ({ selectedUtxo, filteredUtxos, onUtxoSelect }: UTXOVisualizerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const { tags, walletData } = useWallet();
  
  // Filter states
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  
  // Get unique wallet names
  const walletNames = walletData ? Array.from(
    new Set(walletData.utxos.map(u => u.walletName || walletData.name))
  ) : [];
  
  // Apply filters to utxos
  const filteredVisualUtxos = filteredUtxos.filter(utxo => {
    // Filter by tags
    if (selectedTags.length > 0 && !utxo.tags.some(tag => selectedTags.includes(tag))) {
      return false;
    }
    
    // Filter by wallet
    const walletName = utxo.walletName || (walletData?.name || "");
    if (selectedWallets.length > 0 && !selectedWallets.includes(walletName)) {
      return false;
    }
    
    // Filter by date range
    if (dateRange.from && utxo.acquisitionDate) {
      const acquisitionDate = parseISO(utxo.acquisitionDate);
      if (isBefore(acquisitionDate, dateRange.from)) {
        return false;
      }
    }
    
    if (dateRange.to && utxo.acquisitionDate) {
      const acquisitionDate = parseISO(utxo.acquisitionDate);
      if (isAfter(acquisitionDate, dateRange.to)) {
        return false;
      }
    }
    
    return true;
  });

  useEffect(() => {
    // Add a small delay to trigger animation when UTXO is selected
    if (selectedUtxo) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [selectedUtxo]);

  const openMempoolLink = (hash: string, type: 'tx' | 'address') => {
    window.open(`https://mempool.space/${type}/${hash}`, '_blank');
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedWallets([]);
    setDateRange({ from: undefined, to: undefined });
  };
  
  // Calculate if filters are active
  const hasActiveFilters = selectedTags.length > 0 || selectedWallets.length > 0 || 
    dateRange.from !== undefined || dateRange.to !== undefined;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 className="text-xl font-medium">Transaction Visualization</h3>
        
        {/* Filter controls */}
        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
          {/* Tag filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <TagIcon className="h-4 w-4" />
                <span>Tags</span>
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Filter by tags</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`tag-${tag.id}`} 
                        checked={selectedTags.includes(tag.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTags([...selectedTags, tag.name]);
                          } else {
                            setSelectedTags(selectedTags.filter(t => t !== tag.name));
                          }
                        }}
                      />
                      <Label htmlFor={`tag-${tag.id}`} className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: tag.color }}></div>
                        {tag.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Wallet filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                <span>Wallets</span>
                {selectedWallets.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    {selectedWallets.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Filter by wallets</h4>
                <div className="space-y-2">
                  {walletNames.map((wallet) => (
                    <div key={wallet} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`wallet-${wallet}`} 
                        checked={selectedWallets.includes(wallet)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedWallets([...selectedWallets, wallet]);
                          } else {
                            setSelectedWallets(selectedWallets.filter(w => w !== wallet));
                          }
                        }}
                      />
                      <Label htmlFor={`wallet-${wallet}`}>{wallet}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Date range filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Date</span>
                {(dateRange.from || dateRange.to) && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    {dateRange.from && dateRange.to ? "Range" : "Set"}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Filter by date range</h4>
                <div className="flex flex-col gap-2">
                  <CalendarComponent
                    mode="range"
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to,
                    }}
                    onSelect={(range) => setDateRange({
                      from: range?.from,
                      to: range?.to,
                    })}
                    initialFocus
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Clear filters button */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Empty state when no UTXO is selected */}
      {!selectedUtxo && (
        <div>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Transaction Selected</h3>
            <p className="text-muted-foreground max-w-md">
              Select a UTXO from below to view its transaction flow. Visual representation 
              will show input addresses, output addresses, and transaction details.
            </p>
          </div>
          
          {/* Grid of available UTXOs that can be selected */}
          {filteredVisualUtxos.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Available Transactions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVisualUtxos.slice(0, 12).map(utxo => (
                  <div 
                    key={`${utxo.txid}-${utxo.vout}`}
                    className="p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary transition-colors"
                    onClick={() => onUtxoSelect(utxo)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{formatBTC(utxo.amount)} BTC</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        utxo.privacyRisk === 'high' 
                          ? 'bg-red-500/10 text-red-500' 
                          : utxo.privacyRisk === 'medium' 
                            ? 'bg-amber-500/10 text-amber-500' 
                            : 'bg-green-500/10 text-green-500'
                      }`}>
                        {utxo.privacyRisk}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mb-1">
                      {utxo.txid}
                    </div>
                    {utxo.acquisitionDate && (
                      <div className="text-xs text-muted-foreground mb-2">
                        {utxo.acquisitionDate}
                      </div>
                    )}
                    {utxo.walletName && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Wallet className="h-3 w-3" />
                        {utxo.walletName}
                      </div>
                    )}
                    {utxo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {utxo.tags.slice(0, 2).map((tag, i) => (
                          <span 
                            key={i} 
                            className="text-xs px-2 py-0.5 bg-primary/10 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {utxo.tags.length > 2 && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                            +{utxo.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {filteredVisualUtxos.length > 12 && (
                  <div className="p-4 bg-muted/10 rounded-lg border border-dashed border-muted-foreground flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">
                      +{filteredVisualUtxos.length - 12} more UTXOs
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : hasActiveFilters ? (
            <div className="flex flex-col items-center justify-center h-32 mt-4">
              <p className="text-muted-foreground">No UTXOs match your filters</p>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                Clear Filters
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* UTXO Visualization */}
      {selectedUtxo && (
        <div className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-center p-6 bg-card border border-border rounded-lg">
            {/* Input Section - Could be multiple inputs */}
            <div className="flex-1 flex flex-col items-center">
              <div className="mb-2 text-sm font-medium text-muted-foreground">Input Address{selectedUtxo.senderAddress && selectedUtxo.receiverAddress ? "es" : ""}</div>
              <div 
                className="relative w-full max-w-sm p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary transition-colors"
                onClick={() => selectedUtxo.senderAddress ? openMempoolLink(selectedUtxo.senderAddress, 'address') : null}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="font-medium">Sender</span>
                  {selectedUtxo.senderAddress && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className="text-sm break-all">
                  {selectedUtxo.senderAddress || "Unknown Address"}
                </div>
              </div>
              
              {/* Additional inputs for more complex transactions */}
              {selectedUtxo.receiverAddress && selectedUtxo.senderAddress && (
                <div 
                  className="relative w-full max-w-sm p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary transition-colors mt-2"
                  onClick={() => selectedUtxo.receiverAddress ? openMempoolLink(selectedUtxo.receiverAddress, 'address') : null}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-medium">Co-sender</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-sm break-all">
                    {selectedUtxo.receiverAddress}
                  </div>
                </div>
              )}
            </div>
            
            {/* Transaction Node */}
            <div className="flex flex-col items-center">
              <div className="hidden lg:block text-primary mb-2">
                <ArrowRight className="h-6 w-6" />
              </div>
              <div 
                className="w-full lg:w-auto px-6 py-4 bg-primary/10 rounded-lg border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => openMempoolLink(selectedUtxo.txid, 'tx')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="font-medium">Transaction</span>
                  <ExternalLink className="h-3 w-3 text-primary" />
                </div>
                <div className="text-sm break-all max-w-[300px]">
                  {selectedUtxo.txid}
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Amount:</span>{' '}
                  <span className="font-medium">{formatBTC(selectedUtxo.amount)} BTC</span>
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">Output Index:</span>{' '}
                  <span className="font-medium">{selectedUtxo.vout}</span>
                </div>
                {selectedUtxo.acquisitionDate && (
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">Date:</span>{' '}
                    <span className="font-medium">{selectedUtxo.acquisitionDate}</span>
                  </div>
                )}
              </div>
              <div className="block lg:hidden text-primary my-2">
                <ArrowRight className="h-6 w-6 transform rotate-90" />
              </div>
            </div>
            
            {/* Output Section - Could be multiple outputs */}
            <div className="flex-1 flex flex-col items-center">
              <div className="mb-2 text-sm font-medium text-muted-foreground">Output Address</div>
              <div 
                className="relative w-full max-w-sm p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary transition-colors"
                onClick={() => selectedUtxo.address ? openMempoolLink(selectedUtxo.address, 'address') : null}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="font-medium">Receiver</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-sm break-all">
                  {selectedUtxo.address}
                </div>
                
                {/* Display if this is a change output */}
                {selectedUtxo.senderAddress === selectedUtxo.address && (
                  <Badge className="mt-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Change Address</Badge>
                )}
              </div>
              
              {/* For demonstration, show a simulated second output */}
              {selectedUtxo.privacyRisk === 'high' && (
                <div className="relative w-full max-w-sm p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary transition-colors mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-medium">Change Output</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-sm break-all truncate">
                    {selectedUtxo.senderAddress || "bc1q9jd8qh84gkl5trg6mvz729fj8xp9mjr7hjyzke"}
                  </div>
                  <Badge className="mt-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Change Address</Badge>
                </div>
              )}
            </div>
          </div>
          
          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-card border border-border rounded-lg">
              <h4 className="text-sm font-medium mb-1">Privacy Risk</h4>
              <div className={`text-sm font-medium ${
                selectedUtxo.privacyRisk === 'high' 
                  ? 'text-red-500' 
                  : selectedUtxo.privacyRisk === 'medium' 
                    ? 'text-amber-500' 
                    : 'text-green-500'
              }`}>
                {selectedUtxo.privacyRisk.charAt(0).toUpperCase() + selectedUtxo.privacyRisk.slice(1)}
              </div>
              {selectedUtxo.privacyRisk === 'high' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Address reuse detected between inputs and outputs
                </p>
              )}
            </div>
            
            <div className="p-4 bg-card border border-border rounded-lg">
              <h4 className="text-sm font-medium mb-1">Confirmations</h4>
              <div className="text-sm">{selectedUtxo.confirmations}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedUtxo.confirmations > 100 ? 'Well confirmed' : 'Recent transaction'}
              </div>
            </div>
            
            <div className="p-4 bg-card border border-border rounded-lg">
              <h4 className="text-sm font-medium mb-1">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {selectedUtxo.tags.length > 0 ? (
                  selectedUtxo.tags.map((tag, i) => (
                    <span 
                      key={i} 
                      className="text-xs px-2 py-1 bg-muted rounded-full"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No tags</span>
                )}
              </div>
              {selectedUtxo.walletName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Wallet className="h-3 w-3" />
                  {selectedUtxo.walletName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
