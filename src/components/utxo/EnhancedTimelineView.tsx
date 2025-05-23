
import React, { useState, useEffect, useRef } from "react";
import { UTXO } from "@/types/utxo";
import { ZoomIn, ZoomOut, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRiskColor, formatBTC, calculateTimelineSpacing, groupUtxosByMonth } from "@/utils/utxo-utils";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EnhancedTimelineViewProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  selectedUtxo?: UTXO | null;
  showConnections?: boolean;
  zoomLevel?: number;
}

export const EnhancedTimelineView: React.FC<EnhancedTimelineViewProps> = ({
  utxos,
  onSelectUtxo,
  selectedUtxo,
  showConnections: initialShowConnections = true,
  zoomLevel: initialZoomLevel = 1
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [localShowConnections, setLocalShowConnections] = useState(initialShowConnections);
  const [localZoomLevel, setLocalZoomLevel] = useState(initialZoomLevel);
  const [hoveredUtxo, setHoveredUtxo] = useState<UTXO | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  const [monthGroups, setMonthGroups] = useState<{ groups: Record<string, UTXO[]>, sortedKeys: string[] }>({ groups: {}, sortedKeys: [] });
  const [connections, setConnections] = useState<{ path: string, source: UTXO, target: UTXO, risk: 'low' | 'medium' | 'high' }[]>([]);

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
    if (localShowConnections) {
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
  }, [utxos, localShowConnections]);
  
  // Calculate node positions and connection paths
  useEffect(() => {
    if (!containerRef.current || monthGroups.sortedKeys.length === 0) return;
    
    // We'll calculate curved paths between UTXOs here
    // This is a simplified approach - in a production app you'd want to use a layout algorithm
    if (localShowConnections && connections.length > 0) {
      const updatedConnections = [...connections];
      
      // We need to create a lookup by txid and vout to find positions
      const utxoPositions = new Map<string, { x: number, y: number }>();
      
      // Iterate through month groups to find UTXO positions
      monthGroups.sortedKeys.forEach((monthKey, monthIndex) => {
        const utxosInMonth = monthGroups.groups[monthKey];
        const monthX = monthIndex * 200 + 100; // Center of the month column
        
        utxosInMonth.forEach((utxo, utxoIndex) => {
          // Distribute vertically with some spacing
          const nodeY = 100 + (utxoIndex * 60) % 400;
          
          // Store position
          utxoPositions.set(`${utxo.txid}-${utxo.vout}`, { x: monthX, y: nodeY });
        });
      });
      
      // Now update connections with paths
      updatedConnections.forEach(conn => {
        const sourceKey = `${conn.source.txid}-${conn.source.vout}`;
        const targetKey = `${conn.target.txid}-${conn.target.vout}`;
        
        const sourcePos = utxoPositions.get(sourceKey);
        const targetPos = utxoPositions.get(targetKey);
        
        if (sourcePos && targetPos) {
          // Create an arc path between two points
          conn.path = calculateCurvedPath(
            sourcePos.x, 
            sourcePos.y, 
            targetPos.x, 
            targetPos.y, 
            0.4
          ); 
        }
      });
      
      setConnections(updatedConnections);
    }
  }, [dimensions, monthGroups, localShowConnections, connections]);

  // Calculate a curved path between points
  const calculateCurvedPath = (x1: number, y1: number, x2: number, y2: number, curveFactor: number) => {
    // Determines how "curved" the line will be
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dr = Math.sqrt(dx * dx + dy * dy) * curveFactor;
    
    // SVG path for curved line
    return `M${x1},${y1}A${dr},${dr} 0 0,1 ${x2},${y2}`;
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

  // Handle zoom controls
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
  
  // Calculate node size based on BTC amount with a consistent scale
  const getNodeSize = (amount: number) => {
    // Improved sizing formula for better visual consistency (1.3 Timeline View)
    return 30 + Math.min(60, Math.pow(Math.log10(1 + amount * 10) * 8, 1.5));
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

  return (
    <div className="relative h-full w-full overflow-hidden border border-muted-foreground/20 rounded-md">
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
      
      {/* Timeline visualization */}
      <div 
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing bg-background"
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
            transform: `translate(${position.x}px, ${position.y}px) scale(${localZoomLevel})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease'
          }}
        >
          {/* Define markers for arrow heads with better visibility */}
          <defs>
            <marker 
              id="arrow-low" 
              viewBox="0 0 10 10" 
              refX="5" 
              refY="5"
              markerWidth="5" 
              markerHeight="5"
              orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={getRiskColor('low')} />
            </marker>
            <marker 
              id="arrow-medium" 
              viewBox="0 0 10 10" 
              refX="5" 
              refY="5"
              markerWidth="5" 
              markerHeight="5"
              orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={getRiskColor('medium')} />
            </marker>
            <marker 
              id="arrow-high" 
              viewBox="0 0 10 10" 
              refX="5" 
              refY="5"
              markerWidth="5" 
              markerHeight="5"
              orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={getRiskColor('high')} />
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
                
                {/* Month label with improved visibility */}
                <rect
                  x={x + 50}
                  y={15}
                  width={100}
                  height={26}
                  rx={13}
                  fill="var(--primary)"
                  fillOpacity={0.2}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                
                <text 
                  x={x + 100} 
                  y={32} 
                  textAnchor="middle" 
                  className="fill-foreground text-sm font-medium"
                  style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.1)' }}
                >
                  {formatMonthLabel(monthKey)}
                </text>
                
                {/* Connection lines between related UTXOs - Draw BEFORE nodes so they appear behind */}
                {localShowConnections && connections.map((conn, connIndex) => {
                  const isConnHighlighted = hoveredUtxo && (
                    (conn.source.txid === hoveredUtxo.txid && conn.source.vout === hoveredUtxo.vout) ||
                    (conn.target.txid === hoveredUtxo.txid && conn.target.vout === hoveredUtxo.vout)
                  );
                  
                  const markerEnd = `url(#arrow-${conn.risk})`;
                  const opacity = isConnHighlighted ? 0.9 : 0.4;
                  
                  return (
                    <path
                      key={`conn-${connIndex}`}
                      d={conn.path}
                      stroke={getRiskColor(conn.risk)}
                      strokeWidth={isConnHighlighted ? 2.5 : 1.5}
                      strokeOpacity={opacity}
                      fill="none"
                      markerEnd={markerEnd}
                      strokeLinecap="round"
                      className="transition-all duration-200"
                    />
                  );
                })}
                
                {/* UTXO nodes for this month */}
                {monthGroups.groups[monthKey].map((utxo, utxoIndex) => {
                  const nodeSize = getNodeSize(utxo.amount);
                  const isSelected = selectedUtxo && selectedUtxo.txid === utxo.txid && selectedUtxo.vout === utxo.vout;
                  const isHovered = hoveredUtxo && hoveredUtxo.txid === utxo.txid && hoveredUtxo.vout === hoveredUtxo.vout;
                  
                  // Calculate position within month column to avoid overlap (1.1 Timeline View)
                  // We'll space them vertically within the month
                  const nodeX = x + 100; // Center of month column
                  const rowsPerColumn = Math.floor(450 / 60); // How many UTXOs fit in the visible area
                  const rowIndex = utxoIndex % rowsPerColumn;
                  const columnOffset = Math.floor(utxoIndex / rowsPerColumn) * 40; // Offset for additional columns
                  const nodeY = 100 + (rowIndex * 60); // Distribute vertically with fixed spacing
                  
                  return (
                    <TooltipProvider key={`utxo-${utxo.txid}-${utxo.vout}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <g 
                            transform={`translate(${nodeX + columnOffset}, ${nodeY})`}
                            onClick={() => handleUtxoClick(utxo)}
                            onMouseEnter={() => handleUtxoMouseEnter(utxo)}
                            onMouseLeave={handleUtxoMouseLeave}
                            className="cursor-pointer"
                          >
                            {/* UTXO node circle */}
                            <circle
                              r={nodeSize / 2}
                              fill={getNodeColor(utxo.privacyRisk, isSelected, isHovered)}
                              stroke={isSelected ? "white" : "rgba(255,255,255,0.3)"}
                              strokeWidth={isSelected ? 3 : 1}
                              className="transition-all duration-200"
                            />
                            
                            {/* Add node shadow/glow for better visibility */}
                            <circle
                              r={nodeSize / 2}
                              fill="none"
                              strokeWidth={0}
                              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                            />
                            
                            {/* UTXO amount label - improved text legibility with background */}
                            <rect 
                              x={-nodeSize/3} 
                              y={-10} 
                              width={nodeSize*2/3} 
                              height={20}
                              rx={10}
                              fill="rgba(0,0,0,0.5)"
                              opacity={0.8}
                            />
                            
                            <text
                              y={4}
                              textAnchor="middle"
                              className="fill-white text-xs font-medium"
                              style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                            >
                              {formatBTC(utxo.amount, { trimZeros: true, maxDecimals: 4 })}
                            </text>
                            
                            {/* UTXO txid label (only show when selected or hovered) */}
                            {(isSelected || isHovered) && (
                              <>
                                <rect
                                  x={-40}
                                  y={nodeSize / 2 + 6}
                                  width={80}
                                  height={18}
                                  rx={9}
                                  fill="rgba(0,0,0,0.6)"
                                />
                                <text
                                  y={nodeSize / 2 + 19}
                                  textAnchor="middle"
                                  className="fill-white text-xs"
                                  style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                                >
                                  {`${utxo.txid.substring(0, 6)}...${utxo.vout}`}
                                </text>
                              </>
                            )}
                          </g>
                        </TooltipTrigger>
                        <TooltipContent className="p-2">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">UTXO {utxo.txid.substring(0, 8)}...:{utxo.vout}</div>
                            <div className="font-mono mt-1">{formatBTC(utxo.amount)} BTC</div>
                            <div className="text-xs">
                              Risk: <span className={utxo.privacyRisk === 'high' ? 'text-red-500' : 
                                                    utxo.privacyRisk === 'medium' ? 'text-amber-500' : 
                                                    'text-emerald-500'}>
                                      {utxo.privacyRisk.toUpperCase()}
                                    </span>
                            </div>
                            {utxo.acquisitionDate && (
                              <div className="text-xs mt-1">
                                Date: {new Date(utxo.acquisitionDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </g>
            );
          })}
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
