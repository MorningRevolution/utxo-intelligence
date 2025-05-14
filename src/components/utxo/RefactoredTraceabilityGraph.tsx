
import React, { useState, useEffect, useRef, useMemo } from "react";
import { UTXO } from "@/types/utxo";
import { GraphNode, GraphLink, UTXOFiltersState } from "@/types/utxo-graph";
import { createTraceabilityGraph, safeFormatBTC, filterUTXOs } from "@/utils/visualization-utils";
import { Badge } from "@/components/ui/badge";
import { getRiskBadgeStyle } from "@/utils/utxo-utils";
import { ZoomIn, ZoomOut, Filter, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface RefactoredTraceabilityGraphProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
}

export const RefactoredTraceabilityGraph: React.FC<RefactoredTraceabilityGraphProps> = ({ 
  utxos, 
  onSelectUtxo 
}) => {
  // State for graph data
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({ nodes: [], links: [] });
  
  // State for interaction
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // State for filters
  const [filters, setFilters] = useState<UTXOFiltersState>({
    searchTerm: "",
    selectedTags: [],
    selectedWallets: [],
    selectedRiskLevels: []
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Refs for the graph container
  const graphContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Generate graph data from filtered UTXOs
  useEffect(() => {
    const filteredUtxos = filterUTXOs(utxos, filters);
    const newGraphData = createTraceabilityGraph(filteredUtxos);
    
    // Assign initial positions to nodes using a force-directed algorithm
    if (newGraphData.nodes.length > 0) {
      // Simple grid layout as starting point
      const cols = Math.ceil(Math.sqrt(newGraphData.nodes.length));
      const spacingX = 250;
      const spacingY = 200;
      
      newGraphData.nodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        // Assign initial positions
        node.x = col * spacingX + 100;
        node.y = row * spacingY + 100;
      });
    }
    
    setGraphData(newGraphData);
  }, [utxos, filters]);

  // Apply force-directed layout simulation
  useEffect(() => {
    let animFrameId: number;
    let iteration = 0;
    const maxIterations = 50; // Limit iterations
    
    const simulate = () => {
      if (iteration >= maxIterations) return;
      
      // Copy nodes for manipulation
      const nodes = [...graphData.nodes];
      
      // Apply repulsive forces between nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        for (let j = 0; j < nodes.length; j++) {
          if (i !== j) {
            const otherNode = nodes[j];
            const dx = (node.x || 0) - (otherNode.x || 0);
            const dy = (node.y || 0) - (otherNode.y || 0);
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Stronger repulsion for larger nodes
            const repulsionForce = Math.min(5000 / (distance * distance), 50);
            const nodeSizeFactor = Math.sqrt(node.amount || 1) / 2;
            
            if (node.x !== undefined && node.y !== undefined) {
              node.x += dx * repulsionForce / distance * 0.1 * nodeSizeFactor;
              node.y += dy * repulsionForce / distance * 0.1 * nodeSizeFactor;
            }
          }
        }
      }
      
      // Apply attractive forces along links
      graphData.links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode && 
            sourceNode.x !== undefined && sourceNode.y !== undefined &&
            targetNode.x !== undefined && targetNode.y !== undefined) {
          const dx = sourceNode.x - targetNode.x;
          const dy = sourceNode.y - targetNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Define ideal distance based on node sizes
          const idealDistance = 200 + 
            Math.sqrt((sourceNode.amount || 1) * 30) + 
            Math.sqrt((targetNode.amount || 1) * 30);
          
          // Apply forces
          const strength = (distance - idealDistance) * 0.03;
          
          sourceNode.x -= dx * strength / distance;
          sourceNode.y -= dy * strength / distance;
          targetNode.x += dx * strength / distance;
          targetNode.y += dy * strength / distance;
        }
      });
      
      // Center gravity force
      nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          const width = graphContainerRef.current?.clientWidth || 1000;
          const height = graphContainerRef.current?.clientHeight || 800;
          const dx = node.x - width / 2;
          const dy = node.y - height / 2;
          
          node.x -= dx * 0.001;
          node.y -= dy * 0.001;
        }
      });
      
      // Update graph data with new positions
      setGraphData(prevData => ({
        ...prevData,
        nodes
      }));
      
      iteration++;
      animFrameId = requestAnimationFrame(simulate);
    };
    
    if (graphData.nodes.length > 0) {
      animFrameId = requestAnimationFrame(simulate);
    }
    
    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [graphData.nodes.length, graphData.links]);
  
  // Handle mouse interactions for dragging and zooming
  const handleMouseDown = (e: React.MouseEvent, node?: GraphNode) => {
    if (node) {
      // If clicking on a node, select it without starting drag
      setSelectedNode(node);
      setShowDrawer(true);
      
      if (node.type === "utxo" && node.data && onSelectUtxo) {
        onSelectUtxo(node.data);
      }
    } else {
      // Otherwise start pan drag
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    
    e.stopPropagation(); // Prevent event bubbling
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setPanOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle node dragging
  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation(); // Prevent propagation to container
    
    const startX = e.clientX;
    const startY = e.clientY;
    const nodeStartX = node.x || 0;
    const nodeStartY = node.y || 0;
    
    const handleNodeMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      // Update node position
      setGraphData(prev => {
        const updatedNodes = prev.nodes.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              x: nodeStartX + dx / zoomLevel,
              y: nodeStartY + dy / zoomLevel
            };
          }
          return n;
        });
        
        return {
          ...prev,
          nodes: updatedNodes
        };
      });
    };
    
    const handleNodeMouseUp = () => {
      document.removeEventListener('mousemove', handleNodeMouseMove);
      document.removeEventListener('mouseup', handleNodeMouseUp);
    };
    
    document.addEventListener('mousemove', handleNodeMouseMove);
    document.addEventListener('mouseup', handleNodeMouseUp);
    
    // Also select the node when dragging starts
    setSelectedNode(node);
  };
  
  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.3));
  };
  
  // Handle wheel event for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(prev + 0.1, 3));
    } else {
      setZoomLevel(prev => Math.max(prev - 0.1, 0.3));
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
  
  // Calculate node size based on amount and type
  const getNodeSize = (node: GraphNode) => {
    const baseSize = node.type === "transaction" ? 100 : 60;
    const sizeMultiplier = node.type === "transaction" ? 30 : 15;
    
    // Logarithmic scale for better visualization
    return baseSize + Math.log10(1 + (node.amount || 0)) * sizeMultiplier;
  };
  
  // Determine node color based on type and risk level
  const getNodeColor = (node: GraphNode) => {
    if (node.type === "transaction") {
      return "#6366F1"; // Indigo for transactions
    } else if (node.type === "address") {
      return "#E5DEFF"; // Light purple for addresses
    } else if (node.riskLevel) {
      // Color by risk for UTXOs
      switch (node.riskLevel) {
        case "high": return "#ea384c";
        case "medium": return "#f97316";
        case "low": return "#10b981";
        default: return "#8E9196";
      }
    }
    return "#8E9196"; // Default gray
  };
  
  // Determine node shape and style
  const getNodeShape = (node: GraphNode) => {
    if (node.type === "transaction") {
      return "rounded-md"; // Square with rounded corners
    } else if (node.type === "address") {
      return "rounded-full"; // Circle
    }
    return "rounded-lg"; // Rounded rectangle
  };
  
  // Determine node border style
  const getNodeBorder = (node: GraphNode) => {
    if (node.type === "transaction") {
      return "border-2 border-indigo-600";
    } else if (node.type === "address") {
      return "border border-purple-200";
    }
    return "border border-gray-300";
  };

  return (
    <div className="w-full">
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
          
          {/* Tag Filter Preview */}
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
          
          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs">{Math.round(zoomLevel * 100)}%</span>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Reset pan/zoom */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
          >
            Reset View
          </Button>
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
          <div className="w-3 h-3 rounded-md bg-[#6366F1]"></div>
          <span>Transaction</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#E5DEFF]"></div>
          <span>Address</span>
        </div>
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
      
      {/* Graph container */}
      <div 
        ref={graphContainerRef}
        className="bg-card rounded-lg shadow-sm p-4 overflow-hidden cursor-move relative min-h-[60vh]" 
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {graphData.nodes.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            No transactions to display. Try adjusting your filters.
          </div>
        ) : (
          <div 
            className="relative"
            style={{ 
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`, 
              transformOrigin: 'center center',
              minHeight: '800px',
              minWidth: '1200px'
            }}
          >
            {/* Render links as SVG paths */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{zIndex: 0}}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#8E9196" />
                </marker>
              </defs>
              <g>
                {graphData.links.map((link, i) => {
                  // Find source and target nodes
                  const sourceNode = graphData.nodes.find(n => n.id === link.source);
                  const targetNode = graphData.nodes.find(n => n.id === link.target);
                  
                  if (!sourceNode || !targetNode || 
                      sourceNode.x === undefined || sourceNode.y === undefined ||
                      targetNode.x === undefined || targetNode.y === undefined) {
                    return null;
                  }
                  
                  // Calculate source and target positions
                  const sourceSize = getNodeSize(sourceNode);
                  const targetSize = getNodeSize(targetNode);
                  const sourceX = sourceNode.x;
                  const sourceY = sourceNode.y;
                  const targetX = targetNode.x;
                  const targetY = targetNode.y;
                  
                  // Calculate direction vector
                  const dx = targetX - sourceX;
                  const dy = targetY - sourceY;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  
                  // Adjust start and end points to be on the edge of the nodes
                  const sx = sourceX + (dx / length) * (sourceSize / 2);
                  const sy = sourceY + (dy / length) * (sourceSize / 2);
                  const tx = targetX - (dx / length) * (targetSize / 2);
                  const ty = targetY - (dy / length) * (targetSize / 2);
                  
                  // Determine link color based on risk level
                  let linkColor = "#8E9196"; // Default gray
                  if (link.riskLevel) {
                    switch (link.riskLevel) {
                      case "high": linkColor = "#ea384c"; break;
                      case "medium": linkColor = "#f97316"; break;
                      case "low": linkColor = "#10b981"; break;
                    }
                  }
                  
                  // Path type can be straight or curved
                  // Fix the type comparison issue by using a boolean flag
                  const useCurvedPath = false; // Set to true to use curved paths
                  let path = "";
                  
                  if (useCurvedPath) {
                    // Create a curved path
                    const midX = (sx + tx) / 2;
                    const midY = (sy + ty) / 2;
                    const controlX = midX - (sy - ty) * 0.2;
                    const controlY = midY - (tx - sx) * 0.2;
                    
                    path = `M ${sx} ${sy} Q ${controlX} ${controlY}, ${tx} ${ty}`;
                  } else {
                    // Simple straight path
                    path = `M ${sx} ${sy} L ${tx} ${ty}`;
                  }
                  
                  return (
                    <path
                      key={`link-${i}`}
                      d={path}
                      stroke={linkColor}
                      strokeWidth={Math.max(2, link.value * 0.5)}
                      opacity={0.7}
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
              </g>
            </svg>
            
            {/* Render nodes */}
            {graphData.nodes.map((node) => {
              if (node.x === undefined || node.y === undefined) return null;
              
              const nodeSize = getNodeSize(node);
              const nodeColor = getNodeColor(node);
              
              return (
                <div
                  key={node.id}
                  className={`absolute flex flex-col items-center justify-center cursor-pointer transition-shadow hover:shadow-lg ${getNodeShape(node)} ${getNodeBorder(node)}`}
                  style={{
                    width: `${nodeSize}px`,
                    height: node.type === "transaction" ? `${nodeSize * 0.75}px` : `${nodeSize}px`,
                    backgroundColor: node.type === "transaction" ? nodeColor : `${nodeColor}20`,
                    color: node.type === "transaction" ? "white" : "black",
                    left: `${node.x - nodeSize / 2}px`,
                    top: `${node.y - nodeSize / 2}px`,
                    zIndex: node.type === "transaction" ? 2 : 1
                  }}
                  onClick={(e) => handleMouseDown(e, node)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                >
                  {/* Node content varies by type */}
                  {node.type === "transaction" && (
                    <>
                      <div className="text-xs font-medium text-white mb-1">
                        {node.name}
                      </div>
                      <div className="text-xs text-white font-bold">
                        {safeFormatBTC(node.amount)}
                      </div>
                      {node.data?.tags && node.data.tags.length > 0 && (
                        <div className="mt-1 flex gap-1 flex-wrap justify-center">
                          {node.data.tags.slice(0, 2).map((tag, i) => (
                            <Badge 
                              key={i}
                              variant="outline" 
                              className="text-[0.6rem] border-white text-white"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {node.data.tags.length > 2 && (
                            <Badge 
                              variant="outline" 
                              className="text-[0.6rem] border-white text-white"
                            >
                              +{node.data.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  
                  {node.type === "address" && (
                    <>
                      <div className="text-xs font-medium truncate max-w-[90%] text-center">
                        {node.name}
                      </div>
                      <div className="text-xs mt-1">
                        {safeFormatBTC(node.amount)}
                      </div>
                    </>
                  )}
                  
                  {node.type === "utxo" && (
                    <>
                      <div className="text-xs font-medium truncate max-w-[90%] text-center">
                        {node.name}
                      </div>
                      <div className="text-xs mt-1">
                        {safeFormatBTC(node.amount)}
                      </div>
                      {node.riskLevel && (
                        <Badge 
                          className="mt-1 text-[0.6rem]"
                          variant={node.riskLevel === "high" ? "destructive" : "outline"}
                        >
                          {node.riskLevel}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Details Drawer */}
      <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>
              {selectedNode?.type === "transaction" ? "Transaction Details" : 
               selectedNode?.type === "address" ? "Address Details" : 
               "UTXO Details"}
            </DrawerTitle>
            <DrawerDescription>
              {selectedNode?.name || "No node selected"}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 py-2">
            {selectedNode ? (
              <div className="space-y-4">
                {/* Basic node info */}
                <div className="bg-muted p-3 rounded-lg">
                  <h3 className="text-sm font-medium mb-1">
                    {selectedNode.type === "transaction" ? "Transaction ID" : 
                     selectedNode.type === "address" ? "Address" : 
                     "UTXO ID"}
                  </h3>
                  <p className="text-xs break-all font-mono">
                    {selectedNode.type === "transaction" ? selectedNode.data?.txid : 
                     selectedNode.type === "address" ? selectedNode.data?.address : 
                     selectedNode.data?.txid + ":" + selectedNode.data?.vout}
                  </p>
                  <div className="mt-2">
                    <span className="text-sm font-medium">Amount: </span>
                    <span className="font-mono">{safeFormatBTC(selectedNode.amount)}</span>
                  </div>
                </div>
                
                {/* Transaction-specific details */}
                {selectedNode.type === "transaction" && selectedNode.data?.utxos && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">UTXOs in this Transaction</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {selectedNode.data.utxos.map((utxo: UTXO, i: number) => (
                        <div 
                          key={`${utxo.txid}-${utxo.vout}`}
                          className="border rounded-md p-2 flex justify-between"
                        >
                          <div>
                            <p className="text-xs font-medium">{utxo.txid.substring(0, 8)}...:{utxo.vout}</p>
                            <p className="text-xs font-mono">{safeFormatBTC(utxo.amount)}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{utxo.address}</p>
                          </div>
                          <Badge className={getRiskBadgeStyle(utxo.privacyRisk)}>
                            {utxo.privacyRisk}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Address-specific details */}
                {selectedNode.type === "address" && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Transaction History</h3>
                    {/* List transactions related to this address */}
                    <div className="text-sm text-muted-foreground">
                      Showing transactions linked to this address.
                    </div>
                    <div className="mt-2 space-y-2">
                      {graphData.links
                        .filter(link => {
                          return link.source === selectedNode.id || link.target === selectedNode.id;
                        })
                        .map((link, i) => {
                          const connectedId = link.source === selectedNode.id ? link.target : link.source;
                          const connectedNode = graphData.nodes.find(n => n.id === connectedId);
                          
                          if (!connectedNode || connectedNode.type !== "transaction") return null;
                          
                          const direction = link.source === selectedNode.id ? "Outgoing" : "Incoming";
                          
                          return (
                            <div key={i} className="border rounded-md p-2">
                              <Badge variant={direction === "Incoming" ? "default" : "outline"} className="mb-1">
                                {direction}
                              </Badge>
                              <p className="text-xs">{connectedNode.name}</p>
                              <p className="text-xs text-muted-foreground">{safeFormatBTC(link.value)}</p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                
                {/* UTXO-specific details */}
                {selectedNode.type === "utxo" && selectedNode.data && (
                  <>
                    {/* Tags */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.data.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {selectedNode.data.tags.length === 0 && (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Risk assessment */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Privacy Risk</h3>
                      <div className={`p-3 rounded-lg text-sm ${
                        selectedNode.data.privacyRisk === 'high' ? 'bg-red-100 dark:bg-red-950/20' :
                        selectedNode.data.privacyRisk === 'medium' ? 'bg-orange-100 dark:bg-orange-950/20' :
                        'bg-green-100 dark:bg-green-950/20'
                      }`}>
                        <Badge className={getRiskBadgeStyle(selectedNode.data.privacyRisk)}>
                          {selectedNode.data.privacyRisk.toUpperCase()} RISK
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                Select a node to view details
              </div>
            )}
          </div>
          
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
