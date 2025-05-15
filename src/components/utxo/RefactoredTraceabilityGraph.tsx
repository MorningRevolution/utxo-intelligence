import React, { useState, useEffect, useRef, useMemo } from "react";
import { UTXO } from "@/types/utxo";
import { createTraceabilityGraph, optimizeGraphLayout, calculateNodeSize, safeFormatBTC, getVisualizationRiskColor } from "@/utils/visualization-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Box, Filter, ZoomIn, ZoomOut, Maximize, Minimize, Layers, Plus, Minus } from "lucide-react";
import { GraphNode, GraphLink } from "@/types/utxo-graph";
import { toast } from "sonner";
import { getRiskBadgeStyle } from "@/utils/utxo-utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RefactoredTraceabilityGraphProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
}

export const RefactoredTraceabilityGraph: React.FC<RefactoredTraceabilityGraphProps> = ({ 
  utxos, 
  onSelectUtxo 
}) => {
  // State for graph visualization
  const [graph, setGraph] = useState<{nodes: GraphNode[], links: GraphLink[]}>({ nodes: [], links: [] });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showNodeInfo, setShowNodeInfo] = useState(false);
  const [groupByWallet, setGroupByWallet] = useState(false);
  
  // Reference to the graph container
  const graphContainerRef = useRef<HTMLDivElement>(null);
  
  // Calculate graph data from UTXOs
  useEffect(() => {
    const graphData = createTraceabilityGraph(utxos);
    
    // Optimize layout to minimize overlapping
    const optimizedGraph = optimizeGraphLayout(graphData.nodes, graphData.links);
    setGraph(optimizedGraph);
  }, [utxos, groupByWallet]);

  // Calculate dimensions
  const dimensions = useMemo(() => {
    if (!graphContainerRef.current) return { width: 800, height: 600 };
    return {
      width: graphContainerRef.current.clientWidth,
      height: Math.max(600, graphContainerRef.current.clientHeight)
    };
  }, [graphContainerRef.current?.clientWidth, graphContainerRef.current?.clientHeight]);
  
  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(2, prev + 0.1));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, prev - 0.1));
  };
  
  const handleZoomChange = (value: number) => {
    setZoom(value);
  };
  
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };
  
  // Handle panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
      setZoom(newZoom);
    }
  };
  
  // Toggle grouping mode
  const toggleGrouping = () => {
    setGroupByWallet(prev => !prev);
    toast.info(groupByWallet ? "Disabled grouping by wallet" : "Enabled grouping by wallet");
  };
  
  // Handle node selection
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setShowNodeInfo(true);
    
    // If it's a transaction node with UTXOs, notify parent component
    if (node.type === "transaction" && node.data?.utxos?.length > 0) {
      // Select the first UTXO for display
      const utxo = node.data.utxos[0];
      if (onSelectUtxo) {
        onSelectUtxo(utxo);
      }
    }
  };
  
  // Get connections for a node
  const getNodeConnections = (nodeId: string) => {
    return graph.links.filter(link => {
      // Fixed: Handle both string and GraphNode types for source and target
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return sourceId === nodeId || targetId === nodeId;
    });
  };
  
  // Get the color for a node based on type and risk
  const getNodeColor = (node: GraphNode) => {
    if (node.type === "transaction") {
      // Use the highest risk level of any UTXO in the transaction
      if (node.data?.utxos) {
        const hasHighRisk = node.data.utxos.some(u => u.privacyRisk === 'high');
        if (hasHighRisk) return "#ea384c";
        
        const hasMediumRisk = node.data.utxos.some(u => u.privacyRisk === 'medium');
        if (hasMediumRisk) return "#f97316";
        
        return "#10b981"; // Low risk
      }
      return "#8E9196"; // Default gray for transaction nodes
    } else if (node.type === "address") {
      return "#9b87f5"; // Purple for address nodes
    }
    
    return "#8E9196"; // Default gray
  };
  
  // Get the border color for a node when hovered or selected
  const getNodeBorderColor = (node: GraphNode) => {
    if (node.id === (selectedNode?.id || hoveredNode)) {
      return "#ffffff"; // White for selected/hovered nodes
    }
    return "transparent";
  };

  // Function to calculate position for midpoint labels on links
  const calculateLabelPosition = (source: GraphNode, target: GraphNode) => {
    const midX = (source.x || 0) + ((target.x || 0) - (source.x || 0)) / 2;
    const midY = (source.y || 0) + ((target.y || 0) - (source.y || 0)) / 2;
    return { x: midX, y: midY };
  };

  // Calculate view box and transformation 
  const viewBox = useMemo(() => {
    const width = dimensions.width;
    const height = dimensions.height;
    const centerX = width / 2;
    const centerY = height / 2;
    return `${-centerX} ${-centerY} ${width} ${height}`;
  }, [dimensions]);
  
  const transform = `translate(${position.x}, ${position.y}) scale(${zoom})`;

  return (
    <div className="w-full">
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
              onValueChange={(value) => handleZoomChange(value[0])}
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
          
          <Button
            variant={groupByWallet ? "default" : "outline"}
            size="sm"
            onClick={toggleGrouping}
            className="flex items-center gap-1"
          >
            <Layers className="h-4 w-4" />
            <span>Group by Wallet</span>
          </Button>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-[#8E9196]" />
            <span>Transactions</span>
          </div>
          <div className="flex items-center gap-1 ml-1">
            <div className="h-4 w-4 rounded-full bg-[#9b87f5]" />
            <span>Addresses</span>
          </div>
          <div className="flex items-center gap-1 ml-1">
            <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
            <span>Low Risk</span>
          </div>
          <div className="flex items-center gap-1 ml-1">
            <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center gap-1 ml-1">
            <div className="w-3 h-3 rounded-full bg-[#ea384c]"></div>
            <span>High Risk</span>
          </div>
        </div>
      </div>
      
      {/* Graph visualization */}
      <div 
        className="bg-card rounded-lg shadow-sm p-4 relative overflow-hidden"
        style={{ height: '70vh', cursor: isDragging ? 'grabbing' : 'grab' }}
        ref={graphContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg width="100%" height="100%" style={{ overflow: "visible" }}>
          <g transform={transform}>
            {/* Draw links first (behind nodes) */}
            {graph.links.map((link, index) => {
              // Fix: Handle both string and GraphNode types safely
              const sourceNode = typeof link.source === 'string' 
                ? graph.nodes.find(n => n.id === link.source) 
                : link.source;
              
              const targetNode = typeof link.target === 'string'
                ? graph.nodes.find(n => n.id === link.target)
                : link.target;
                
              if (!sourceNode || !targetNode) return null;
              
              const isHighlighted = selectedNode && 
                ((selectedNode.id === sourceNode.id) || (selectedNode.id === targetNode.id));
              
              const startX = sourceNode.x || 0;
              const startY = sourceNode.y || 0;
              const endX = targetNode.x || 0;
              const endY = targetNode.y || 0;
              
              // Calculate source and target node sizes for proper edge connection
              const sourceSize = sourceNode.radius || calculateNodeSize(sourceNode);
              const targetSize = targetNode.radius || calculateNodeSize(targetNode);
              
              // Calculate proper start and end points for the edge 
              // so it connects to the border of the nodes, not center
              const dx = endX - startX;
              const dy = endY - startY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // Normalize the direction vector and scale by node radius
              const dirX = dx / distance;
              const dirY = dy / distance;
              
              // Adjust starting point
              const adjustedStartX = startX + dirX * (sourceSize / 2);
              const adjustedStartY = startY + dirY * (sourceSize / 2);
              
              // Adjust ending point
              const adjustedEndX = endX - dirX * (targetSize / 2);
              const adjustedEndY = endY - dirY * (targetSize / 2);
              
              // Calculate line style based on link properties
              let strokeDasharray = "none";
              if (link.isChangeOutput) {
                strokeDasharray = "5,3";
              }
              
              // Calculate line color based on risk level
              const strokeColor = getVisualizationRiskColor(link.riskLevel);
              
              // Use thicker/more opaque line for larger value transfers and highlighted edges
              const strokeWidth = Math.max(1, Math.min(5, Math.log10(1 + link.value) * 1.5)) + (isHighlighted ? 1 : 0);
              const opacity = isHighlighted ? 0.8 : 0.5;
              
              return (
                <g key={`link-${index}`}>
                  {/* Edge */}
                  <line
                    x1={adjustedStartX}
                    y1={adjustedStartY}
                    x2={adjustedEndX}
                    y2={adjustedEndY}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                  />
                  
                  {/* Arrow marker */}
                  <polygon 
                    points="0,-3 6,0 0,3"
                    transform={`translate(${adjustedEndX},${adjustedEndY}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`}
                    fill={strokeColor}
                    opacity={opacity}
                  />
                  
                  {/* Edge value label (only for larger values and when zoomed enough) */}
                  {(link.value > 0.1 && zoom > 0.8) && (
                    <text
                      x={(adjustedStartX + adjustedEndX) / 2}
                      y={(adjustedStartY + adjustedEndY) / 2 - 5}
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="10"
                      fontWeight={isHighlighted ? "bold" : "normal"}
                      pointerEvents="none"
                      opacity={isHighlighted ? 1 : 0.7}
                    >
                      {link.value < 0.0001 ? "<0.0001" : link.value.toFixed(4)}
                    </text>
                  )}
                </g>
              );
            })}
            
            {/* Draw nodes on top */}
            {graph.nodes.map((node) => {
              const size = node.radius || calculateNodeSize(node);
              const isHighlighted = node.id === (selectedNode?.id || hoveredNode);
              const nodeColor = getNodeColor(node);
              const borderColor = getNodeBorderColor(node);
              const nodeOpacity = isHighlighted ? 0.9 : 0.7;
              const textSize = node.type === "transaction" ? 12 : 10;
              
              const x = node.x || 0;
              const y = node.y || 0;
              
              return (
                <TooltipProvider key={node.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <g 
                        transform={`translate(${x},${y})`}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => handleNodeClick(node)}
                        style={{ cursor: "pointer" }}
                      >
                        {/* Main node shape with animation for hover */}
                        {node.type === "transaction" ? (
                          <rect
                            x={-size / 2}
                            y={-size / 2}
                            width={size}
                            height={size}
                            rx={6}
                            ry={6}
                            fill={nodeColor}
                            fillOpacity={nodeOpacity}
                            stroke={borderColor}
                            strokeWidth={isHighlighted ? 2 : 0}
                            strokeOpacity={isHighlighted ? 1 : 0.5}
                            filter={isHighlighted ? "drop-shadow(0 0 4px rgba(255,255,255,0.4))" : ""}
                          />
                        ) : (
                          <circle
                            r={size / 2}
                            fill={nodeColor}
                            fillOpacity={nodeOpacity}
                            stroke={borderColor}
                            strokeWidth={isHighlighted ? 2 : 0}
                            strokeOpacity={isHighlighted ? 1 : 0.5}
                            filter={isHighlighted ? "drop-shadow(0 0 4px rgba(255,255,255,0.4))" : ""}
                          />
                        )}
                        
                        {/* Label within node */}
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={textSize}
                          fontWeight={isHighlighted ? "bold" : "normal"}
                          pointerEvents="none"
                        >
                          {node.name.length > 10 ? `${node.name.substring(0, 10)}...` : node.name}
                        </text>
                        
                        {/* Amount label */}
                        {node.amount > 0 && (
                          <text
                            textAnchor="middle"
                            y={15}
                            fill="white"
                            fontSize="10"
                            pointerEvents="none"
                          >
                            {node.amount.toFixed(4)} BTC
                          </text>
                        )}
                        
                        {/* Tags indicator (if transaction has tags) */}
                        {node.type === "transaction" && node.data?.tags && node.data.tags.length > 0 && (
                          <g transform={`translate(${size/2 - 14}, ${-size/2 + 10})`}>
                            <rect 
                              width={12} 
                              height={12} 
                              rx={4} 
                              fill="white" 
                              fillOpacity={0.6}
                            />
                            <text 
                              x={6} 
                              y={9}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="bold"
                              fill={nodeColor}
                            >
                              {node.data.tags.length}
                            </text>
                          </g>
                        )}
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="p-2">
                        <div className="font-bold capitalize">{node.type}</div>
                        <div className="text-sm">{node.id}</div>
                        {node.amount > 0 && (
                          <div className="text-sm mt-1">{safeFormatBTC(node.amount)}</div>
                        )}
                        {node.type === "transaction" && node.data?.utxos && (
                          <div className="text-xs mt-1">
                            Contains {node.data.utxos.length} UTXOs
                          </div>
                        )}
                        <div className="text-xs mt-1">Click for details</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </g>
        </svg>
        
        {/* Instructions overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-card/50 p-2 rounded text-xs text-center backdrop-blur-sm">
          Click and drag to move. Use mouse wheel or zoom controls to zoom in/out. Click on nodes for details.
        </div>
      </div>
      
      {/* Node info dialog */}
      <Dialog open={showNodeInfo} onOpenChange={setShowNodeInfo}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedNode?.type === "transaction" ? "Transaction" : "Address"} Details
            </DialogTitle>
            <DialogDescription>
              {selectedNode?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedNode && (
            <div className="space-y-4 py-2">
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Type:</span>
                  <span className="text-sm font-mono capitalize">{selectedNode.type}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">Name:</span>
                  <span className="text-sm font-mono">{selectedNode.name}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">BTC Amount:</span>
                  <span className="text-sm font-mono">{safeFormatBTC(selectedNode.amount)}</span>
                </div>
                
                {/* Additional data based on node type */}
                {selectedNode.type === "transaction" && selectedNode.data?.txid && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm font-medium">Transaction ID:</span>
                    <span className="text-sm font-mono truncate max-w-[250px]">{selectedNode.data.txid}</span>
                  </div>
                )}
                
                {selectedNode.type === "address" && selectedNode.data?.address && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm font-medium">Full Address:</span>
                    <span className="text-sm font-mono truncate max-w-[250px]">{selectedNode.data.address}</span>
                  </div>
                )}
              </div>
              
              {/* UTXOs in transaction */}
              {selectedNode.type === "transaction" && selectedNode.data?.utxos && selectedNode.data.utxos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">UTXOs in Transaction</h3>
                  <div className="bg-muted p-3 rounded-lg max-h-[200px] overflow-y-auto">
                    {selectedNode.data.utxos.map((utxo: UTXO, i: number) => (
                      <div key={i} className="flex justify-between items-center py-1 border-b last:border-b-0">
                        <div className="text-sm font-mono truncate max-w-[150px]">
                          {`${utxo.txid.substring(0, 8)}...${utxo.vout}`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRiskBadgeStyle(utxo.privacyRisk)}>
                            {utxo.privacyRisk}
                          </Badge>
                          <span className="text-sm font-mono">{safeFormatBTC(utxo.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tags for transaction nodes */}
              {selectedNode.type === "transaction" && selectedNode.data?.tags && selectedNode.data.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.data.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Connections */}
              <div>
                <h3 className="text-sm font-medium mb-2">Connections</h3>
                <div className="bg-muted p-3 rounded-lg">
                  {getNodeConnections(selectedNode.id).length > 0 ? (
                    getNodeConnections(selectedNode.id).map((link, i) => {
                      // Fix: Handle both string and GraphNode types safely
                      const isSource = typeof link.source === 'string' 
                        ? link.source === selectedNode.id
                        : link.source.id === selectedNode.id;
                      
                      const connectedNodeId = isSource 
                        ? (typeof link.target === 'string' ? link.target : link.target.id)
                        : (typeof link.source === 'string' ? link.source : link.source.id);
                      
                      const connectedNode = graph.nodes.find(n => n.id === connectedNodeId);
                      
                      return (
                        <div key={i} className="flex justify-between items-center py-1 border-b last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${isSource ? 'text-green-500' : 'text-blue-500'}`}>
                              {isSource ? 'Output →' : '← Input'}
                            </span>
                            <span className="text-sm">
                              {connectedNode?.name} ({connectedNode?.type})
                            </span>
                          </div>
                          <Badge className={getRiskBadgeStyle(link.riskLevel || 'low')}>
                            {link.value.toFixed(6)}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground text-sm">No connections found</p>
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
