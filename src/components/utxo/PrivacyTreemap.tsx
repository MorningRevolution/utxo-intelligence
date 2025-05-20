
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UTXO } from "@/types/utxo";
import { TreemapTile, TreemapGroupingOption, UTXOFiltersState } from "@/types/utxo-graph";
import { createPrivacyTreemap, filterUTXOs, safeFormatBTC } from "@/utils/visualization-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, ZoomIn, ZoomOut, Maximize, RefreshCw, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { getRiskBadgeStyle } from "@/utils/utxo-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Custom hook for handling zoom and pan
const useZoomAndPan = (initialZoom = 1) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const handleZoomIn = () => setZoom(prev => Math.min(2, prev + 0.1));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.1));
  const handleReset = () => {
    setZoom(initialZoom);
    setPosition({ x: 0, y: 0 });
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ 
      x: e.clientX - dragStart.x, 
      y: e.clientY - dragStart.y 
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
      setZoom(newZoom);
    }
  };
  
  return {
    zoom,
    position,
    isDragging,
    setZoom,
    setPosition,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel
  };
};

// Squarified treemap algorithm - creates an optimal layout of tiles
const createSquarifiedLayout = (tiles: TreemapTile[], width: number, height: number) => {
  if (!tiles.length) return [];
  
  const totalValue = tiles.reduce((sum, tile) => sum + tile.value, 0);
  const scaleFactor = (width * height) / totalValue;
  
  // Scale values for area calculation
  const scaledTiles = tiles.map(tile => ({
    ...tile,
    scaledValue: tile.value * scaleFactor
  }));
  
  // Sort by value descending for better layout
  const sortedTiles = [...scaledTiles].sort((a, b) => b.value - a.value);
  
  // Apply squarified algorithm to determine x, y, width, height
  let x = 0;
  let y = 0;
  let remainingWidth = width;
  let remainingHeight = height;
  
  const layoutedTiles: TreemapTile[] = [];
  let currentRow: (TreemapTile & { scaledValue: number })[] = [];
  let currentRowArea = 0;
  
  // Helper to find worst aspect ratio in current row
  const getWorstRatio = (row: (TreemapTile & { scaledValue: number })[], w: number) => {
    if (!row.length) return Infinity;
    const rowArea = row.reduce((sum, t) => sum + t.scaledValue, 0);
    const rowHeight = rowArea / w;
    
    return Math.max(
      ...row.map(tile => {
        const tileWidth = (tile.scaledValue / rowArea) * w;
        return Math.max(tileWidth / rowHeight, rowHeight / tileWidth);
      })
    );
  };
  
  // Helper to layout current row
  const layoutRow = (row: (TreemapTile & { scaledValue: number })[], startX: number, startY: number, w: number, h: number) => {
    const rowArea = row.reduce((sum, t) => sum + t.scaledValue, 0);
    let currentX = startX;
    
    row.forEach(tile => {
      const tileWidth = (tile.scaledValue / rowArea) * w;
      layoutedTiles.push({
        ...tile,
        x: currentX,
        y: startY,
        width: tileWidth,
        height: h
      });
      currentX += tileWidth;
    });
  };
  
  for (let i = 0; i < sortedTiles.length; i++) {
    const tile = sortedTiles[i];
    const newRow = [...currentRow, tile];
    
    // Determine which dimension is shorter
    const isHorizontalLayout = remainingWidth >= remainingHeight;
    const currentDimension = isHorizontalLayout ? remainingWidth : remainingHeight;
    
    // Calculate aspect ratios
    const currentRatio = getWorstRatio(currentRow, currentDimension);
    const newRatio = getWorstRatio(newRow, currentDimension);
    
    // If adding this tile makes the aspect ratio worse, layout current row and start a new one
    if (currentRow.length > 0 && newRatio > currentRatio) {
      // Layout current row
      const rowArea = currentRow.reduce((sum, t) => sum + t.scaledValue, 0);
      
      if (isHorizontalLayout) {
        const rowHeight = rowArea / remainingWidth;
        layoutRow(currentRow, x, y, remainingWidth, rowHeight);
        y += rowHeight;
        remainingHeight -= rowHeight;
      } else {
        const rowWidth = rowArea / remainingHeight;
        layoutRow(currentRow, x, y, rowWidth, remainingHeight);
        x += rowWidth;
        remainingWidth -= rowWidth;
      }
      
      // Start new row with current tile
      currentRow = [tile];
    } else {
      // Add to current row
      currentRow.push(tile);
    }
  }
  
  // Layout any remaining tiles
  if (currentRow.length > 0) {
    const isHorizontalLayout = remainingWidth >= remainingHeight;
    const rowArea = currentRow.reduce((sum, t) => sum + t.scaledValue, 0);
    
    if (isHorizontalLayout) {
      const rowHeight = rowArea / remainingWidth;
      layoutRow(currentRow, x, y, remainingWidth, rowHeight);
    } else {
      const rowWidth = rowArea / remainingHeight;
      layoutRow(currentRow, x, y, rowWidth, remainingHeight);
    }
  }
  
  return layoutedTiles;
};

