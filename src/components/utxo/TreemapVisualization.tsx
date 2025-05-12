
import React, { useState, useMemo } from "react";
import { UTXO } from "@/types/utxo";
import { UTXOFiltersState, TreemapGroupingOption } from "@/types/utxo-graph";
import { createTreemapData, safeFormatBTC, filterUTXOs } from "@/utils/visualization-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getRiskBadgeStyle } from "@/utils/utxo-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TreemapVisualizationProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
}

export const TreemapVisualization: React.FC<TreemapVisualizationProps> = ({ 
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
  const [groupingOption, setGroupingOption] = useState<TreemapGroupingOption>("none");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedUtxo, setSelectedUtxo] = useState<UTXO | null>(null);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [showUtxoDialog, setShowUtxoDialog] = useState(false);
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
    return createTreemapData(filteredUtxos, groupingOption);
  }, [filteredUtxos, groupingOption]);
  
  // Calculate total BTC amount
  const totalAmount = useMemo(() => {
    return filteredUtxos.reduce((sum, utxo) => sum + (utxo.amount || 0), 0);
  }, [filteredUtxos]);
  
  // Handle category selection
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setShowCategoryDrawer(true);
  };
  
  // Handle UTXO selection
  const handleUtxoClick = (utxo: UTXO) => {
    setSelectedUtxo(utxo);
    setEditableNote(utxo.notes || "");
    setShowUtxoDialog(true);
    
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
  
  // Helper to find the UTXOs for a category based on the grouping
  const findUtxosForCategory = (categoryName: string): UTXO[] => {
    if (groupingOption === "risk") {
      const riskLevel = categoryName.toLowerCase().includes("low") ? "low" :
                         categoryName.toLowerCase().includes("medium") ? "medium" : "high";
      return filteredUtxos.filter(utxo => utxo.privacyRisk === riskLevel);
    } 
    else if (groupingOption === "wallet") {
      return filteredUtxos.filter(utxo => (utxo.walletName || "Unknown") === categoryName);
    }
    else if (groupingOption === "tag") {
      if (categoryName === "Untagged") {
        return filteredUtxos.filter(utxo => utxo.tags.length === 0);
      }
      return filteredUtxos.filter(utxo => utxo.tags.includes(categoryName));
    }
    
    // For "none" grouping or fallback
    return [];
  };
  
  // Calculate relative size based on BTC amount
  const calculateSize = (amount: number) => {
    if (totalAmount === 0) return 0;
    return Math.max(5, (amount / totalAmount) * 100);
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
          />
        </div>
        
        <div className="flex gap-2 items-center">
          {/* Grouping selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Group By:</span>
            <Select
              value={groupingOption}
              onValueChange={(value) => setGroupingOption(value as TreemapGroupingOption)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="risk">Risk Level</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="tag">Tag</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
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
          {/* Tags filter */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Filter by Tags</h3>
              {filters.selectedTags.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFilterChange("selectedTags", [])}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
              {availableTags.map(tag => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`tag-${tag}`} 
                    checked={filters.selectedTags.includes(tag)}
                    onCheckedChange={() => handleTagFilterToggle(tag)}
                  />
                  <Label htmlFor={`tag-${tag}`} className="cursor-pointer">
                    {tag}
                  </Label>
                </div>
              ))}
              {availableTags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags available</p>
              )}
            </div>
          </div>
          
          {/* Wallets filter */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Filter by Wallets</h3>
              {filters.selectedWallets.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFilterChange("selectedWallets", [])}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
              {availableWallets.map(wallet => (
                <div key={wallet} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`wallet-${wallet}`} 
                    checked={filters.selectedWallets.includes(wallet)}
                    onCheckedChange={() => handleWalletFilterToggle(wallet)}
                  />
                  <Label htmlFor={`wallet-${wallet}`} className="cursor-pointer">
                    {wallet}
                  </Label>
                </div>
              ))}
              {availableWallets.length === 0 && (
                <p className="text-sm text-muted-foreground">No wallets available</p>
              )}
            </div>
          </div>
          
          {/* Risk levels filter */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Filter by Risk Level</h3>
              {filters.selectedRiskLevels.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFilterChange("selectedRiskLevels", [])}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="risk-low" 
                  checked={filters.selectedRiskLevels.includes("low")}
                  onCheckedChange={() => handleRiskFilterToggle("low")}
                />
                <Label htmlFor="risk-low" className="cursor-pointer flex items-center">
                  <div className="w-3 h-3 rounded-full bg-[#10b981] mr-2"></div>
                  Low Risk
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="risk-medium" 
                  checked={filters.selectedRiskLevels.includes("medium")}
                  onCheckedChange={() => handleRiskFilterToggle("medium")}
                />
                <Label htmlFor="risk-medium" className="cursor-pointer flex items-center">
                  <div className="w-3 h-3 rounded-full bg-[#f97316] mr-2"></div>
                  Medium Risk
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="risk-high" 
                  checked={filters.selectedRiskLevels.includes("high")}
                  onCheckedChange={() => handleRiskFilterToggle("high")}
                />
                <Label htmlFor="risk-high" className="cursor-pointer flex items-center">
                  <div className="w-3 h-3 rounded-full bg-[#ea384c] mr-2"></div>
                  High Risk
                </Label>
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
        <h2 className="text-lg font-semibold mb-4">
          UTXO {groupingOption !== "none" ? groupingOption.charAt(0).toUpperCase() + groupingOption.slice(1) + " " : ""}
          Visualization
        </h2>
        
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
                <h3 className="font-medium">Groups</h3>
                <p className="text-2xl font-bold mt-1">
                  {groupingOption === "none" ? filteredUtxos.length : treemapData.length}
                </p>
              </div>
            </div>
            
            {/* Treemap visualization */}
            <div className="grid gap-4">
              {groupingOption !== "none" ? (
                // Grouped treemap
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {treemapData.map((category: any) => (
                    <div 
                      key={category.name}
                      className="relative overflow-hidden rounded-lg cursor-pointer transition-transform hover:scale-[1.01]"
                      style={{ 
                        backgroundColor: `${category.color}20`,
                        height: `${Math.max(120, calculateSize(category.value) * 3)}px`,
                        borderLeft: `4px solid ${category.color}`
                      }}
                      onClick={() => handleCategoryClick(category.name)}
                    >
                      <div className="absolute top-0 left-0 p-3">
                        <h3 className="font-medium" style={{ color: category.color }}>
                          {category.name}
                        </h3>
                        <p className="text-sm">
                          {category.count || 0} UTXOs | {safeFormatBTC(category.value)}
                        </p>
                      </div>
                      
                      {/* Visual representation of UTXOs within category */}
                      <div className="absolute inset-0 flex flex-wrap items-center justify-center p-12 opacity-50">
                        {category.utxos?.slice(0, 20).map((utxo: UTXO, i: number) => (
                          <div 
                            key={`${utxo.txid}-${utxo.vout}`}
                            className="m-1 rounded-sm"
                            style={{ 
                              width: `${Math.max(10, Math.log10(1 + utxo.amount) * 15)}px`,
                              height: `${Math.max(10, Math.log10(1 + utxo.amount) * 15)}px`,
                              backgroundColor: category.color
                            }}
                          />
                        ))}
                        {category.utxos && category.utxos.length > 20 && (
                          <div className="text-xs font-medium ml-2">
                            +{category.utxos.length - 20} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Individual UTXO tiles
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {filteredUtxos.map(utxo => {
                    // Determine color based on risk level
                    const color = utxo.privacyRisk === 'high' ? '#ea384c' : 
                                 utxo.privacyRisk === 'medium' ? '#f97316' : '#10b981';
                                 
                    // Calculate size based on BTC amount (logarithmic scale)
                    const size = Math.max(60, Math.min(120, 60 + Math.log10(1 + utxo.amount) * 30));
                    
                    return (
                      <div
                        key={`${utxo.txid}-${utxo.vout}`}
                        className="flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all hover:shadow-md hover:scale-105"
                        style={{ 
                          width: `${size}px`, 
                          height: `${size}px`,
                          backgroundColor: `${color}20`,
                          border: `2px solid ${color}`
                        }}
                        onClick={() => handleUtxoClick(utxo)}
                      >
                        <div className="text-xs font-medium truncate w-[80%] text-center">
                          {utxo.txid.substring(0, 6)}...{utxo.vout}
                        </div>
                        <div className="text-xs mt-1 font-mono">
                          {safeFormatBTC(utxo.amount)}
                        </div>
                        <Badge 
                          className="mt-1 text-[0.6rem]"
                          variant={utxo.privacyRisk === "high" ? "destructive" : "outline"}
                        >
                          {utxo.privacyRisk}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Category Drawer */}
      <Drawer open={showCategoryDrawer} onOpenChange={setShowCategoryDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>
              {selectedCategory} UTXOs
            </DrawerTitle>
            <DrawerDescription>
              {selectedCategory && findUtxosForCategory(selectedCategory).length || 0} UTXOs found
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 py-2">
            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2">
              {selectedCategory && findUtxosForCategory(selectedCategory).map((utxo) => (
                <div 
                  key={`${utxo.txid}-${utxo.vout}`}
                  className="border rounded-md p-3 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleUtxoClick(utxo)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium truncate">
                        UTXO {utxo.txid.substring(0, 8)}...:{utxo.vout}
                      </p>
                      <p className="text-sm mt-1 font-mono">{safeFormatBTC(utxo.amount)}</p>
                    </div>
                    <Badge className={getRiskBadgeStyle(utxo.privacyRisk)}>
                      {utxo.privacyRisk}
                    </Badge>
                  </div>
                  
                  {/* Tags */}
                  {utxo.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {utxo.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowCategoryDrawer(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      
      {/* UTXO Dialog */}
      <Dialog open={showUtxoDialog} onOpenChange={setShowUtxoDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>UTXO Details</DialogTitle>
            <DialogDescription>
              {selectedUtxo ? `TXID: ${selectedUtxo.txid.substring(0, 10)}...` : ""}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUtxo && (
            <div className="space-y-4 py-2">
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
                <div className="flex items-center gap-2">
                  <Input
                    value={editableNote}
                    onChange={(e) => setEditableNote(e.target.value)}
                    placeholder="Add notes..."
                    className="text-sm"
                  />
                  <Button size="sm" className="shrink-0" onClick={handleSaveNote}>
                    <Edit className="h-4 w-4 mr-1" />
                    Save
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUtxoDialog(false)}>
              Close
            </Button>
            <Button onClick={handleSaveNote}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
