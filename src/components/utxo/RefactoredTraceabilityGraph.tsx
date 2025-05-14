
import React, { useState, useEffect, useRef, useMemo } from "react";
import { UTXO } from "@/types/utxo";
import { GraphNode, GraphLink, UTXOFiltersState } from "@/types/utxo-graph";
// Import from our local wrapper file instead
import ForceGraph2D from "@/lib/react-force-graph-2d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Filter } from "lucide-react";
import {
  Drawer,
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
import { createTraceabilityGraph, filterUTXOs, safeFormatBTC } from "@/utils/visualization-utils";
import { getRiskBadgeStyle } from "@/utils/utxo-utils";

interface RefactoredTraceabilityGraphProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
}

type PathType = "straight" | "curved";

export const RefactoredTraceabilityGraph: React.FC<RefactoredTraceabilityGraphProps> = ({ 
  utxos, 
  onSelectUtxo 
}) => {
  // Set up state for graph and interaction
  const [filters, setFilters] = useState<UTXOFiltersState>({
    searchTerm: "",
    selectedTags: [],
    selectedWallets: [],
    selectedRiskLevels: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pathType, setPathType] = useState<PathType>("straight");
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [showAmounts, setShowAmounts] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // Refs for the graph instance and container
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Generate graph data
  const graphData = useMemo(() => {
    return createTraceabilityGraph(filteredUtxos);
  }, [filteredUtxos]);
  
  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setShowDrawer(true);
    
    if (node.type === "utxo" && onSelectUtxo && node.data?.utxo) {
      onSelectUtxo(node.data.utxo);
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
  
  // Center and fit graph
  const centerAndFitGraph = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(500, 50);
      toast.info("Graph view reset");
    }
  };
  
  // Update graph dimensions on mount and resize
  useEffect(() => {
    const updateGraphDimensions = () => {
      if (containerRef.current && graphRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        graphRef.current.width(width);
        graphRef.current.height(height);
      }
    };
    
    window.addEventListener('resize', updateGraphDimensions);
    updateGraphDimensions();
    
    // Center and fit on initial load, with a slight delay to ensure rendering
    const timer = setTimeout(() => {
      centerAndFitGraph();
    }, 500);
    
    return () => {
      window.removeEventListener('resize', updateGraphDimensions);
      clearTimeout(timer);
    };
  }, []);
  
  // Re-center when graph data changes significantly
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      const timer = setTimeout(() => {
        centerAndFitGraph();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [graphData.nodes.length]);

  // Custom node render function
  const nodeCanvasObject = (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const { x, y } = node as any; // Position from force simulation
    
    if (!x || !y) return; // Skip if no position
    
    const fontSize = 4;
    const nodeSize = Math.max(5, Math.sqrt(node.amount || 1) * 3); // Scale based on amount
    
    // Draw node
    ctx.beginPath();
    
    // Different styles based on node type
    if (node.type === "transaction") {
      // Transaction nodes as indigo rectangles
      const width = nodeSize * 1.5;
      const height = nodeSize;
      
      // Draw rounded rectangle
      const radius = 2;
      ctx.fillStyle = "#6366F1"; // Indigo
      ctx.beginPath();
      ctx.moveTo(x - width/2 + radius, y - height/2);
      ctx.lineTo(x + width/2 - radius, y - height/2);
      ctx.quadraticCurveTo(x + width/2, y - height/2, x + width/2, y - height/2 + radius);
      ctx.lineTo(x + width/2, y + height/2 - radius);
      ctx.quadraticCurveTo(x + width/2, y + height/2, x + width/2 - radius, y + height/2);
      ctx.lineTo(x - width/2 + radius, y + height/2);
      ctx.quadraticCurveTo(x - width/2, y + height/2, x - width/2, y + height/2 - radius);
      ctx.lineTo(x - width/2, y - height/2 + radius);
      ctx.quadraticCurveTo(x - width/2, y - height/2, x - width/2 + radius, y - height/2);
      ctx.fill();
      
      // Add label if enabled and close enough to see details
      if (showNodeLabels && globalScale > 0.7) {
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        
        // Shortened TXID
        const label = node.name || "TX";
        ctx.fillText(label, x, y - 2);
        
        // Amount (if enabled)
        if (showAmounts) {
          const amountText = safeFormatBTC(node.amount || 0).slice(0, 8); // Shortened BTC display
          ctx.fillText(amountText, x, y + 4);
        }
      }
      
      // Draw indicator for having tags
      if (node.data?.tags && node.data.tags.length > 0) {
        ctx.beginPath();
        ctx.arc(x + width/2 - 2, y - height/2 + 2, 2, 0, 2 * Math.PI);
        ctx.fillStyle = "#22c55e"; // Green dot for tags
        ctx.fill();
      }
    } 
    else if (node.type === "address") {
      // Address nodes as blue circles
      ctx.fillStyle = "#3b82f6"; // Blue
      ctx.beginPath();
      ctx.arc(x, y, nodeSize * 0.8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add label
      if (showNodeLabels && globalScale > 0.7) {
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        const label = node.name || "Addr";
        ctx.fillText(label, x, y);
      }
    }
  };
  
  // Custom link render function
  const linkCanvasObject = (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!link.source || !link.target) return;
    
    // Get source & target coordinates
    const sx = link.source.x;
    const sy = link.source.y;
    const tx = link.target.x;
    const ty = link.target.y;
    
    if (sx === undefined || sy === undefined || tx === undefined || ty === undefined) {
      return;
    }
    
    // Set line style based on risk level and whether it's a change output
    let strokeColor = "#a1a1a1"; // Default gray
    let lineWidth = 1;
    
    if (link.isChangeOutput) {
      strokeColor = "#7c3aed"; // Purple for change outputs
      lineWidth = 1.5;
    } else if (link.riskLevel) {
      // Color based on risk level
      switch(link.riskLevel) {
        case "high":
          strokeColor = "#ef4444"; // Red
          lineWidth = 2;
          break;
        case "medium":
          strokeColor = "#f97316"; // Orange
          lineWidth = 1.5;
          break;
        case "low":
          strokeColor = "#10b981"; // Green
          lineWidth = 1;
          break;
      }
    }
    
    // Path type can be straight or curved
    let path = "";
    
    if (pathType === "curved") {
      // Create a curved path
      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      
      // Calculate curve offset based on distance
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Perpendicular offset for curve control point
      const offsetX = -dy * 0.2;
      const offsetY = dx * 0.2;
      
      // Control point for the curve
      const cpX = midX + offsetX;
      const cpY = midY + offsetY;
      
      // Draw curved path
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpX, cpY, tx, ty);
    } else {
      // Draw straight path
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
    }
    
    // Set line styles
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    
    // Add arrow head if close enough to see details
    if (globalScale > 0.5) {
      // Calculate angle of the line
      const angle = Math.atan2(ty - sy, tx - sx);
      
      // Arrow head size
      const headSize = 5;
      
      // Calculate position for arrow head (slightly before target)
      const targetNodeSize = Math.max(5, Math.sqrt(link.target.amount || 1) * 3);
      const offsetDist = targetNodeSize + 2;
      const arrowX = tx - Math.cos(angle) * offsetDist;
      const arrowY = ty - Math.sin(angle) * offsetDist;
      
      // Draw arrow head
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - headSize * Math.cos(angle - Math.PI/6),
        arrowY - headSize * Math.sin(angle - Math.PI/6)
      );
      ctx.lineTo(
        arrowX - headSize * Math.cos(angle + Math.PI/6),
        arrowY - headSize * Math.sin(angle + Math.PI/6)
      );
      ctx.closePath();
      ctx.fillStyle = strokeColor;
      ctx.fill();
    }
  };

  return (
    <div className="w-full h-full">
      {/* Toolbar */}
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
        
        <div className="flex gap-2">
          {/* Path type selector */}
          <Select
            value={pathType}
            onValueChange={(value: PathType) => setPathType(value)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Path Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="straight">Straight Lines</SelectItem>
              <SelectItem value="curved">Curved Lines</SelectItem>
            </SelectContent>
          </Select>
          
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
          
          {/* Zoom to fit button */}
          <Button
            variant="outline"
            size="sm"
            onClick={centerAndFitGraph}
          >
            Center Graph
          </Button>
        </div>
      </div>
      
      {/* Display options */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="show-labels" 
            checked={showNodeLabels}
            onCheckedChange={() => setShowNodeLabels(!showNodeLabels)}
          />
          <Label htmlFor="show-labels">Show Labels</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="show-amounts" 
            checked={showAmounts}
            onCheckedChange={() => setShowAmounts(!showAmounts)}
          />
          <Label htmlFor="show-amounts">Show Amounts</Label>
        </div>
      </div>
      
      {/* Expanded filters panel */}
      {showFilters && (
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
              {availableTags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags available</p>
              )}
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
              {availableWallets.length === 0 && (
                <p className="text-sm text-muted-foreground">No wallets available</p>
              )}
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
      
      {/* Graph legend */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded bg-[#6366F1]"></div>
            <span>Transaction</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
            <span>Address</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-2 bg-[#10b981]"></div>
            <span>Low Risk Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-2 bg-[#f97316]"></div>
            <span>Medium Risk Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-2 bg-[#ef4444]"></div>
            <span>High Risk Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-2 bg-[#7c3aed]"></div>
            <span>Change Output</span>
          </div>
        </div>
      </div>
      
      {/* Force graph */}
      <div 
        ref={containerRef}
        className="bg-card rounded-lg shadow-sm overflow-hidden"
        style={{ height: "calc(100vh - 300px)", minHeight: "500px" }}
      >
        {graphData.nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No data to display. Try adjusting your filters.
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            nodeLabel={null} // Custom tooltip handled in nodeCanvasObject
            linkLabel={null} // Custom tooltip handled in linkCanvasObject
            cooldownTicks={100}
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setShowDrawer(false)}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            linkDirectionalParticles={3}
            linkDirectionalParticleWidth={2}
            nodeRelSize={4}
            autoPauseRedraw={false}
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
          />
        )}
      </div>
      
      {/* Node/Link Details Drawer */}
      <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>
              {selectedNode?.type === "transaction" ? "Transaction Details" : 
               selectedNode?.type === "address" ? "Address Details" : 
               "Details"}
            </DrawerTitle>
            <DrawerDescription>
              {selectedNode?.name || ""}
            </DrawerDescription>
          </DrawerHeader>
          
          {selectedNode && (
            <div className="px-4 py-2 space-y-4">
              {selectedNode.type === "transaction" && (
                <>
                  {/* Basic transaction info */}
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">TXID:</span>
                      <span className="text-sm font-mono">{selectedNode.data?.txid || ""}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm font-medium">Total Amount:</span>
                      <span className="text-sm font-mono">{safeFormatBTC(selectedNode.amount || 0)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm font-medium">UTXOs:</span>
                      <span className="text-sm">{selectedNode.data?.utxos?.length || 0}</span>
                    </div>
                  </div>
                  
                  {/* UTXOs in this transaction */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">UTXOs in this Transaction</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {selectedNode.data?.utxos?.map((utxo: UTXO) => (
                        <div key={`${utxo.txid}-${utxo.vout}`} className="bg-background p-2 rounded-md border">
                          <div className="flex justify-between">
                            <span className="text-xs font-medium">Outpoint:</span>
                            <span className="text-xs font-mono">{utxo.txid.substring(0, 8)}...:{utxo.vout}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs font-medium">Amount:</span>
                            <span className="text-xs font-mono">{safeFormatBTC(utxo.amount || 0)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Badge className={getRiskBadgeStyle(utxo.privacyRisk)}>
                              {utxo.privacyRisk}
                            </Badge>
                            {utxo.tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-[0.65rem]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {selectedNode.type === "address" && (
                <>
                  {/* Basic address info */}
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Address:</span>
                      <span className="text-sm font-mono">{selectedNode.data?.address || ""}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm font-medium">Total Balance:</span>
                      <span className="text-sm font-mono">{safeFormatBTC(selectedNode.amount || 0)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowDrawer(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
