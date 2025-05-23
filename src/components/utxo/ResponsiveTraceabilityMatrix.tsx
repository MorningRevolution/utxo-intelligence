
import React, { useState, useEffect, useRef } from "react";
import { UTXO } from "@/types/utxo";
import { MatrixNode, MatrixConnection } from "@/types/utxo-graph";
import { formatBTC, formatTxid, getRiskColor } from "@/utils/utxo-utils";
import { toast } from "sonner";
import { ZoomIn, ZoomOut, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ResponsiveTraceabilityMatrixProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  selectedUtxo?: UTXO | null;
  showConnections?: boolean;
  zoomLevel?: number;
}

export const ResponsiveTraceabilityMatrix: React.FC<ResponsiveTraceabilityMatrixProps> = ({
  utxos,
  onSelectUtxo,
  selectedUtxo,
  showConnections: initialShowConnections = true,
  zoomLevel: initialZoomLevel = 1
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<MatrixNode[]>([]);
  const [connections, setConnections] = useState<MatrixConnection[]>([]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [localShowConnections, setLocalShowConnections] = useState(initialShowConnections);
  const [localZoomLevel, setLocalZoomLevel] = useState(initialZoomLevel);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // Process UTXOs into a Sankey-style matrix layout
  useEffect(() => {
    if (!utxos.length) return;
    
    // Group UTXOs by transaction to create a matrix
    const txGroups = new Map<string, UTXO[]>();
    const addressNodes = new Map<string, { inputs: UTXO[], outputs: UTXO[] }>();
    
    // First pass: group UTXOs by transaction
    utxos.forEach(utxo => {
      // Group by transaction ID
      if (!txGroups.has(utxo.txid)) {
        txGroups.set(utxo.txid, []);
      }
      txGroups.get(utxo.txid)!.push(utxo);
      
      // Track addresses
      if (utxo.address) {
        if (!addressNodes.has(utxo.address)) {
          addressNodes.set(utxo.address, { inputs: [], outputs: [] });
        }
        addressNodes.get(utxo.address)!.outputs.push(utxo);
      }
      
      if (utxo.senderAddress) {
        if (!addressNodes.has(utxo.senderAddress)) {
          addressNodes.set(utxo.senderAddress, { inputs: [], outputs: [] });
        }
        addressNodes.get(utxo.senderAddress)!.inputs.push(utxo);
      }
    });
    
    // Create matrix nodes
    const matrixNodes: MatrixNode[] = [];
    const matrixConnections: MatrixConnection[] = [];
    
    // Layout settings
    const nodeWidth = 180;
    const nodeHeight = 60;
    const paddingY = 20;
    const columnSpacing = 240;
    
    // Input column (sender addresses)
    const inputAddresses = Array.from(addressNodes.entries())
      .filter(([_, data]) => data.inputs.length > 0)
      .sort((a, b) => {
        // Sort by total BTC amount (descending)
        const totalA = a[1].inputs.reduce((sum, u) => sum + u.amount, 0);
        const totalB = b[1].inputs.reduce((sum, u) => sum + u.amount, 0);
        return totalB - totalA;
      });
    
    let yPos = 20;
    
    // Create input nodes (sender addresses)
    inputAddresses.forEach(([address, data], idx) => {
      const totalAmount = data.inputs.reduce((sum, u) => sum + u.amount, 0);
      const height = Math.max(nodeHeight, Math.min(100, 40 + Math.log10(1 + totalAmount) * 20));
      
      matrixNodes.push({
        id: `input-${address}`,
        type: 'input',
        data: { txid: address, utxos: data.inputs },
        x: 20,
        y: yPos,
        width: nodeWidth,
        height
      });
      
      yPos += height + paddingY;
    });
    
    // Middle column (transactions)
    const transactions = Array.from(txGroups.entries())
      .sort((a, b) => {
        // Sort by total amount (descending)
        const totalA = a[1].reduce((sum, u) => sum + u.amount, 0);
        const totalB = b[1].reduce((sum, u) => sum + u.amount, 0);
        return totalB - totalA;
      });
    
    yPos = 20;
    
    // Create transaction nodes
    transactions.forEach(([txid, txUtxos]) => {
      const totalAmount = txUtxos.reduce((sum, u) => sum + u.amount, 0);
      // Improved size calculation for better proportional sizing (2.3 Matrix View Enhancement)
      const height = Math.max(nodeHeight, Math.min(120, 40 + Math.pow(Math.log10(1 + totalAmount) * 15, 1.2)));
      
      matrixNodes.push({
        id: `tx-${txid}`,
        type: 'transaction',
        data: { txid, utxos: txUtxos },
        x: 20 + nodeWidth + columnSpacing,
        y: yPos,
        width: nodeWidth,
        height
      });
      
      yPos += height + paddingY;
    });
    
    // Output column (receiver addresses)
    const outputAddresses = Array.from(addressNodes.entries())
      .filter(([_, data]) => data.outputs.length > 0)
      .sort((a, b) => {
        // Sort by total amount (descending)
        const totalA = a[1].outputs.reduce((sum, u) => sum + u.amount, 0);
        const totalB = b[1].outputs.reduce((sum, u) => sum + u.amount, 0);
        return totalB - totalA;
      });
    
    yPos = 20;
    
    // Create output nodes (receiver addresses)
    outputAddresses.forEach(([address, data]) => {
      const totalAmount = data.outputs.reduce((sum, u) => sum + u.amount, 0);
      const height = Math.max(nodeHeight, Math.min(100, 40 + Math.log10(1 + totalAmount) * 20));
      
      matrixNodes.push({
        id: `output-${address}`,
        type: 'output',
        data: { txid: address, utxos: data.outputs },
        x: 20 + (nodeWidth + columnSpacing) * 2,
        y: yPos,
        width: nodeWidth,
        height
      });
      
      yPos += height + paddingY;
    });
    
    // Create connections between nodes
    // Input to transaction connections
    inputAddresses.forEach(([address, data]) => {
      const inputNode = matrixNodes.find(n => n.id === `input-${address}`);
      if (!inputNode) return;
      
      // Connect input address to transactions
      const connectedTxIds = new Set(data.inputs.map(u => u.txid));
      
      connectedTxIds.forEach(txid => {
        const txNode = matrixNodes.find(n => n.id === `tx-${txid}`);
        if (!txNode) return;
        
        const txUtxos = data.inputs.filter(u => u.txid === txid);
        const totalAmount = txUtxos.reduce((sum, u) => sum + u.amount, 0);
        
        // Create bezier curve path
        const sourceX = inputNode.x + inputNode.width;
        const sourceY = inputNode.y + inputNode.height / 2;
        const targetX = txNode.x;
        const targetY = txNode.y + txNode.height / 2;
        
        const path = generateCurvePath(sourceX, sourceY, targetX, targetY);
        
        // Find highest risk level among UTXOs
        let highestRisk: 'low' | 'medium' | 'high' = 'low';
        if (txUtxos.some(u => u.privacyRisk === 'high')) {
          highestRisk = 'high';
        } else if (txUtxos.some(u => u.privacyRisk === 'medium')) {
          highestRisk = 'medium';
        }
        
        matrixConnections.push({
          source: inputNode.id,
          target: txNode.id,
          value: totalAmount,
          path,
          riskLevel: highestRisk
        });
      });
    });
    
    // Transaction to output connections
    transactions.forEach(([txid, txUtxos]) => {
      const txNode = matrixNodes.find(n => n.id === `tx-${txid}`);
      if (!txNode) return;
      
      // Group by output address
      const outputsByAddress = new Map<string, UTXO[]>();
      
      txUtxos.forEach(utxo => {
        if (utxo.address) {
          if (!outputsByAddress.has(utxo.address)) {
            outputsByAddress.set(utxo.address, []);
          }
          outputsByAddress.get(utxo.address)!.push(utxo);
        }
      });
      
      outputsByAddress.forEach((addressUtxos, address) => {
        const outputNode = matrixNodes.find(n => n.id === `output-${address}`);
        if (!outputNode) return;
        
        const totalAmount = addressUtxos.reduce((sum, u) => sum + u.amount, 0);
        
        // Create bezier curve path
        const sourceX = txNode.x + txNode.width;
        const sourceY = txNode.y + txNode.height / 2;
        const targetX = outputNode.x;
        const targetY = outputNode.y + outputNode.height / 2;
        
        const path = generateCurvePath(sourceX, sourceY, targetX, targetY);
        
        // Find highest risk level among UTXOs
        let highestRisk: 'low' | 'medium' | 'high' = 'low';
        if (addressUtxos.some(u => u.privacyRisk === 'high')) {
          highestRisk = 'high';
        } else if (addressUtxos.some(u => u.privacyRisk === 'medium')) {
          highestRisk = 'medium';
        }
        
        matrixConnections.push({
          source: txNode.id,
          target: outputNode.id,
          value: totalAmount,
          path,
          riskLevel: highestRisk
        });
      });
    });
    
    setNodes(matrixNodes);
    setConnections(matrixConnections);
    
    // Reset view when data changes
    if (matrixNodes.length > 0) {
      setPosition({ x: 0, y: 0 });
      setLocalZoomLevel(1);
    }
  }, [utxos]);
  
  // Generate a smooth curved path between two points
  const generateCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const midX = x1 + dx * 0.5;
    
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  };
  
  // Handle mouse events for pan and zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only track left clicks
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
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Adjust zoom with mouse wheel
    const delta = -Math.sign(e.deltaY) * 0.1;
    const newZoom = Math.min(3, Math.max(0.5, localZoomLevel + delta));
    setLocalZoomLevel(newZoom);
  };
  
  // Zoom buttons handlers
  const handleZoomIn = () => {
    setLocalZoomLevel(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setLocalZoomLevel(prev => Math.max(0.5, prev - 0.2));
  };

  const handleResetView = () => {
    setLocalZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const toggleConnections = () => {
    setLocalShowConnections(prev => !prev);
    toast.info(localShowConnections ? "Connections hidden" : "Connections visible");
  };
  
  // Handle node selection
  const handleNodeClick = (node: MatrixNode) => {
    if (!onSelectUtxo) return;
    
    // For input/output nodes, we don't have a specific UTXO to select
    if (node.type === 'transaction') {
      const txData = node.data as { txid: string; utxos: UTXO[] };
      if (txData.utxos.length > 0) {
        // Select the first UTXO from this transaction
        if (selectedUtxo && 
            selectedUtxo.txid === txData.txid && 
            txData.utxos.some(u => u.txid === selectedUtxo.txid && u.vout === selectedUtxo.vout)) {
          // Toggle off if already selected
          onSelectUtxo(null);
        } else {
          onSelectUtxo(txData.utxos[0]);
        }
      }
    }
  };
  
  // Handle node hover to highlight connections
  const handleNodeMouseEnter = (nodeId: string) => {
    setHoveredNode(nodeId);
    
    // Find all connected nodes
    const connected = new Set<string>([nodeId]);
    connections.forEach(conn => {
      if (conn.source === nodeId) {
        connected.add(conn.target);
      } else if (conn.target === nodeId) {
        connected.add(conn.source);
      }
    });
    
    setHighlightedNodes(connected);
  };
  
  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
    setHighlightedNodes(new Set());
  };
  
  // Check if a node is highlighted
  const isHighlighted = (nodeId: string) => {
    return hoveredNode === nodeId || highlightedNodes.has(nodeId);
  };
  
  // Check if a connection is highlighted
  const isConnectionHighlighted = (conn: MatrixConnection) => {
    return hoveredNode !== null && 
           (conn.source === hoveredNode || conn.target === hoveredNode);
  };
  
  // Get node color based on type and risk
  const getNodeColor = (node: MatrixNode) => {
    switch (node.type) {
      case 'input':
        return 'rgba(6, 182, 212, 0.8)'; // cyan
      case 'output':
        return 'rgba(59, 130, 246, 0.8)'; // blue
      case 'transaction': {
        // Use risk level for transaction nodes
        const txData = node.data as { txid: string; utxos: UTXO[] };
        const hasHighRisk = txData.utxos.some(u => u.privacyRisk === 'high');
        const hasMediumRisk = txData.utxos.some(u => u.privacyRisk === 'medium');
        
        if (hasHighRisk) return getRiskColor('high');
        if (hasMediumRisk) return getRiskColor('medium');
        return getRiskColor('low');
      }
      default:
        return 'rgba(107, 114, 128, 0.8)'; // gray
    }
  };
  
  // Get connection color based on risk
  const getConnectionColor = (conn: MatrixConnection, highlighted: boolean) => {
    if (highlighted) {
      return conn.riskLevel === 'high' ? '#ef4444' : 
             conn.riskLevel === 'medium' ? '#f97316' : 
             '#10b981';
    }
    
    // Muted colors when not highlighted
    return conn.riskLevel === 'high' ? 'rgba(239, 68, 68, 0.4)' : 
           conn.riskLevel === 'medium' ? 'rgba(249, 115, 22, 0.4)' : 
           'rgba(16, 185, 129, 0.4)';
  };
  
  // Get node label based on type
  const getNodeLabel = (node: MatrixNode) => {
    switch (node.type) {
      case 'input':
      case 'output': {
        const addressData = node.data as { txid: string; utxos: UTXO[] };
        const address = addressData.txid;
        const totalAmount = addressData.utxos.reduce((sum, u) => sum + u.amount, 0);
        return {
          title: `${formatTxid(address, 8)}`,
          subtitle: `${addressData.utxos.length} UTXOs`,
          amount: formatBTC(totalAmount)
        };
      }
      case 'transaction': {
        const txData = node.data as { txid: string; utxos: UTXO[] };
        const totalAmount = txData.utxos.reduce((sum, u) => sum + u.amount, 0);
        return {
          title: `TX: ${formatTxid(txData.txid, 8)}`,
          subtitle: `${txData.utxos.length} UTXOs`,
          amount: formatBTC(totalAmount)
        };
      }
      default:
        return { title: 'Unknown', subtitle: '', amount: '' };
    }
  };
  
  return (
    <div className="relative h-full w-full overflow-hidden border border-muted-foreground/20 rounded-md bg-background">
      {/* Visualization controls */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleConnections}
          className={localShowConnections ? "bg-primary/10" : ""}
        >
          {localShowConnections ? (
            <><Eye className="h-4 w-4 mr-1" /> Hide Connections</>
          ) : (
            <><EyeOff className="h-4 w-4 mr-1" /> Show Connections</>
          )}
        </Button>
        
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-xs px-2 bg-background/80 rounded">
          {Math.round(localZoomLevel * 100)}%
        </span>
        
        <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleResetView} className="ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Reset View
        </Button>
      </div>
      
      {/* Column labels */}
      <div className="absolute top-2 left-0 w-full flex justify-around z-10">
        <div className="bg-background/90 px-4 py-1 rounded-full text-sm font-medium shadow-sm">
          Sending Addresses
        </div>
        <div className="bg-background/90 px-4 py-1 rounded-full text-sm font-medium shadow-sm">
          Transactions
        </div>
        <div className="bg-background/90 px-4 py-1 rounded-full text-sm font-medium shadow-sm">
          Receiving Addresses
        </div>
      </div>
      
      {/* SVG Canvas for visualization */}
      <div 
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 1000 800" 
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${localZoomLevel})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease'
          }}
        >
          {/* Define arrowhead marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(107, 114, 128, 0.8)" />
            </marker>
            <marker
              id="arrowhead-highlighted"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
            </marker>
          </defs>
        
          {/* Matrix nodes - we render these first so connections appear on top for better highlighting */}
          {nodes.map((node) => {
            const isHighlight = isHighlighted(node.id);
            const isSelected = selectedUtxo && node.type === 'transaction' && 
                              (node.data as { txid: string }).txid === selectedUtxo.txid;
            
            const nodeLabel = getNodeLabel(node);
            const nodeFill = getNodeColor(node);
            const nodeOpacity = (isHighlight || !hoveredNode) ? 1 : 0.6;
            
            return (
              <g 
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => handleNodeMouseEnter(node.id)}
                onMouseLeave={handleNodeMouseLeave}
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: nodeOpacity }}
              >
                {/* Node outline - thicker when selected or highlighted */}
                <rect
                  width={node.width}
                  height={node.height}
                  rx={6}
                  fill={nodeFill}
                  stroke={isSelected ? "white" : isHighlight ? "white" : "rgba(255,255,255,0.3)"}
                  strokeWidth={isSelected ? 3 : isHighlight ? 2 : 1}
                  className="transition-all duration-200"
                />
                
                {/* Node labels with contrasting background to ensure visibility */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <g>
                        {/* Background for better text contrast */}
                        <rect
                          x={5}
                          y={5}
                          width={node.width - 10}
                          height={node.height - 10}
                          rx={4}
                          fill="rgba(0,0,0,0.2)"
                          className="transition-all duration-200"
                        />
                        
                        {/* Title */}
                        <text
                          x={10}
                          y={20}
                          className="fill-white text-sm font-medium"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                        >
                          {nodeLabel.title}
                        </text>
                        
                        {/* Subtitle */}
                        <text
                          x={10}
                          y={38}
                          className="fill-white/90 text-xs"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                        >
                          {nodeLabel.subtitle}
                        </text>
                        
                        {/* Amount */}
                        <text
                          x={node.width - 10}
                          y={node.height - 10}
                          textAnchor="end"
                          className="fill-white text-sm font-bold"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                        >
                          {nodeLabel.amount}
                        </text>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent className="p-2 max-w-xs">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">{nodeLabel.title}</div>
                        <div className="text-xs opacity-80">{nodeLabel.subtitle}</div>
                        <div className="font-mono mt-1">{nodeLabel.amount}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </g>
            );
          })}
          
          {/* Connection lines - Rendered on top for better visibility and highlighting */}
          {localShowConnections && connections.map((conn, index) => {
            const isHighlight = isConnectionHighlighted(conn);
            return (
              <TooltipProvider key={`conn-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <path
                      d={conn.path}
                      stroke={getConnectionColor(conn, isHighlight)}
                      strokeWidth={isHighlight ? 3 : 1.5}
                      fill="none"
                      markerEnd={isHighlight ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
                      className={`transition-all duration-200 ${isHighlight ? 'z-20' : 'z-10'}`}
                      style={{ pointerEvents: "stroke" }}
                      onMouseEnter={() => {
                        // Find connected nodes and highlight them
                        const sourceNode = nodes.find(n => n.id === conn.source);
                        const targetNode = nodes.find(n => n.id === conn.target);
                        if (sourceNode) handleNodeMouseEnter(sourceNode.id);
                      }}
                      onMouseLeave={handleNodeMouseLeave}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="p-2">
                    <div className="font-mono text-xs">{formatBTC(conn.value)} BTC</div>
                    <div className="text-xs mt-1">
                      Risk: <span className={conn.riskLevel === 'high' ? 'text-red-500' : 
                                            conn.riskLevel === 'medium' ? 'text-amber-500' : 
                                            'text-emerald-500'}>
                              {conn.riskLevel.toUpperCase()}
                            </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </svg>
      </div>
      
      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <p className="text-muted-foreground text-lg">No UTXO data available for matrix visualization.</p>
        </div>
      )}
    </div>
  );
};
