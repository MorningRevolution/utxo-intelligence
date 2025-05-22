import React, { useEffect, useRef, useState } from 'react';
import { UTXO } from "@/types/utxo";
import { formatBTC, formatTxid, getRiskColor } from "@/utils/utxo-utils";
import { Button } from "@/components/ui/button";
import { 
  ZoomIn, 
  ZoomOut, 
  Move, 
  RotateCcw, 
  Network, 
  CircleAlert 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Grouped UTXO by transaction
interface TransactionNode {
  txid: string;
  utxos: UTXO[];
  totalAmount: number;
  highestRisk: 'low' | 'medium' | 'high';
  date: Date;
  x?: number;
  y?: number;
}

// Edge between transactions
interface TransactionEdge {
  source: string; // txid
  target: string; // txid
  amount: number;
  risk: 'low' | 'medium' | 'high';
  path?: string;
}

interface SimpleTraceabilityGraphProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  layout?: 'vertical' | 'radial' | 'horizontal';
  showConnections?: boolean;
  animate?: boolean;
  zoomLevel?: number;
}

export const SimpleTraceabilityGraph: React.FC<SimpleTraceabilityGraphProps> = ({
  utxos,
  onSelectUtxo,
  layout = 'vertical',
  showConnections = true,
  animate = false,
  zoomLevel = 1
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(zoomLevel);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState<TransactionNode[]>([]);
  const [edges, setEdges] = useState<TransactionEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showConnectionsState, setShowConnectionsState] = useState(showConnections);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Update zoom level when prop changes
  useEffect(() => {
    if (zoomLevel) {
      setZoom(zoomLevel);
    }
  }, [zoomLevel]);

  // Update showConnections when prop changes
  useEffect(() => {
    setShowConnectionsState(showConnections);
  }, [showConnections]);

  const svgWidth = 1000;
  const svgHeight = 800;
  const nodeWidth = 140;
  const nodeHeight = 60;
  const nodeRadius = 8;
  const levelGap = 180;
  const radialRadius = 300;

  // Process UTXOs into grouped transaction nodes and edges
  useEffect(() => {
    if (!utxos || utxos.length === 0) return;

    // Group UTXOs by transaction
    const txGroups = new Map<string, UTXO[]>();
    
    utxos.forEach(utxo => {
      const key = utxo.txid;
      if (!txGroups.has(key)) {
        txGroups.set(key, []);
      }
      txGroups.get(key)?.push(utxo);
    });

    // Create nodes from grouped transactions
    const newNodes: TransactionNode[] = Array.from(txGroups.entries()).map(([txid, groupUtxos]) => {
      const totalAmount = groupUtxos.reduce((sum, u) => sum + u.amount, 0);
      
      // Find highest risk level in group
      let highestRisk: 'low' | 'medium' | 'high' = 'low';
      if (groupUtxos.some(u => u.privacyRisk === 'high')) {
        highestRisk = 'high';
      } else if (groupUtxos.some(u => u.privacyRisk === 'medium')) {
        highestRisk = 'medium';
      }
      
      // Use earliest date in the group
      const dates = groupUtxos.map(u => new Date(u.createdAt));
      const date = new Date(Math.min(...dates.map(d => d.getTime())));
      
      return {
        txid,
        utxos: groupUtxos,
        totalAmount,
        highestRisk,
        date
      };
    });
    
    // Sort nodes by date
    newNodes.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Create edges between transactions if we can find links
    const newEdges: TransactionEdge[] = [];
    newNodes.forEach(source => {
      newNodes.forEach(target => {
        if (source.txid !== target.txid) {
          // Check if any UTXOs in the source reference the target
          source.utxos.forEach(utxo => {
            if (utxo.senderAddress && target.utxos.some(tu => tu.receiverAddress === utxo.senderAddress)) {
              newEdges.push({
                source: source.txid,
                target: target.txid,
                amount: utxo.amount,
                risk: utxo.privacyRisk
              });
            }
          });
        }
      });
    });

    // Assign positions to nodes based on layout
    if (layout === 'vertical') {
      calculateVerticalLayout(newNodes, newEdges);
    } else if (layout === 'radial') {
      calculateRadialLayout(newNodes, newEdges);
    } else {
      calculateHorizontalLayout(newNodes, newEdges);
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [utxos, layout]);

  // Calculate vertical tree layout
  const calculateVerticalLayout = (nodes: TransactionNode[], edges: TransactionEdge[]) => {
    // Group nodes by date into levels (months)
    const months = new Map<string, TransactionNode[]>();
    
    nodes.forEach(node => {
      const monthKey = `${node.date.getFullYear()}-${node.date.getMonth() + 1}`;
      if (!months.has(monthKey)) {
        months.set(monthKey, []);
      }
      months.get(monthKey)?.push(node);
    });
    
    // Sort months chronologically
    const sortedMonths = Array.from(months.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
    
    // Assign x, y coordinates to nodes
    let level = 0;
    sortedMonths.forEach(([_, monthNodes]) => {
      const nodesInLevel = monthNodes.length;
      
      monthNodes.forEach((node, i) => {
        // Calculate position within level
        const segmentWidth = svgWidth / (nodesInLevel + 1);
        node.x = (i + 1) * segmentWidth;
        node.y = 100 + level * levelGap;
      });
      
      level++;
    });
    
    // Calculate curved paths for edges
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.txid === edge.source);
      const targetNode = nodes.find(n => n.txid === edge.target);
      
      if (sourceNode && targetNode && sourceNode.x !== undefined && sourceNode.y !== undefined && 
          targetNode.x !== undefined && targetNode.y !== undefined) {
        
        // Simple curved path
        const midY = (sourceNode.y + targetNode.y) / 2;
        edge.path = `M ${sourceNode.x} ${sourceNode.y + nodeHeight/2} 
                     C ${sourceNode.x} ${midY}, 
                       ${targetNode.x} ${midY}, 
                       ${targetNode.x} ${targetNode.y - nodeHeight/2}`;
      }
    });
  };

  // Calculate radial layout
  const calculateRadialLayout = (nodes: TransactionNode[], edges: TransactionEdge[]) => {
    const center = { x: svgWidth / 2, y: svgHeight / 2 };
    const totalNodes = nodes.length;
    
    // Position nodes in a circle
    nodes.forEach((node, i) => {
      const angle = (i / totalNodes) * 2 * Math.PI;
      node.x = center.x + radialRadius * Math.cos(angle);
      node.y = center.y + radialRadius * Math.sin(angle);
    });
    
    // Calculate curved paths for edges
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.txid === edge.source);
      const targetNode = nodes.find(n => n.txid === edge.target);
      
      if (sourceNode && targetNode && sourceNode.x !== undefined && sourceNode.y !== undefined && 
          targetNode.x !== undefined && targetNode.y !== undefined) {
        
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate control point for curve
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        
        // Offset control point toward center
        const offsetX = (center.x - midX) * 0.3;
        const offsetY = (center.y - midY) * 0.3;
        
        edge.path = `M ${sourceNode.x} ${sourceNode.y} 
                     Q ${midX + offsetX} ${midY + offsetY}, 
                       ${targetNode.x} ${targetNode.y}`;
      }
    });
  };

  // Calculate horizontal layout
  const calculateHorizontalLayout = (nodes: TransactionNode[], edges: TransactionEdge[]) => {
    // Group nodes by date into levels (months)
    const months = new Map<string, TransactionNode[]>();
    
    nodes.forEach(node => {
      const monthKey = `${node.date.getFullYear()}-${node.date.getMonth() + 1}`;
      if (!months.has(monthKey)) {
        months.set(monthKey, []);
      }
      months.get(monthKey)?.push(node);
    });
    
    // Sort months chronologically
    const sortedMonths = Array.from(months.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
    
    // Assign x, y coordinates to nodes
    let level = 0;
    sortedMonths.forEach(([_, monthNodes]) => {
      const nodesInLevel = monthNodes.length;
      
      monthNodes.forEach((node, i) => {
        // Calculate position within level
        const segmentWidth = svgWidth / (nodesInLevel + 1);
        node.x = (i + 1) * segmentWidth;
        node.y = 100 + level * levelGap;
      });
      
      level++;
    });
    
    // Calculate curved paths for edges
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.txid === edge.source);
      const targetNode = nodes.find(n => n.txid === edge.target);
      
      if (sourceNode && targetNode && sourceNode.x !== undefined && sourceNode.y !== undefined && 
          targetNode.x !== undefined && targetNode.y !== undefined) {
        
        // Simple curved path
        const midY = (sourceNode.y + targetNode.y) / 2;
        edge.path = `M ${sourceNode.x} ${sourceNode.y + nodeHeight/2} 
                     C ${sourceNode.x} ${midY}, 
                       ${targetNode.x} ${midY}, 
                       ${targetNode.x} ${targetNode.y - nodeHeight/2}`;
      }
    });
  };

  // Handle zoom in/out
  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(0.5, Math.min(2.5, newZoom));
    });
  };

  // Handle reset view
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 50, y: 50 });
  };

  // Handle mouse down for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse move for panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      setPan(prev => ({
        x: prev.x + dx / zoom,
        y: prev.y + dy / zoom
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse up to stop panning
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle node click
  const handleNodeClick = (node: TransactionNode) => {
    setSelectedNode(selectedNode === node.txid ? null : node.txid);
    
    // If there's a specific UTXO to select, use the first one in the group
    if (onSelectUtxo) {
      if (selectedNode === node.txid) {
        onSelectUtxo(null);
      } else if (node.utxos.length > 0) {
        onSelectUtxo(node.utxos[0]);
      }
    }
  };

  // Toggle showing connections
  const toggleConnections = () => {
    setShowConnectionsState(prev => !prev);
  };

  // Calculate node size based on amount
  const getNodeSize = (amount: number) => {
    // Base size with minimum
    const minWidth = nodeWidth;
    const maxWidth = nodeWidth * 2;
    
    // Find max amount for scaling
    const maxAmount = Math.max(...nodes.map(n => n.totalAmount));
    
    if (maxAmount === 0) return { width: minWidth, height: nodeHeight };
    
    // Calculate width proportional to amount
    const width = minWidth + ((amount / maxAmount) * (maxWidth - minWidth));
    
    return { 
      width, 
      height: nodeHeight 
    };
  };

  // Calculate transform for the entire SVG content
  const svgTransform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="bg-muted/20 p-2 rounded-lg mb-2 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
                  <ZoomIn size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
                  <ZoomOut size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleConnections()}
            className={showConnectionsState ? "bg-primary/20" : ""}
          >
            <Network size={16} className="mr-1" />
            {showConnectionsState ? "Hide" : "Show"} Connections
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">Low Risk</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-xs">Medium Risk</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs">High Risk</span>
          </div>
          <Badge variant="outline" className="bg-background/80 text-xs">
            <Move size={14} className="mr-1" />
            Drag to move
          </Badge>
        </div>
      </div>
      
      <div className="bg-card/70 rounded-lg p-2 flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <g transform={svgTransform}>
            {/* Draw edges if connections are enabled */}
            {showConnectionsState && edges.map((edge, i) => {
              const sourceActive = selectedNode === edge.source || hoveredNode === edge.source;
              const targetActive = selectedNode === edge.target || hoveredNode === edge.target;
              const isActive = sourceActive || targetActive;
              
              return (
                <g key={`edge-${i}`} opacity={isActive || !selectedNode ? 1 : 0.2}>
                  {edge.path && (
                    <path
                      d={edge.path}
                      stroke={getRiskColor(edge.risk)}
                      strokeWidth={isActive ? 3 : 2}
                      fill="none"
                      strokeOpacity={isActive ? 0.9 : 0.7}
                      markerEnd="url(#arrowhead)"
                      strokeDasharray={edge.risk === 'high' ? "5,5" : "none"}
                    />
                  )}
                </g>
              );
            })}
            
            {/* Draw nodes */}
            {nodes.map((node, i) => {
              const { width, height } = getNodeSize(node.totalAmount);
              const isSelected = selectedNode === node.txid;
              const isHovered = hoveredNode === node.txid;
              const isActive = isSelected || isHovered;
              const x = (node.x || 0) - width / 2;
              const y = (node.y || 0) - height / 2;
              
              return (
                <g 
                  key={`node-${i}`} 
                  transform={`translate(${x}, ${y})`}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNode(node.txid)}
                  onMouseLeave={() => setHoveredNode(null)}
                  opacity={selectedNode && !isActive ? 0.4 : 1}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                >
                  {/* Node background */}
                  <rect
                    width={width}
                    height={height}
                    rx={nodeRadius}
                    ry={nodeRadius}
                    fill={isActive ? 'var(--background)' : 'var(--card)'}
                    stroke={getRiskColor(node.highestRisk)}
                    strokeWidth={isActive ? 3 : 2}
                  />
                  
                  {/* Risk indicator */}
                  <rect
                    y={0}
                    width={width}
                    height={6}
                    rx={3}
                    fill={getRiskColor(node.highestRisk)}
                  />
                  
                  {/* Transaction ID */}
                  <text
                    x={width / 2}
                    y={22}
                    textAnchor="middle"
                    fontSize={12}
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="var(--foreground)"
                  >
                    {formatTxid(node.txid, 5)}
                  </text>
                  
                  {/* Amount */}
                  <text
                    x={width / 2}
                    y={40}
                    textAnchor="middle"
                    fontSize={13}
                    fill="var(--primary)"
                    fontWeight="600"
                  >
                    {formatBTC(node.totalAmount, { trimZeros: true })}
                  </text>
                  
                  {/* Alert icon for high risk */}
                  {node.highestRisk === 'high' && (
                    <CircleAlert
                      size={18}
                      className="text-red-500"
                      style={{ 
                        position: 'absolute', 
                        top: '3px', 
                        right: '3px'
                      }}
                    />
                  )}
                </g>
              );
            })}
            
            {/* Arrowhead marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="4"
                refX="6"
                refY="2"
                orient="auto"
              >
                <path d="M0,0 L0,4 L6,2 Z" fill="var(--muted-foreground)" />
              </marker>
            </defs>
          </g>
        </svg>
      </div>
      
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-4 bg-background/90 rounded-lg shadow-lg">
            <p className="text-foreground">No transaction data available to visualize.</p>
          </div>
        </div>
      )}
    </div>
  );
};
