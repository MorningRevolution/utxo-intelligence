import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { UTXO } from "@/types/utxo";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Maximize, Plus, Minus, Calendar, Info, ToggleLeft, ToggleRight } from "lucide-react";
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
import { getRiskBadgeStyle } from "@/utils/utxo-utils";
import { toast } from "sonner";

interface TimelineTraceabilityGraphProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
}

// Interface for transaction node
interface TransactionNode {
  id: string;
  date: Date;
  amount: number;
  utxos: UTXO[];
  x: number;
  y: number;
  width: number;
  height: number;
  riskLevel: "low" | "medium" | "high";
  tags: string[];
}

// Interface for connection between transactions
interface TransactionLink {
  source: string;
  target: string;
  amount: number;
  riskLevel: "low" | "medium" | "high";
  controlPointX?: number;
  controlPointY?: number;
  path?: string;
}

// Time divisions for timeline
interface TimelineDivision {
  date: Date;
  label: string;
  x: number;
  width: number;
}

export const TimelineTraceabilityGraph: React.FC<TimelineTraceabilityGraphProps> = ({ 
  utxos, 
  onSelectUtxo 
}) => {
  // State for graph visualization
  const [transactions, setTransactions] = useState<TransactionNode[]>([]);
  const [links, setLinks] = useState<TransactionLink[]>([]);
  const [timeDivisions, setTimeDivisions] = useState<TimelineDivision[]>([]);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionNode | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showAddresses, setShowAddresses] = useState(false);
  
  // Reference to the graph container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate dimensions
  const dimensions = useMemo(() => {
    if (!containerRef.current) return { width: 800, height: 600 };
    return {
      width: containerRef.current.clientWidth,
      height: Math.max(500, containerRef.current.clientHeight)
    };
  }, [containerRef.current?.clientWidth, containerRef.current?.clientHeight]);
  
  // Process UTXOs to create timeline data
  const processUTXOData = useCallback(() => {
    if (!utxos.length) return;
    
    // Group UTXOs by transaction ID
    const txGroups = new Map<string, UTXO[]>();
    
    // Track transaction dates
    const allDates: Date[] = [];
    
    // First pass: group UTXOs and collect dates
    utxos.forEach(utxo => {
      if (!txGroups.has(utxo.txid)) {
        txGroups.set(utxo.txid, []);
      }
      txGroups.get(utxo.txid)!.push(utxo);
      
      // Collect dates if available
      if (utxo.acquisitionDate) {
        try {
          const date = parseISO(utxo.acquisitionDate);
          allDates.push(date);
        } catch (e) {
          // Skip invalid dates
        }
      }
    });
    
    // Sort dates and find min/max
    allDates.sort((a, b) => a.getTime() - b.getTime());
    
    const minDate = allDates.length ? allDates[0] : new Date();
    const maxDate = allDates.length ? allDates[allDates.length - 1] : new Date();
    
    // Add padding of 1 day to start and end
    const startDate = addDays(minDate, -1);
    const endDate = addDays(maxDate, 1);
    
    // Calculate total date range in days
    const totalDays = differenceInDays(endDate, startDate) + 1;
    
    // Create time divisions (one per day)
    const divisions: TimelineDivision[] = [];
    const timelineWidth = dimensions.width * 1.5; // Make timeline wider than viewport
    const dayWidth = timelineWidth / totalDays;
    
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(startDate, i);
      divisions.push({
        date,
        label: format(date, 'MMM d'),
        x: i * dayWidth,
        width: dayWidth
      });
    }
    
    // Create transaction nodes
    const nodes: TransactionNode[] = [];
    
    txGroups.forEach((groupUtxos, txid) => {
      // Find first available date for this transaction
      let txDate: Date = startDate;
      const dateString = groupUtxos.find(u => u.acquisitionDate)?.acquisitionDate;
      
      if (dateString) {
        try {
          txDate = parseISO(dateString);
        } catch (e) {
          // Use start date if parsing fails
        }
      }
      
      // Calculate position based on date
      const dayIndex = differenceInDays(txDate, startDate);
      const x = dayIndex * dayWidth + (dayWidth / 2);
      
      // Calculate total amount
      const totalAmount = groupUtxos.reduce((sum, u) => sum + u.amount, 0);
      
      // Determine risk level (use highest risk from any UTXO)
      const hasHighRisk = groupUtxos.some(u => u.privacyRisk === "high");
      const hasMediumRisk = groupUtxos.some(u => u.privacyRisk === "medium");
      const riskLevel = hasHighRisk ? "high" : hasMediumRisk ? "medium" : "low";
      
      // Extract all tags
      const tags = Array.from(new Set(groupUtxos.flatMap(u => u.tags)));
      
      // Create node
      const height = Math.max(60, Math.min(100, 50 + Math.log10(1 + totalAmount) * 25));
      const width = Math.max(120, Math.min(200, 100 + Math.log10(1 + totalAmount) * 40));
      
      // Randomize Y position slightly to avoid perfect alignment
      const y = dimensions.height / 2 + (Math.random() - 0.5) * 100;
      
      nodes.push({
        id: txid,
        date: txDate,
        amount: totalAmount,
        utxos: groupUtxos,
        x,
        y,
        width,
        height,
        riskLevel,
        tags
      });
    });
    
    // Create links between transactions
    const nodeLinks: TransactionLink[] = [];
    
    // Create sender-receiver connections
    nodes.forEach(sourceNode => {
      sourceNode.utxos.forEach(utxo => {
        if (utxo.senderAddress) {
          // Find transactions with this sender address
          nodes.forEach(targetNode => {
            if (targetNode.id !== sourceNode.id) {
              const hasConnection = targetNode.utxos.some(u => 
                u.address === utxo.senderAddress && 
                parseISO(u.acquisitionDate || '2000-01-01') < sourceNode.date
              );
              
              if (hasConnection) {
                // Create a link from target to source (money flow direction)
                nodeLinks.push({
                  source: targetNode.id,
                  target: sourceNode.id,
                  amount: utxo.amount,
                  riskLevel: utxo.privacyRisk
                });
              }
            }
          });
        }
      });
    });
    
    // Calculate curve control points for links
    nodeLinks.forEach(link => {
      // Find source and target nodes
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        // Calculate curve height based on horizontal distance
        const dx = targetNode.x - sourceNode.x;
        const curveHeight = Math.min(200, Math.abs(dx) * 0.3);
        
        // Generate SVG path
        const startX = sourceNode.x + sourceNode.width / 2;
        const startY = sourceNode.y;
        const endX = targetNode.x - targetNode.width / 2;
        const endY = targetNode.y;
        
        // Calculate control points for the curve
        const controlX1 = startX + dx / 3;
        const controlY1 = startY - curveHeight;
        const controlX2 = startX + (dx * 2) / 3;
        const controlY2 = endY - curveHeight;
        
        // Save control points
        link.controlPointX = (controlX1 + controlX2) / 2;
        link.controlPointY = (controlY1 + controlY2) / 2;
        
        // Create SVG path
        link.path = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
      }
    });
    
    setTransactions(nodes);
    setLinks(nodeLinks);
    setTimeDivisions(divisions);
  }, [utxos, dimensions]);
  
  // Process data when utxos or dimensions change
  useEffect(() => {
    processUTXOData();
  }, [utxos, dimensions, processUTXOData]);
  
  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, prev - 0.2));
  };
  
  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };
  
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const toggleAddressView = () => {
    setShowAddresses(prev => !prev);
    toast.info(showAddresses ? "Address connections hidden" : "Address connections visible");
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
      const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
      setZoom(newZoom);
    }
  };
  
  // Get risk color
  const getRiskColor = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "high": return "#ea384c"; // Red
      case "medium": return "#f97316"; // Orange
      case "low": return "#10b981"; // Green
      default: return "#8E9196"; // Gray
    }
  };
  
  // Handle transaction click
  const handleTransactionClick = (tx: TransactionNode) => {
    setSelectedTransaction(tx);
    setShowDetails(true);
    
    // If the parent component wants to select a UTXO
    if (onSelectUtxo && tx.utxos.length > 0) {
      onSelectUtxo(tx.utxos[0]);
    }
  };
  
  // Format BTC amount - new improved format that trims extra zeros
  const formatBTC = (amount: number) => {
    // Remove trailing zeros but keep at least 2 decimal places
    const formatted = amount.toFixed(8).replace(/\.?0+$/, '');
    // If the number has no decimal part or fewer than 2 decimal places, ensure 2 decimal places
    const parts = formatted.split('.');
    if (!parts[1] || parts[1].length < 2) {
      return `${parts[0]}.${(parts[1] || '').padEnd(2, '0')} BTC`;
    }
    return `${formatted} BTC`;
  };
  
  // Calculate transform for the SVG content
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
              max={3}
              step={0.1}
              value={[zoom]}
              onValueChange={handleZoomChange}
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
            variant={showAddresses ? "default" : "outline"}
            size="sm"
            onClick={toggleAddressView}
            className="flex items-center gap-1"
          >
            {showAddresses ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            <span>Show Connections</span>
          </Button>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-gray-400"></div>
            <span>Transactions</span>
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
      
      {/* Timeline visualization */}
      <div 
        className="bg-card rounded-lg shadow-sm p-4 relative overflow-hidden"
        style={{ height: '70vh', cursor: isDragging ? 'grabbing' : 'grab' }}
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg width="100%" height="100%" className="overflow-visible">
          <g transform={transform}>
            {/* Time division lines and labels */}
            <g>
              {timeDivisions.map((division, i) => (
                <g key={`division-${i}`} transform={`translate(${division.x}, 0)`}>
                  <line 
                    x1="0" 
                    y1="0" 
                    x2="0" 
                    y2={dimensions.height} 
                    stroke="#e5e7eb" 
                    strokeWidth="1" 
                    strokeDasharray="5,5" 
                    opacity="0.5"
                  />
                  <text 
                    x="5" 
                    y="20" 
                    fontSize="12" 
                    fill="currentColor" 
                    opacity="0.7"
                  >
                    {division.label}
                  </text>
                </g>
              ))}
            </g>
            
            {/* Links between transactions */}
            {showAddresses && links.map((link, i) => {
              const sourceNode = transactions.find(n => n.id === link.source);
              const targetNode = transactions.find(n => n.id === link.target);
              
              if (!sourceNode || !targetNode || !link.path) return null;
              
              const isHighlighted = selectedTransaction && 
                (selectedTransaction.id === link.source || selectedTransaction.id === link.target);
                
              const strokeColor = getRiskColor(link.riskLevel);
              const strokeWidth = Math.max(1, Math.min(5, Math.log10(1 + link.amount) * 1.5));
              const opacity = isHighlighted ? 0.8 : 0.4;
              
              return (
                <g key={`link-${i}`}>
                  <path
                    d={link.path}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    fill="none"
                  />
                  
                  {/* Optional: Add arrow markers */}
                  {link.controlPointX && link.controlPointY && (
                    <circle 
                      cx={link.controlPointX} 
                      cy={link.controlPointY} 
                      r={strokeWidth + 1}
                      fill={strokeColor}
                      fillOpacity={opacity}
                    />
                  )}
                  
                  {/* Amount label on link (only for larger values) */}
                  {(link.amount > 0.01 && link.controlPointX && link.controlPointY) && (
                    <text
                      x={link.controlPointX}
                      y={link.controlPointY - 10}
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="10"
                      opacity={isHighlighted ? 0.9 : 0.6}
                    >
                      {formatBTC(link.amount)}
                    </text>
                  )}
                </g>
              );
            })}
            
            {/* Transaction blocks */}
            {transactions.map((tx) => {
              const isHovered = hoveredNode === tx.id;
              const isSelected = selectedTransaction?.id === tx.id;
              const color = getRiskColor(tx.riskLevel);
              
              return (
                <TooltipProvider key={tx.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <g
                        transform={`translate(${tx.x - tx.width/2}, ${tx.y - tx.height/2})`}
                        onClick={() => handleTransactionClick(tx)}
                        onMouseEnter={() => setHoveredNode(tx.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Transaction box */}
                        <rect
                          width={tx.width}
                          height={tx.height}
                          rx={6}
                          fill="#9ca3af"
                          fillOpacity={isHovered || isSelected ? 0.9 : 0.7}
                          stroke={isHovered || isSelected ? "#ffffff" : color}
                          strokeWidth={isHovered || isSelected ? 2 : 1}
                          strokeOpacity={isHovered || isSelected ? 1 : 0.7}
                        />
                        
                        {/* BTC Amount */}
                        <text
                          x={tx.width / 2}
                          y={tx.height / 2}
                          textAnchor="middle"
                          fill="white"
                          fontSize="18"
                          fontWeight="600"
                        >
                          {formatBTC(tx.amount)}
                        </text>
                        
                        {/* Transaction ID */}
                        <text
                          x={tx.width / 2}
                          y={20}
                          textAnchor="middle"
                          fill="white"
                          fontSize="12"
                        >
                          {tx.id.substring(0, 8)}...
                        </text>
                        
                        {/* Risk indicator */}
                        <rect
                          x={5}
                          y={5}
                          width={10}
                          height={10}
                          rx={5}
                          fill={color}
                        />
                        
                        {/* Tags indicator (if any) */}
                        {tx.tags.length > 0 && (
                          <g transform={`translate(${tx.width - 20}, 5)`}>
                            <rect
                              width={15}
                              height={15}
                              rx={3}
                              fill="white"
                              fillOpacity={0.8}
                            />
                            <text
                              x={7.5}
                              y={11}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="bold"
                              fill="#374151"
                            >
                              {tx.tags.length}
                            </text>
                          </g>
                        )}
                        
                        {/* Date label */}
                        <text
                          x={tx.width / 2}
                          y={tx.height - 10}
                          textAnchor="middle"
                          fill="white"
                          fontSize="12"
                          opacity={0.9}
                        >
                          {format(tx.date, 'MMM d')}
                        </text>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="p-2">
                        <div className="font-bold">Transaction</div>
                        <div className="text-sm font-mono">{tx.id}</div>
                        <div className="text-sm mt-1">
                          {formatBTC(tx.amount)}
                        </div>
                        <div className="text-xs mt-1">
                          {format(tx.date, 'MMM d, yyyy')} • 
                          <span className={`ml-1 ${
                            tx.riskLevel === 'high' ? 'text-red-500' : 
                            tx.riskLevel === 'medium' ? 'text-amber-500' : 
                            'text-green-500'
                          }`}>
                            {tx.riskLevel} risk
                          </span>
                        </div>
                        {tx.utxos.length > 0 && (
                          <div className="text-xs mt-1">
                            Contains {tx.utxos.length} UTXOs
                          </div>
                        )}
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
          Click and drag to move. Use mouse wheel or zoom controls to zoom in/out. Click on transactions for details.
        </div>
      </div>
      
      {/* Transaction detail dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Transaction Details
            </DialogTitle>
            <DialogDescription>
              {selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-sm font-mono">{formatBTC(selectedTransaction.amount)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">Date:</span>
                  <span className="text-sm font-mono">{format(selectedTransaction.date, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-medium">Risk Level:</span>
                  <span className={`text-sm font-medium ${
                    selectedTransaction.riskLevel === 'high' ? 'text-red-500' : 
                    selectedTransaction.riskLevel === 'medium' ? 'text-amber-500' : 
                    'text-green-500'
                  }`}>
                    {selectedTransaction.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* UTXOs in transaction */}
              <div>
                <h3 className="text-sm font-medium mb-2">UTXOs in Transaction</h3>
                <div className="bg-muted p-3 rounded-lg max-h-[200px] overflow-y-auto">
                  {selectedTransaction.utxos.map((utxo, i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b last:border-b-0">
                      <div className="text-sm font-mono truncate max-w-[150px]">
                        {`${utxo.txid.substring(0, 8)}...${utxo.vout}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskBadgeStyle(utxo.privacyRisk)}>
                          {utxo.privacyRisk}
                        </Badge>
                        <span className="text-sm font-mono">{formatBTC(utxo.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Tags */}
              {selectedTransaction.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedTransaction.tags.map((tag, i) => (
                      <Badge key={i} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Connected transactions */}
              <div>
                <h3 className="text-sm font-medium mb-2">Connected Transactions</h3>
                <div className="bg-muted p-3 rounded-lg">
                  {links.filter(link => 
                    link.source === selectedTransaction.id || 
                    link.target === selectedTransaction.id
                  ).length > 0 ? (
                    links.filter(link => 
                      link.source === selectedTransaction.id || 
                      link.target === selectedTransaction.id
                    ).map((link, i) => {
                      const isSource = link.source === selectedTransaction.id;
                      const connectedTxId = isSource ? link.target : link.source;
                      const connectedTx = transactions.find(tx => tx.id === connectedTxId);
                      
                      if (!connectedTx) return null;
                      
                      return (
                        <div key={i} className="flex justify-between items-center py-1 border-b last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${isSource ? 'text-green-500' : 'text-blue-500'}`}>
                              {isSource ? 'Output →' : '← Input'}
                            </span>
                            <span className="text-sm">
                              {connectedTx.id.substring(0, 8)}...
                            </span>
                          </div>
                          <Badge className={getRiskBadgeStyle(link.riskLevel)}>
                            {formatBTC(link.amount)}
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
