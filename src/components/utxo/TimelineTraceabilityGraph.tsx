import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { UTXO } from "@/types/utxo";
import { format, parseISO, differenceInDays, addDays, addMonths, startOfMonth } from "date-fns";
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
  showConnections?: boolean; // Added this prop with an optional flag
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

// Interface for month group
interface MonthGroup {
  startDate: Date;
  endDate: Date;
  label: string;
  x: number;
  width: number;
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

export const TimelineTraceabilityGraph: React.FC<TimelineTraceabilityGraphProps> = ({ 
  utxos, 
  onSelectUtxo,
  showConnections: externalShowConnections
}) => {
  // State for graph visualization
  const [transactions, setTransactions] = useState<TransactionNode[]>([]);
  const [links, setLinks] = useState<TransactionLink[]>([]);
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionNode | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // Update the initialization of showConnections to use the prop if provided
  const [showConnections, setShowConnections] = useState<boolean>(
    externalShowConnections !== undefined ? externalShowConnections : false
  );
  
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
  
  // Enhanced process UTXO data with better node positioning
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
    
    // Add padding of 1 month to start and end
    const startDate = startOfMonth(addMonths(minDate, -1));
    const endDate = addMonths(maxDate, 1);
    
    // Generate month divisions
    const months: MonthGroup[] = [];
    let currentDate = new Date(startDate);
    const timelineWidth = dimensions.width * 1.5; // Make timeline wider than viewport
    
    // Count number of months
    let monthCount = 0;
    while (currentDate <= endDate) {
      monthCount++;
      currentDate = addMonths(currentDate, 1);
    }
    
    // Reset and calculate month widths
    currentDate = new Date(startDate);
    const monthWidth = timelineWidth / monthCount;
    
    let i = 0;
    while (currentDate <= endDate) {
      const nextMonth = addMonths(currentDate, 1);
      
      months.push({
        startDate: currentDate,
        endDate: nextMonth,
        label: format(currentDate, 'MMM yyyy'),
        x: i * monthWidth,
        width: monthWidth
      });
      
      currentDate = nextMonth;
      i++;
    }
    
    // Create transaction nodes
    const nodes: TransactionNode[] = [];
    const usedPositions = new Map<string, { x: number; y: number }[]>(); // Track positions per month
    
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
      
      // Find which month this transaction belongs to
      const month = months.find(m => txDate >= m.startDate && txDate < m.endDate);
      
      if (!month) return; // Skip if no month found
      
      // Calculate position within month
      const daysIntoMonth = differenceInDays(txDate, month.startDate);
      const daysInMonth = differenceInDays(month.endDate, month.startDate);
      const xOffset = (daysIntoMonth / daysInMonth) * month.width;
      
      const x = month.x + xOffset;
      
      // Enhanced Y positioning to prevent overlaps
      const monthKey = format(txDate, 'yyyy-MM');
      if (!usedPositions.has(monthKey)) {
        usedPositions.set(monthKey, []);
      }
      
      const existingPositions = usedPositions.get(monthKey)!;
      const minDistance = 120; // Minimum distance between nodes
      let y = dimensions.height / 2;
      
      // Find a position that doesn't overlap with existing nodes
      let attempts = 0;
      let positionFound = false;
      
      while (!positionFound && attempts < 20) {
        let hasCollision = false;
        
        for (const pos of existingPositions) {
          const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
          if (distance < minDistance) {
            hasCollision = true;
            break;
          }
        }
        
        if (!hasCollision) {
          positionFound = true;
        } else {
          // Try different Y positions
          const offset = (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * 60;
          y = dimensions.height / 2 + offset;
          // Keep within bounds
          y = Math.max(100, Math.min(dimensions.height - 100, y));
        }
        attempts++;
      }
      
      existingPositions.push({ x, y });
      
      // Calculate total amount
      const totalAmount = groupUtxos.reduce((sum, u) => sum + u.amount, 0);
      
      // Determine risk level (use highest risk from any UTXO)
      const hasHighRisk = groupUtxos.some(u => u.privacyRisk === "high");
      const hasMediumRisk = groupUtxos.some(u => u.privacyRisk === "medium");
      const riskLevel = hasHighRisk ? "high" : hasMediumRisk ? "medium" : "low";
      
      // Extract all tags
      const tags = Array.from(new Set(groupUtxos.flatMap(u => u.tags)));
      
      // Create node with enhanced positioning
      const height = Math.max(60, Math.min(100, 50 + Math.log10(1 + totalAmount) * 25));
      const width = Math.max(100, Math.min(180, 80 + Math.log10(1 + totalAmount) * 40));
      
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
        // Calculate enhanced curve with better visual appeal
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Dynamic curve height based on distance and direction
        const curveHeight = Math.min(150, Math.max(50, distance * 0.25));
        const curveDirection = dy > 0 ? -1 : 1; // Curve away from closer nodes
        
        // Enhanced connection points
        const startX = sourceNode.x + sourceNode.width;
        const startY = sourceNode.y + sourceNode.height / 2;
        const endX = targetNode.x;
        const endY = targetNode.y + targetNode.height / 2;
        
        // Quadratic Bezier curve for smoother appearance
        const controlX = startX + dx / 2;
        const controlY = startY + curveDirection * curveHeight;
        
        // Save control points
        link.controlPointX = controlX;
        link.controlPointY = controlY;
        
        // Create enhanced SVG path with arrow
        link.path = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
      }
    });
    
    setTransactions(nodes);
    setLinks(nodeLinks);
    setMonthGroups(months);
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
  
  // Update the toggleConnectionsView function to respect external control when available
  const toggleConnectionsView = () => {
    if (externalShowConnections === undefined) {
      // Only toggle internally if not controlled externally
      setShowConnections(prev => !prev);
      toast.info(showConnections ? "Address connections hidden" : "Address connections visible");
    }
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
  
  // Format BTC amount - trimmed format that removes trailing zeros
  const formatBTC = (amount: number) => {
    // Convert to string and remove trailing zeros
    const formatted = amount.toFixed(8).replace(/\.?0+$/, '');
    // If no decimal points left, add .0
    if (!formatted.includes('.')) {
      return `${formatted}.0 BTC`;
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
            variant={showConnections ? "default" : "outline"}
            size="sm"
            onClick={toggleConnectionsView}
            className="flex items-center gap-1"
          >
            {showConnections ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
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
          <defs>
            <marker
              id="arrowhead-low"
              markerWidth="12"
              markerHeight="8"
              refX="11"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path
                d="M 0 0 L 12 4 L 0 8 Z"
                fill="#10b981"
                stroke="#10b981"
                strokeWidth="1"
              />
            </marker>
            <marker
              id="arrowhead-medium"
              markerWidth="12"
              markerHeight="8"
              refX="11"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path
                d="M 0 0 L 12 4 L 0 8 Z"
                fill="#f97316"
                stroke="#f97316"
                strokeWidth="1"
              />
            </marker>
            <marker
              id="arrowhead-high"
              markerWidth="12"
              markerHeight="8"
              refX="11"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path
                d="M 0 0 L 12 4 L 0 8 Z"
                fill="#ea384c"
                stroke="#ea384c"
                strokeWidth="1"
              />
            </marker>
          </defs>
          
          <g transform={transform}>
            {/* Month group backgrounds and labels */}
            <g>
              {monthGroups.map((month, i) => (
                <g key={`month-${i}`} transform={`translate(${month.x}, 0)`}>
                  {/* Month background */}
                  <rect
                    x="0"
                    y="0"
                    width={month.width}
                    height={dimensions.height}
                    fill={i % 2 === 0 ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.05)"}
                  />
                  
                  {/* Month label */}
                  <text
                    x={month.width / 2}
                    y="25"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="bold"
                    fill="currentColor"
                    opacity="0.7"
                  >
                    {month.label}
                  </text>
                </g>
              ))}
            </g>
            
            {/* Links between transactions */}
            {showConnections && links.map((link, i) => {
              const sourceNode = transactions.find(n => n.id === link.source);
              const targetNode = transactions.find(n => n.id === link.target);
              
              if (!sourceNode || !targetNode || !link.path) return null;
              
              const isHighlighted = selectedTransaction && 
                (selectedTransaction.id === link.source || selectedTransaction.id === link.target);
                
              const strokeColor = getRiskColor(link.riskLevel);
              const strokeWidth = Math.max(2, Math.min(6, Math.log10(1 + link.amount) * 2));
              const opacity = isHighlighted ? 0.9 : 0.6;
              const markerEnd = `url(#arrowhead-${link.riskLevel})`;
              
              return (
                <g key={`link-${i}`}>
                  {/* Enhanced path with arrow */}
                  <path
                    d={link.path}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    fill="none"
                    markerEnd={markerEnd}
                    className="transition-opacity duration-200"
                  />
                  
                  {/* Enhanced amount label with better positioning */}
                  {(link.amount > 0.001 && link.controlPointX && link.controlPointY) && (
                    <g>
                      {/* Background for text readability */}
                      <rect
                        x={link.controlPointX - 25}
                        y={link.controlPointY - 8}
                        width="50"
                        height="16"
                        rx="8"
                        fill="rgba(0,0,0,0.7)"
                        fillOpacity={isHighlighted ? 0.9 : 0.7}
                      />
                      <text
                        x={link.controlPointX}
                        y={link.controlPointY + 3}
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        opacity={isHighlighted ? 1 : 0.8}
                      >
                        {formatBTC(link.amount)}
                      </text>
                    </g>
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
                  <Tooltip delayDuration={200}>
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
                          fontSize="16"
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
                          {tx.id.substring(0, 7)}...
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
                    <TooltipContent side="top">
                      <div className="p-1">
                        <div className="font-bold">{format(tx.date, 'MMM d, yyyy')}</div>
                        <div className="text-sm font-mono truncate max-w-[220px]">{tx.id}</div>
                        <div className="text-sm mt-1 font-medium">
                          {formatBTC(tx.amount)}
                        </div>
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <span className={`
                            ${tx.riskLevel === 'high' ? 'text-red-500' : 
                            tx.riskLevel === 'medium' ? 'text-amber-500' : 
                            'text-green-500'}
                          `}>
                            {tx.riskLevel} risk
                          </span>
                          <span>•</span>
                          <span>{tx.utxos.length} UTXOs</span>
                        </div>
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
