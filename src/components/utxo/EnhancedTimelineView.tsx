import React, { useState, useEffect, useRef } from "react";
import { UTXO } from "@/types/utxo";
import { EnhancedTimelineViewProps } from "@/types/utxo-graph";
import { ZoomIn, ZoomOut, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRiskColor, formatBTC, calculateTimelineSpacing, groupUtxosByMonth, calculateCurvedPath } from "@/utils/utxo-utils";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

export const EnhancedTimelineView: React.FC<EnhancedTimelineViewProps> = ({
  utxos,
  onSelectUtxo,
  selectedUtxo,
  showConnections = true,
  zoomLevel = 1
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [internalShowConnections, setInternalShowConnections] = useState(showConnections);
  const [internalZoomLevel, setInternalZoomLevel] = useState(zoomLevel);
  const [hoveredUtxo, setHoveredUtxo] = useState<UTXO | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  const [monthGroups, setMonthGroups] = useState<{ groups: Record<string, UTXO[]>, sortedKeys: string[] }>({ groups: {}, sortedKeys: [] });
  const [connections, setConnections] = useState<{ path: string, source: UTXO, target: UTXO, risk: 'low' | 'medium' | 'high' }[]>([]);

  // Update internal state when props change
  useEffect(() => {
    setInternalShowConnections(showConnections);
  }, [showConnections]);

  useEffect(() => {
    setInternalZoomLevel(zoomLevel);
  }, [zoomLevel]);

  // Calculate dimensions and group UTXOs by month
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    
    updateDimensions();
    
    // Group UTXOs by month
    const groups = groupUtxosByMonth(utxos);
    setMonthGroups(groups);
    
    // Calculate connections between related UTXOs
    if (internalShowConnections) {
      const newConnections: { path: string, source: UTXO, target: UTXO, risk: 'low' | 'medium' | 'high' }[] = [];
      
      // Simple algorithm to find potential connections based on addresses
      const addressMap = new Map<string, UTXO[]>();
      
      // Group UTXOs by address
      utxos.forEach(utxo => {
        if (utxo.address) {
          if (!addressMap.has(utxo.address)) {
            addressMap.set(utxo.address, []);
          }
          addressMap.get(utxo.address)!.push(utxo);
        }
        
        if (utxo.senderAddress) {
          if (!addressMap.has(utxo.senderAddress)) {
            addressMap.set(utxo.senderAddress, []);
          }
          addressMap.get(utxo.senderAddress)!.push(utxo);
        }
      });
      
      // Create connections between UTXOs with the same address
      addressMap.forEach(addressUtxos => {
        if (addressUtxos.length > 1) {
          // Sort by date to establish direction
          addressUtxos.sort((a, b) => {
            const dateA = a.acquisitionDate ? new Date(a.acquisitionDate).getTime() : 0;
            const dateB = b.acquisitionDate ? new Date(b.acquisitionDate).getTime() : 0;
            return dateA - dateB;
          });
          
          // Connect sequential UTXOs
          for (let i = 0; i < addressUtxos.length - 1; i++) {
            const source = addressUtxos[i];
            const target = addressUtxos[i + 1];
            
            // Determine highest risk level
            let risk: 'low' | 'medium' | 'high' = 'low';
            if (source.privacyRisk === 'high' || target.privacyRisk === 'high') {
              risk = 'high';
            } else if (source.privacyRisk === 'medium' || target.privacyRisk === 'medium') {
              risk = 'medium';
            }
            
            newConnections.push({
              source,
              target,
              risk,
              path: '' // Will be calculated when positions are known
            });
          }
        }
      });
      
      setConnections(newConnections);
    }
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [utxos, internalShowConnections]);
  
  // Calculate node positions and connection paths
  useEffect(() => {
    if (!containerRef.current || monthGroups.sortedKeys.length === 0) return;
    
    // Calculate spacing and positions
    const { xScale, getTxHeight, monthWidth } = calculateTimelineSpacing(
      utxos,
      dimensions.width,
      dimensions.height
    );
    
    // Update connection paths based on node positions
    if (internalShowConnections) {
      const updatedConnections = connections.map(conn => {
        const sourceDate = conn.source.acquisitionDate ? new Date(conn.source.acquisitionDate) : new Date();
        const targetDate = conn.target.acquisitionDate ? new Date(conn.target.acquisitionDate) : new Date();
        
        // Calculate positions
        const sourceX = xScale(sourceDate);
        const targetX = xScale(targetDate);
        
        // Estimate Y positions (this is simplified)
        const sourceY = dimensions.height / 2;
        const targetY = dimensions.height / 2;
        
        // Generate curved path
        const path = calculateCurvedPath(sourceX, sourceY, targetX, targetY, 0.3);
        
        return {
          ...conn,
          path
        };
      });
      
      setConnections(updatedConnections);
    }
  }, [dimensions, monthGroups, internalShowConnections, connections, utxos]);

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
    const newZoom = Math.min(3, Math.max(0.5, internalZoomLevel + delta));
    setInternalZoomLevel(newZoom);
  };

  // Handle zoom controls
  const handleZoomIn = () => {
    setInternalZoomLevel(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setInternalZoomLevel(prev => Math.max(0.5, prev - 0.2));
  };

  const handleResetView = () => {
    setInternalZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const toggleConnections = () => {
    setInternalShowConnections(prev => !prev);
    toast.info(internalShowConnections ? "Connections hidden" : "Connections visible");
  };
  
  // Handle UTXO selection
  const handleUtxoClick = (utxo: UTXO) => {
    if (onSelectUtxo) {
      if (selectedUtxo && selectedUtxo.txid === utxo.txid && selectedUtxo.vout === utxo.vout) {
        onSelectUtxo(null); // Deselect if already selected
      } else {
        onSelectUtxo(utxo);
      }
    }
  };
  
  // Handle UTXO hover
  const handleUtxoMouseEnter = (utxo: UTXO) => {
    setHoveredUtxo(utxo);
  };
  
  const handleUtxoMouseLeave = () => {
    setHoveredUtxo(null);
  };
  
  // Calculate node size based on BTC amount
  const getNodeSize = (amount: number) => {
    // Logarithmic scale for better visualization
    return 20 + Math.min(60, Math.log10(1 + amount * 10) * 20);
  };
  
  // Get color based on risk level
  const getNodeColor = (risk: 'low' | 'medium' | 'high', isSelected: boolean, isHovered: boolean) => {
    const baseColor = getRiskColor(risk);
    
    if (isSelected) {
      return `${baseColor}`;
    }
    
    if (isHovered) {
      return `${baseColor}cc`;
    }
    
    return `${baseColor}99`;
  };
  
  // Format date for display
  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  // Helper function to format transaction dates
  const formatTxDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    try {
      const date = new Date(dateStr);
      return format(date, "MMM d, yyyy");
    } catch (e) {
      return "Invalid Date";
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Visualization controls */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleConnections}
          className={internalShowConnections ? "bg-primary/10" : ""}
        >
          {internalShowConnections ? (
            <><Eye className="h-4 w-4 mr-1" /> Hide Connections</>
          ) : (
            <><EyeOff className="h-4 w-4 mr-1" /> Show Connections</>
          )}
        </Button>
        
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-xs px-2 bg-background/80 rounded">
          {Math.round(internalZoomLevel * 100)}%
        </span>
        
        <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleResetView} className="ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Reset View
        </Button>
      </div>
      
      {/* Timeline visualization */}
      <div 
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing bg-muted/10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 1000 600" 
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${internalZoomLevel})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease'
          }}
        >
          <defs>
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
            </filter>
            
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="4"
              refX="6"
              refY="2"
              orient="auto"
              fill="currentColor"
            >
              <path d="M0,0 L6,2 L0,4 Z" />
            </marker>
          </defs>
          
          {/* Month separators and labels */}
          {monthGroups.sortedKeys.map((monthKey, index) => {
            const x = index * 200;
            return (
              <g key={`month-${monthKey}`}>
                {/* Month separator line */}
                <line 
                  x1={x} 
                  y1={50} 
                  x2={x} 
                  y2={550} 
                  stroke="var(--border)" 
                  strokeWidth={1} 
                  strokeDasharray="4,4" 
                />
                
                {/* Month label */}
                <text 
                  x={x + 100} 
                  y={30} 
                  textAnchor="middle" 
                  className="fill-foreground text-sm font-medium"
                  style={{ filter: "drop-shadow(0px 1px 1px rgba(0,0,0,0.2))" }}
                >
                  {formatMonthLabel(monthKey)}
                </text>
                
                {/* UTXO nodes for this month */}
                {monthGroups.groups[monthKey].map((utxo, utxoIndex) => {
                  const nodeSize = getNodeSize(utxo.amount);
                  const isSelected = selectedUtxo && selectedUtxo.txid === utxo.txid && selectedUtxo.vout === utxo.vout;
                  const isHovered = hoveredUtxo && hoveredUtxo.txid === utxo.txid && hoveredUtxo.vout === utxo.vout;
                  
                  // Calculate position within month column
                  const nodeX = x + 100; // Center of month column
                  const nodeY = 100 + (utxoIndex * 60) % 400; // Distribute vertically with wrapping
                  
                  return (
                    <TooltipProvider key={`utxo-${utxo.txid}-${utxo.vout}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <g 
                            transform={`translate(${nodeX}, ${nodeY})`}
                            onClick={() => handleUtxoClick(utxo)}
                            onMouseEnter={() => handleUtxoMouseEnter(utxo)}
                            onMouseLeave={handleUtxoMouseLeave}
                            className="cursor-pointer"
                          >
                            {/* UTXO node circle with drop shadow */}
                            <circle
                              r={nodeSize / 2}
                              fill={getNodeColor(utxo.privacyRisk, isSelected, isHovered)}
                              stroke={isSelected ? "white" : "rgba(255,255,255,0.5)"}
                              strokeWidth={isSelected ? 2 : 1}
                              className="transition-all duration-200"
                              style={{ filter: "url(#dropShadow)" }}
                            />
                            
                            {/* UTXO amount label */}
                            <text
                              y={4}
                              textAnchor="middle"
                              className="fill-white text-xs font-medium"
                              style={{ 
                                pointerEvents: 'none',
                                textShadow: "0px 1px 2px rgba(0,0,0,0.5)",
                              }}
                            >
                              {formatBTC(utxo.amount, { trimZeros: true, maxDecimals: 4 })}
                            </text>
                            
                            {/* UTXO txid label (only show when selected or hovered) */}
                            {(isSelected || isHovered) && (
                              <text
                                y={nodeSize / 2 + 16}
                                textAnchor="middle"
                                className="fill-background text-xs font-medium"
                                style={{ 
                                  pointerEvents: 'none',
                                  textShadow: "0px 0px 3px rgba(255,255,255,0.9)",
                                }}
                              >
                                {`${utxo.txid.substring(0, 6)}...${utxo.vout}`}
                              </text>
                            )}
                          </g>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs z-50">
                          <div className="space-y-1">
                            <p className="font-medium">
                              {formatBTC(utxo.amount)} 
                              <span className="text-muted-foreground ml-1 text-xs">(vout: {utxo.vout})</span>
                            </p>
                            <p className="text-xs text-muted-foreground break-all">{utxo.txid}</p>
                            <div className="text-xs pt-1">
                              <p><span className="font-medium">Date:</span> {formatTxDate(utxo.acquisitionDate)}</p>
                              {utxo.walletName && <p><span className="font-medium">Wallet:</span> {utxo.walletName}</p>}
                              {utxo.notes && <p><span className="font-medium">Notes:</span> {utxo.notes}</p>}
                            </div>
                            <div className="pt-1">
                              <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${
                                utxo.privacyRisk === 'high' ? 'bg-red-100 text-red-800' : 
                                utxo.privacyRisk === 'medium' ? 'bg-amber-100 text-amber-800' : 
                                'bg-green-100 text-green-800'
                              }`}>
                                {utxo.privacyRisk.toUpperCase()} RISK
                              </span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </g>
            );
          })}
          
          {/* Connection lines between related UTXOs - rendered on top for better visibility */}
          {internalShowConnections && connections.map((conn, index) => (
            <path
              key={`conn-${index}`}
              d={conn.path}
              stroke={getRiskColor(conn.risk)}
              strokeWidth={conn.source === hoveredUtxo || conn.target === hoveredUtxo ? 3 : 1.5}
              strokeOpacity={conn.source === hoveredUtxo || conn.target === hoveredUtxo ? 0.9 : 0.5}
              fill="none"
              markerEnd="url(#arrowhead)"
              style={{ pointerEvents: "none" }}
              className="transition-opacity duration-200"
            />
          ))}
        </svg>
      </div>
      
      {/* Empty state */}
      {utxos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <p className="text-muted-foreground text-lg">No UTXO data available for timeline visualization.</p>
        </div>
      )}
    </div>
  );
};
