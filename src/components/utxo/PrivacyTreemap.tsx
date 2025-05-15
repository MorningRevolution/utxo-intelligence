
import React, { useState, useEffect, useMemo, useRef } from "react";
import { UTXO } from "@/types/utxo";
import { UTXOFiltersState, TreemapTile, TreemapGroupingOption } from "@/types/utxo-graph";
import { createPrivacyTreemap, filterUTXOs, safeFormatBTC, getRiskColor } from "@/utils/visualization-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { getRiskBadgeStyle } from "@/utils/utxo-utils";
import { Search, Tag, Filter, Layers, ZoomIn, ZoomOut, Maximize, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  
  // Visualization controls
  const [zoom, setZoom] = useState(1);
  const [groupBy, setGroupBy] = useState<TreemapGroupingOption>("none");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUtxo, setSelectedUtxo] = useState<UTXO | null>(null);
  const [showUtxoDrawer, setShowUtxoDrawer] = useState(false);
  const [editableNote, setEditableNote] = useState("");
  
  // Refs for container and panning
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  
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
  
  // Generate treemap data using the new mempool-style layout
  const treemapData = useMemo(() => {
    return createPrivacyTreemap(filteredUtxos);
  }, [filteredUtxos]);
  
  // Calculate total BTC amount
  const totalAmount = useMemo(() => {
    return filteredUtxos.reduce((sum, utxo) => sum + (utxo.amount || 0), 0);
  }, [filteredUtxos]);
  
  // Calculate risk distribution
  const riskDistribution = useMemo(() => {
    const distribution = { low: 0, medium: 0, high: 0 };
    
    filteredUtxos.forEach(utxo => {
      if (utxo.privacyRisk) {
        distribution[utxo.privacyRisk] += utxo.amount;
      }
    });
    
    return distribution;
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
  
  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };
  
  const handleResetView = () => {
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
  };
  
  // Handle panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging on background or with middle mouse button
    if (e.button !== 0 || (e.target as HTMLElement).tagName === "DIV") {
      setIsDragging(true);
      setStartPos({
        x: e.clientX - translate.x,
        y: e.clientY - translate.y
      });
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setTranslate({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle wheel/scroll for zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
      setZoom(newZoom);
    }
  };

  return (
    <div className="w-full">
      {/* Top controls - filters and search */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <div className="relative flex items-center">
            <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by txid, address, tag..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="w-full pl-8"
            />
          </div>
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
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-card p-4 rounded-lg shadow-sm mb-4 grid gap-4 md:grid-cols-3">
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
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Legend & Controls */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap justify-between items-center">
        {/* Legend */}
        <div className="flex gap-3 text-xs items-center">
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
        
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomOut}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <div className="w-20">
            <Slider
              value={[zoom]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={(values) => setZoom(values[0])}
            />
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomIn}
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            className="h-8"
          >
            <Maximize className="h-4 w-4 mr-1" />
            <span>Reset</span>
          </Button>
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
            <div className="grid grid-cols-4 gap-4 mb-6">
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
              <div className="bg-muted p-3 rounded-lg text-center">
                <h3 className="font-medium">Risk Distribution</h3>
                <div className="flex justify-center items-center h-8 mt-1 gap-1">
                  {totalAmount > 0 && (
                    <>
                      <div 
                        className="bg-[#10b981] h-full rounded-l-sm tooltip-trigger"
                        style={{ 
                          width: `${Math.max(5, (riskDistribution.low / totalAmount) * 100)}%`,
                        }}
                        title={`Low: ${((riskDistribution.low / totalAmount) * 100).toFixed(1)}%`}
                      ></div>
                      <div 
                        className="bg-[#f97316] h-full tooltip-trigger"
                        style={{ 
                          width: `${Math.max(5, (riskDistribution.medium / totalAmount) * 100)}%`,
                        }}
                        title={`Medium: ${((riskDistribution.medium / totalAmount) * 100).toFixed(1)}%`}
                      ></div>
                      <div 
                        className="bg-[#ea384c] h-full rounded-r-sm tooltip-trigger"
                        style={{ 
                          width: `${Math.max(5, (riskDistribution.high / totalAmount) * 100)}%`,
                        }}
                        title={`High: ${((riskDistribution.high / totalAmount) * 100).toFixed(1)}%`}
                      ></div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Mempool-style UTXO layout with improved visualization */}
            <div 
              ref={containerRef}
              className="relative bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-hidden"
              style={{ 
                minHeight: '500px', 
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <div 
                className="flex flex-wrap gap-1 transition-transform duration-100"
                style={{ 
                  transform: `scale(${zoom}) translate(${translate.x / zoom}px, ${translate.y / zoom}px)`,
                  transformOrigin: 'center',
                }}
              >
                <TooltipProvider>
                  {treemapData.map(utxo => {
                    // Use the displaySize property for relative sizing
                    const isHovered = hoveredTile === utxo.id;
                    
                    return (
                      <Tooltip key={utxo.id}>
                        <TooltipTrigger asChild>
                          <motion.div
                            className="flex flex-col items-center justify-center rounded-md cursor-pointer relative overflow-hidden"
                            style={{ 
                              width: `${Math.max(60, utxo.displaySize * 20)}px`, 
                              height: `${Math.max(60, utxo.displaySize * 20)}px`,
                              backgroundColor: `${utxo.color}15`,
                              borderLeft: `3px solid ${utxo.color}`,
                            }}
                            onClick={() => handleUtxoClick(utxo.data)}
                            onMouseEnter={() => setHoveredTile(utxo.id)}
                            onMouseLeave={() => setHoveredTile(null)}
                            whileHover={{ scale: 1.05, zIndex: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            layout
                          >
                            <div className="text-xs font-medium truncate w-[90%] text-center">
                              {utxo.name}
                            </div>
                            <div className="text-xs mt-1 font-mono font-bold">
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
                            
                            {/* Show additional info if tile is expanded/hovered */}
                            {(isHovered || utxo.displaySize > 10) && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-1"
                              >
                                <Badge 
                                  className="text-[0.65rem]"
                                  variant={utxo.data.privacyRisk === "high" ? "destructive" : "outline"}
                                >
                                  {utxo.data.privacyRisk}
                                </Badge>
                              </motion.div>
                            )}
                            
                            {/* Highlight border on hover */}
                            {isHovered && (
                              <motion.div 
                                className="absolute inset-0 border-2 rounded-md"
                                style={{ borderColor: utxo.color }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              />
                            )}
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="px-2 py-1">
                            <div className="font-bold">{safeFormatBTC(utxo.value)}</div>
                            <div className="text-xs">{utxo.data.txid}</div>
                            <div className="text-xs mt-1 flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: utxo.color }}
                              />
                              <span className="capitalize">{utxo.data.privacyRisk} Risk</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
              
              {/* Instructions overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-card/60 py-1 px-2 rounded text-xs text-center backdrop-blur-sm">
                Click and drag to pan. Use mouse wheel or zoom controls to zoom in/out.
              </div>
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
