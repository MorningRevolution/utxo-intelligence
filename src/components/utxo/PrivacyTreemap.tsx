
import React, { useState, useEffect, useMemo } from "react";
import { UTXO } from "@/types/utxo";
import { UTXOFiltersState } from "@/types/utxo-graph";
import { createPrivacyTreemap, filterUTXOs, safeFormatBTC } from "@/utils/visualization-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { getRiskBadgeStyle } from "@/utils/utxo-utils";
import { Search, Tag, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface PrivacyTreemapProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
}

export const PrivacyTreemap: React.FC<PrivacyTreemapProps> = ({ 
  utxos, 
  onSelectUtxo 
}) => {
  // State for filters and selection
  const [filters, setFilters] = useState<UTXOFiltersState>({
    searchTerm: "",
    selectedTags: [],
    selectedWallets: [],
    selectedRiskLevels: []
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUtxo, setSelectedUtxo] = useState<UTXO | null>(null);
  const [showUtxoDrawer, setShowUtxoDrawer] = useState(false);
  const [editableNote, setEditableNote] = useState("");
  
  // Extract all available tags for filters
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    utxos.forEach(utxo => {
      utxo.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [utxos]);

  // Extract all available wallets
  const availableWallets = useMemo(() => {
    const wallets = new Set<string>();
    utxos.forEach(utxo => {
      wallets.add(utxo.walletName || "Unknown");
    });
    return Array.from(wallets);
  }, [utxos]);
  
  // Filter UTXOs based on current filters
  const filteredUtxos = useMemo(() => {
    return filterUTXOs(utxos, filters);
  }, [utxos, filters]);
  
  // Generate treemap data
  const treemapData = useMemo(() => {
    return createPrivacyTreemap(filteredUtxos);
  }, [filteredUtxos]);
  
  // Calculate total BTC amount
  const totalAmount = useMemo(() => {
    return filteredUtxos.reduce((sum, utxo) => sum + (utxo.amount || 0), 0);
  }, [filteredUtxos]);
  
  // Handle UTXO selection
  const handleUtxoClick = (utxo: UTXO) => {
    setSelectedUtxo(utxo);
    setEditableNote(utxo.notes || "");
    setShowUtxoDrawer(true);
    
    if (onSelectUtxo) {
      onSelectUtxo(utxo);
    }
  };

  // Toggle filters visibility
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };
  
  // Handle filter changes
  const handleFilterChange = (key: keyof UTXOFiltersState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Handle tag filter toggle
  const handleTagFilterToggle = (tag: string) => {
    setFilters(prev => {
      const newTags = prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag];
      
      return { ...prev, selectedTags: newTags };
    });
  };
  
  // Handle wallet filter toggle
  const handleWalletFilterToggle = (wallet: string) => {
    setFilters(prev => {
      const newWallets = prev.selectedWallets.includes(wallet)
        ? prev.selectedWallets.filter(w => w !== wallet)
        : [...prev.selectedWallets, wallet];
      
      return { ...prev, selectedWallets: newWallets };
    });
  };
  
  // Handle risk filter toggle
  const handleRiskFilterToggle = (risk: "low" | "medium" | "high") => {
    setFilters(prev => {
      const newRisks = prev.selectedRiskLevels.includes(risk)
        ? prev.selectedRiskLevels.filter(r => r !== risk)
        : [...prev.selectedRiskLevels, risk];
      
      return { ...prev, selectedRiskLevels: newRisks };
    });
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      selectedTags: [],
      selectedWallets: [],
      selectedRiskLevels: []
    });
  };
  
  // Handle note saving
  const handleSaveNote = () => {
    if (!selectedUtxo) return;
    
    // In a real implementation, this would update the note in the database
    toast.success("Note saved successfully");
    
    // Update the selected UTXO's note
    setSelectedUtxo(prev => {
      if (!prev) return null;
      return {
        ...prev,
        notes: editableNote
      };
    });
  };
  
  // Calculate size for UTXO box based on amount
  const calculateBoxSize = (amount: number) => {
    if (totalAmount === 0) return { width: 100, height: 100 };
    
    // Use square root to make area proportional to amount
    const ratio = Math.sqrt(amount / totalAmount);
    const baseSize = 80; // Base size in pixels
    const maxSize = 160; // Maximum size in pixels
    
    const size = Math.max(60, Math.min(maxSize, baseSize + ratio * 100));
    
    return {
      width: size,
      height: size
    };
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Input
            placeholder="Search by txid, address, tag..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
            className="w-full"
            startIcon={<Search className="h-4 w-4" />}
          />
        </div>
        
        <div className="flex gap-2 items-center">
          {/* Filter toggle */}
          <Button 
            variant={showFilters ? "default" : "outline"} 
            size="sm"
            onClick={toggleFilters}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {(filters.selectedTags.length > 0 || 
              filters.selectedWallets.length > 0 || 
              filters.selectedRiskLevels.length > 0) && (
              <Badge variant="secondary" className="ml-1">
                {filters.selectedTags.length + 
                 filters.selectedWallets.length + 
                 filters.selectedRiskLevels.length}
              </Badge>
            )}
          </Button>
          
          {/* Selected filters preview */}
          <div className="flex flex-wrap gap-1 items-center">
            {filters.selectedTags.slice(0, 2).map(tag => (
              <Badge 
                key={tag}
                variant="default"
                className="cursor-pointer"
                onClick={() => handleTagFilterToggle(tag)}
              >
                {tag}
              </Badge>
            ))}
            {filters.selectedTags.length > 2 && (
              <Badge variant="outline">+{filters.selectedTags.length - 2} more</Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded filters panel */}
      {showFilters && (
        <div className="bg-card p-4 rounded-lg shadow-sm mb-4 grid gap-4 md:grid-cols-3">
          {/* Filter components */}
          {/* Tag filters */}
          <div>
            <h3 className="text-sm font-medium mb-2">Filter by Tags</h3>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
              {availableTags.map(tag => (
                <div key={tag} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`tag-${tag}`}
                    checked={filters.selectedTags.includes(tag)}
                    onChange={() => handleTagFilterToggle(tag)}
                    className="h-4 w-4 rounded"
                  />
                  <label htmlFor={`tag-${tag}`} className="text-sm">
                    {tag}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Wallet filters */}
          <div>
            <h3 className="text-sm font-medium mb-2">Filter by Wallets</h3>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
              {availableWallets.map(wallet => (
                <div key={wallet} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`wallet-${wallet}`}
                    checked={filters.selectedWallets.includes(wallet)}
                    onChange={() => handleWalletFilterToggle(wallet)}
                    className="h-4 w-4 rounded"
                  />
                  <label htmlFor={`wallet-${wallet}`} className="text-sm">
                    {wallet}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Risk level filters */}
          <div>
            <h3 className="text-sm font-medium mb-2">Filter by Risk Level</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="risk-low"
                  checked={filters.selectedRiskLevels.includes("low")}
                  onChange={() => handleRiskFilterToggle("low")}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="risk-low" className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                  Low Risk
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="risk-medium"
                  checked={filters.selectedRiskLevels.includes("medium")}
                  onChange={() => handleRiskFilterToggle("medium")}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="risk-medium" className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
                  Medium Risk
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="risk-high"
                  checked={filters.selectedRiskLevels.includes("high")}
                  onChange={() => handleRiskFilterToggle("high")}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="risk-high" className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ea384c]"></div>
                  High Risk
                </label>
              </div>
            </div>
          </div>
          
          {/* Filter actions */}
          <div className="md:col-span-3 flex justify-end">
            <Button variant="outline" onClick={clearFilters} className="mr-2">
              Clear All Filters
            </Button>
            <Button onClick={toggleFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#ea384c]"></div>
          <span>High Risk</span>
        </div>
      </div>
      
      {/* Treemap visualization */}
      <div className="bg-card rounded-lg shadow-sm p-4" style={{ minHeight: '60vh' }}>
        <h2 className="text-lg font-semibold mb-4">UTXO Privacy Treemap</h2>
        
        {filteredUtxos.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No UTXOs to display. Try adjusting your filters.
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-muted p-3 rounded-lg text-center">
                <h3 className="font-medium">Total UTXOs</h3>
                <p className="text-2xl font-bold mt-1">{filteredUtxos.length}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg text-center">
                <h3 className="font-medium">Total BTC</h3>
                <p className="text-2xl font-bold mt-1">{safeFormatBTC(totalAmount)}</p>
              </div>
              <div className="bg-muted p-3 rounded-lg text-center">
                <h3 className="font-medium">Average Size</h3>
                <p className="text-2xl font-bold mt-1">
                  {filteredUtxos.length > 0 ? safeFormatBTC(totalAmount / filteredUtxos.length) : "₿0.00000000"}
                </p>
              </div>
            </div>
            
            {/* UTXO boxes in a responsive grid */}
            <div className="flex flex-wrap gap-4 justify-center">
              {treemapData.map(utxo => {
                const { width, height } = calculateBoxSize(utxo.value);
                
                return (
                  <div
                    key={utxo.id}
                    className="flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all hover:shadow-md hover:scale-105 relative p-2"
                    style={{ 
                      width: `${width}px`, 
                      height: `${height}px`,
                      backgroundColor: `${utxo.color}20`,
                      border: `2px solid ${utxo.color}`
                    }}
                    onClick={() => handleUtxoClick(utxo.data)}
                  >
                    <div className="text-xs font-medium truncate w-[90%] text-center">
                      {utxo.name}
                    </div>
                    <div className="text-xs mt-1 font-mono">
                      {safeFormatBTC(utxo.value)}
                    </div>
                    {utxo.data.tags && utxo.data.tags.length > 0 && (
                      <div className="absolute top-1 right-1">
                        <Badge variant="outline" className="text-[0.6rem]">
                          <Tag className="h-2 w-2 mr-1" />
                          {utxo.data.tags.length}
                        </Badge>
                      </div>
                    )}
                    <Badge 
                      className="mt-1 text-[0.65rem]"
                      variant={utxo.data.privacyRisk === "high" ? "destructive" : "outline"}
                    >
                      {utxo.data.privacyRisk}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      {/* UTXO Details Drawer */}
      <Drawer open={showUtxoDrawer} onOpenChange={setShowUtxoDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>UTXO Details</DrawerTitle>
            <DrawerDescription>
              {selectedUtxo ? `${selectedUtxo.txid.substring(0, 10)}...` : "No UTXO selected"}
            </DrawerDescription>
          </DrawerHeader>
          
          {selectedUtxo && (
            <div className="px-4 py-2 space-y-4">
              {/* Basic info */}
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Outpoint:</span>
                  <span className="text-sm font-mono">{selectedUtxo.txid}:{selectedUtxo.vout}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-sm font-mono">{safeFormatBTC(selectedUtxo.amount)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">Address:</span>
                  <span className="text-sm font-mono truncate max-w-[250px]">{selectedUtxo.address}</span>
                </div>
                {selectedUtxo.receiverAddress && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm font-medium">Receiver:</span>
                    <span className="text-sm font-mono truncate max-w-[250px]">{selectedUtxo.receiverAddress}</span>
                  </div>
                )}
                {selectedUtxo.acquisitionDate && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm font-medium">Date:</span>
                    <span className="text-sm">{new Date(selectedUtxo.acquisitionDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              {/* Tags */}
              <div>
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedUtxo.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="cursor-pointer">
                      {tag} <span className="ml-1 text-muted-foreground">×</span>
                    </Badge>
                  ))}
                  {selectedUtxo.tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">No tags</span>
                  )}
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Add Tag
                </Button>
              </div>
              
              {/* Notes (editable) */}
              <div>
                <h3 className="text-sm font-medium mb-1">Notes</h3>
                <div className="flex flex-col gap-2">
                  <Input
                    value={editableNote}
                    onChange={(e) => setEditableNote(e.target.value)}
                    placeholder="Add notes..."
                    className="text-sm"
                  />
                  <Button size="sm" onClick={handleSaveNote}>
                    Save Notes
                  </Button>
                </div>
              </div>
              
              {/* Privacy analysis */}
              <div>
                <h3 className="text-sm font-medium mb-2">Privacy Analysis</h3>
                <div className={`p-3 rounded-lg text-sm ${
                  selectedUtxo.privacyRisk === 'high' ? 'bg-red-100 dark:bg-red-950/20' :
                  selectedUtxo.privacyRisk === 'medium' ? 'bg-orange-100 dark:bg-orange-950/20' :
                  'bg-green-100 dark:bg-green-950/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getRiskBadgeStyle(selectedUtxo.privacyRisk)}>
                      {selectedUtxo.privacyRisk.toUpperCase()} RISK
                    </Badge>
                  </div>
                  
                  {selectedUtxo.privacyRisk === 'high' && (
                    <p>This UTXO has high privacy risk due to its traceability to KYC-related sources.</p>
                  )}
                  
                  {selectedUtxo.privacyRisk === 'medium' && (
                    <p>This UTXO has medium privacy risk. Consider using CoinJoin before spending.</p>
                  )}
                  
                  {selectedUtxo.privacyRisk === 'low' && (
                    <p>This UTXO has good privacy characteristics.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowUtxoDrawer(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