interface PrivacyTreemapProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
}

export const PrivacyTreemap: React.FC<PrivacyTreemapProps> = ({ 
  utxos, 
  onSelectUtxo 
}) => {
  // References
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for treemap visualization
  const [tiles, setTiles] = useState<TreemapTile[]>([]);
  const [layoutedTiles, setLayoutedTiles] = useState<TreemapTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<TreemapTile | null>(null);
  const [showTileInfo, setShowTileInfo] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [groupingOption, setGroupingOption] = useState<TreemapGroupingOption>("none");
  
  // Zoom and pan controls
  const {
    zoom,
    position,
    isDragging,
    setZoom,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel
  } = useZoomAndPan(1);
  
  // Filters state
  const [filters, setFilters] = useState<UTXOFiltersState>({
    searchTerm: "",
    selectedTags: [],
    selectedWallets: [],
    selectedRiskLevels: []
  });
  
  // Extract available filter options
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    utxos.forEach(utxo => {
      utxo.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [utxos]);
  
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
  
  // Create Mempool-style treemap data
  useEffect(() => {
    const newTiles = createPrivacyTreemap(filteredUtxos);
    setTiles(newTiles);
  }, [filteredUtxos, groupingOption]);
  
  // Calculate layout whenever container size or tiles change
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateLayout = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const { width, height } = container.getBoundingClientRect();
      const layouted = createSquarifiedLayout(tiles, width, height);
      setLayoutedTiles(layouted);
    };
    
    updateLayout();
    
    // Add resize listener for responsive layout
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [tiles, containerRef.current]);
  
  // Handle tile selection - fixed to prevent event propagation
  const handleTileClick = (e: React.MouseEvent, tile: TreemapTile) => {
    // Stop event propagation to prevent closing the entire page
    e.stopPropagation();
    e.preventDefault();
    
    setSelectedTile(tile);
    setShowTileInfo(true);
    
    if (onSelectUtxo && tile.data) {
      onSelectUtxo(tile.data);
    }
  };
  
  // Handle search term change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      searchTerm: e.target.value
    }));
  };
  
  // Handle risk level filter toggle
  const handleRiskFilterToggle = (risk: "low" | "medium" | "high") => {
    setFilters(prev => {
      const newRisks = prev.selectedRiskLevels.includes(risk)
        ? prev.selectedRiskLevels.filter(r => r !== risk)
        : [...prev.selectedRiskLevels, risk];
      
      return { ...prev, selectedRiskLevels: newRisks };
    });
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
  
  // Reset all filters
  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      selectedTags: [],
      selectedWallets: [],
      selectedRiskLevels: []
    });
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      {/* Controls */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            className="h-8 w-8"
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <div className="w-24">
            <Slider
              min={0.5}
              max={2}
              step={0.1}
              value={[zoom]}
              onValueChange={(value) => value[0] && setZoom(value[0])}
            />
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1"
          >
            <Maximize className="h-4 w-4" />
            <span>Reset</span>
          </Button>
          
          <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
            <SheetTrigger asChild>
              <Button
                variant={Object.values(filters).some(v => 
                  Array.isArray(v) ? v.length > 0 : Boolean(v)
                ) ? "default" : "outline"}
                size="sm"
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
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Filter UTXOs</SheetTitle>
                <SheetDescription>
                  Apply filters to visualize specific UTXOs
                </SheetDescription>
              </SheetHeader>
              
              <div className="py-6 space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Search</h3>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by txid, address, tag..."
                      className="pl-8"
                      value={filters.searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
                
                {/* Risk Levels */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Risk Levels</h3>
                    {filters.selectedRiskLevels.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setFilters(prev => ({ ...prev, selectedRiskLevels: [] }))}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      className={`cursor-pointer ${filters.selectedRiskLevels.includes("low") 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        : "bg-secondary text-secondary-foreground"}`}
                      onClick={() => handleRiskFilterToggle("low")}
                    >
                      Low Risk
                    </Badge>
                    <Badge 
                      className={`cursor-pointer ${filters.selectedRiskLevels.includes("medium") 
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                        : "bg-secondary text-secondary-foreground"}`}
                      onClick={() => handleRiskFilterToggle("medium")}
                    >
                      Medium Risk
                    </Badge>
                    <Badge 
                      className={`cursor-pointer ${filters.selectedRiskLevels.includes("high") 
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                        : "bg-secondary text-secondary-foreground"}`}
                      onClick={() => handleRiskFilterToggle("high")}
                    >
                      High Risk
                    </Badge>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Tags</h3>
                    {filters.selectedTags.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setFilters(prev => ({ ...prev, selectedTags: [] }))}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2">
                    {availableTags.map(tag => (
                      <Badge 
                        key={tag}
                        className={`cursor-pointer ${filters.selectedTags.includes(tag) 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-secondary-foreground"}`}
                        onClick={() => handleTagFilterToggle(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                    {availableTags.length === 0 && (
                      <p className="text-sm text-muted-foreground">No tags available</p>
                    )}
                  </div>
                </div>
                
                {/* Wallets */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Wallets</h3>
                    {filters.selectedWallets.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setFilters(prev => ({ ...prev, selectedWallets: [] }))}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2">
                    {availableWallets.map(wallet => (
                      <Badge 
                        key={wallet}
                        className={`cursor-pointer ${filters.selectedWallets.includes(wallet) 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-secondary-foreground"}`}
                        onClick={() => handleWalletFilterToggle(wallet)}
                      >
                        {wallet}
                      </Badge>
                    ))}
                    {availableWallets.length === 0 && (
                      <p className="text-sm text-muted-foreground">No wallets available</p>
                    )}
                  </div>
                </div>
                
                {/* Reset Button */}
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={clearFilters}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset All Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Grouping Selector */}
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
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search UTXOs..."
            className="pl-8 w-full"
            value={filters.searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      
      {/* Treemap Container */}
      <div 
        ref={containerRef}
        className="bg-card rounded-lg shadow-sm p-4 flex-1 relative overflow-hidden"
        style={{ 
          minHeight: '500px', 
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Info text if no UTXOs */}
        {(!layoutedTiles || layoutedTiles.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {filteredUtxos.length === 0 ? 
              "No UTXOs match the current filters." : 
              "Processing UTXO data..."}
          </div>
        )}
        
        {/* Treemap Visualization */}
        <div
          className="relative w-full h-full"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.2s ease'
          }}
        >
          <AnimatePresence>
            {layoutedTiles.map((tile) => (
              <TooltipProvider key={tile.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      className="absolute overflow-hidden rounded cursor-pointer"
                      style={{
                        left: tile.x,
                        top: tile.y,
                        width: tile.width,
                        height: tile.height,
                        backgroundColor: tile.color,
                        border: tile.id === selectedTile?.id ? '2px solid white' : 'none'
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={(e) => handleTileClick(e, tile)}
                      whileHover={{ scale: 1.02, zIndex: 10 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      {/* Only show text if the tile is large enough */}
                      {tile.width > 40 && tile.height > 40 ? (
                        <div className="absolute inset-0 p-2 flex flex-col justify-between text-white">
                          <div className="text-xs font-medium truncate">
                            {tile.name}
                          </div>
                          
                          <div className="mt-auto">
                            <div className="text-xs font-bold">
                              {safeFormatBTC(tile.value)}
                            </div>
                            
                            {tile.height > 60 && (
                              <Badge className="mt-1 text-[0.6rem] bg-white/20 text-white border-none">
                                {tile.data?.privacyRisk || "unknown"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Minimal representation for very small tiles
                        <div className="w-full h-full flex items-center justify-center">
                          {tile.width > 15 && tile.height > 15 && (
                            <div className="h-1 w-1 bg-white rounded-full" />
                          )}
                        </div>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="p-2 space-y-1">
                      <div className="font-medium">{tile.name}</div>
                      <div>{safeFormatBTC(tile.value)}</div>
                      <div className="flex items-center gap-1">
                        <span>Risk:</span>
                        <Badge className={getRiskBadgeStyle(tile.data?.privacyRisk || "low")}>
                          {tile.data?.privacyRisk || "unknown"}
                        </Badge>
                      </div>
                      {tile.data?.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tile.data.tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-[0.6rem]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </AnimatePresence>
        </div>
        
        {/* Instructions overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-background/50 p-2 rounded text-xs text-center backdrop-blur-sm">
          Click and drag to move. Use mouse wheel or zoom controls to zoom in/out. Click on tiles for details.
        </div>
      </div>
      
      {/* UTXO Info Dialog - Isolated from parent component */}
      <Dialog open={showTileInfo} onOpenChange={(open) => {
        setShowTileInfo(open);
        // Clear selection if dialog is closed
        if (!open && !selectedTile?.id) {
          setSelectedTile(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>UTXO Details</DialogTitle>
            <DialogDescription>
              {selectedTile?.data ? `TXID: ${selectedTile.data.txid.substring(0, 10)}...` : ""}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTile?.data && (
            <div className="space-y-4 py-2">
              {/* Basic info */}
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Outpoint:</span>
                  <span className="text-sm font-mono">{selectedTile.data.txid}:{selectedTile.data.vout}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-sm font-mono">{safeFormatBTC(selectedTile.data.amount)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">Address:</span>
                  <span className="text-sm font-mono truncate max-w-[250px]">{selectedTile.data.address}</span>
                </div>
                {selectedTile.data.receiverAddress && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm font-medium">Receiver:</span>
                    <span className="text-sm font-mono truncate max-w-[250px]">{selectedTile.data.receiverAddress}</span>
                  </div>
                )}
                {selectedTile.data.acquisitionDate && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm font-medium">Date:</span>
                    <span className="text-sm">{new Date(selectedTile.data.acquisitionDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              {/* Tags */}
              <div>
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedTile.data.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="cursor-pointer">
                      {tag}
                    </Badge>
                  ))}
                  {selectedTile.data.tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
              
              {/* Privacy analysis */}
              <div>
                <h3 className="text-sm font-medium mb-2">Privacy Analysis</h3>
                <div className={`p-3 rounded-lg text-sm ${
                  selectedTile.data.privacyRisk === 'high' ? 'bg-red-100 dark:bg-red-950/20' :
                  selectedTile.data.privacyRisk === 'medium' ? 'bg-orange-100 dark:bg-orange-950/20' :
                  'bg-green-100 dark:bg-green-950/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getRiskBadgeStyle(selectedTile.data.privacyRisk)}>
                      {selectedTile.data.privacyRisk.toUpperCase()} RISK
                    </Badge>
                  </div>
                  
                  {selectedTile.data.privacyRisk === 'high' && (
                    <p>This UTXO has high privacy risk due to its traceability to KYC-related sources.</p>
                  )}
                  
                  {selectedTile.data.privacyRisk === 'medium' && (
                    <p>This UTXO has medium privacy risk. Consider using CoinJoin before spending.</p>
                  )}
                  
                  {selectedTile.data.privacyRisk === 'low' && (
                    <p>This UTXO has good privacy characteristics.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

