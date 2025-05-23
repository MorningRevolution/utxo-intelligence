import React, { useState, useEffect, useRef, useMemo } from "react";
import { UTXO } from "@/types/utxo";
import { format, parseISO, startOfMonth, addMonths } from "date-fns";
import { ZoomIn, ZoomOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { groupUtxosByMonth, getRiskColor } from "@/utils/utxo-utils";
import { formatBTC } from "@/utils/utxo-utils";
import { toast } from "sonner";

interface EnhancedTimelineViewProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  selectedUtxo?: UTXO | null;
  showConnections?: boolean; // Added prop
  zoomLevel?: number; // Added prop
}

interface MonthColumn {
  month: string;
  date: Date;
  utxos: UTXO[];
  x: number;
  width: number;
}

interface Connection {
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  type: 'change' | 'address' | 'transaction';
  riskLevel: 'low' | 'medium' | 'high';
}

export const EnhancedTimelineView: React.FC<EnhancedTimelineViewProps> = ({
  utxos,
  onSelectUtxo,
  selectedUtxo,
  showConnections = true, // Default to true if not provided
  zoomLevel: externalZoomLevel
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [months, setMonths] = useState<MonthColumn[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [internalZoomLevel, setInternalZoomLevel] = useState<number>(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showConnectionsInternal, setShowConnectionsInternal] = useState(true);
  const [highlightedUtxos, setHighlightedUtxos] = useState<Set<string>>(new Set());
  const [hoveredUtxo, setHoveredUtxo] = useState<string | null>(null);
  
  // Use external zoom level if provided, otherwise use internal state
  const effectiveZoomLevel = externalZoomLevel !== undefined ? externalZoomLevel : internalZoomLevel;
  
  // Use external showConnections if provided, otherwise use internal state
  const effectiveShowConnections = showConnections !== undefined ? showConnections : showConnectionsInternal;
  
  // Calculate a unique ID for each UTXO
  const getUtxoId = (utxo: UTXO) => `${utxo.txid}-${utxo.vout}`;
  
  // Process UTXOs into month-based groups
  useEffect(() => {
    if (!utxos.length) return;
    
    // Group UTXOs by month
    const { groups, sortedKeys } = groupUtxosByMonth(utxos);
    
    // No data case
    if (sortedKeys.length === 0) return;
    
    // Calculate month column positions
    const columnWidth = 220; // Base width for each month column
    const columns: MonthColumn[] = [];
    
    sortedKeys.forEach((key, index) => {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      
      columns.push({
        month: format(date, 'MMM yyyy'),
        date,
        utxos: groups[key],
        x: index * columnWidth,
        width: columnWidth
      });
    });
    
    setMonths(columns);
    
    // Reset view when data changes
    if (columns.length > 0) {
      setPosition({ x: 0, y: 0 });
      setZoomLevel(1);
    }
  }, [utxos]);
  
  // Calculate connections between UTXOs
  useEffect(() => {
    if (!utxos.length || months.length === 0) return;
    
    const newConnections: Connection[] = [];
    const utxoPositions = new Map<string, { x: number, y: number, utxo: UTXO }>();
    
    // First, map all UTXO positions
    months.forEach(month => {
      let yPosition = 10;
      month.utxos.forEach(utxo => {
        // Calculate a y position that distributes UTXOs vertically
        const utxoHeight = calculateUtxoHeight(utxo.amount);
        utxoPositions.set(getUtxoId(utxo), {
          x: month.x + month.width / 2,
          y: yPosition + utxoHeight / 2,
          utxo
        });
        yPosition += utxoHeight + 10; // Add padding between UTXOs
      });
    });
    
    // Then create connections
    utxoPositions.forEach((sourcePos, sourceId) => {
      const sourceUtxo = sourcePos.utxo;
      
      // Find connections based on addresses
      utxoPositions.forEach((targetPos, targetId) => {
        if (sourceId === targetId) return;
        
        const targetUtxo = targetPos.utxo;
        
        // Only connect if target comes after source in time
        if (sourceUtxo.acquisitionDate && targetUtxo.acquisitionDate &&
            new Date(sourceUtxo.acquisitionDate) >= new Date(targetUtxo.acquisitionDate)) {
          return;
        }
        
        // Connect by address
        if (sourceUtxo.address === targetUtxo.senderAddress || 
            (sourceUtxo.receiverAddress && sourceUtxo.receiverAddress === targetUtxo.address)) {
          newConnections.push({
            source: sourceId,
            target: targetId,
            sourceX: sourcePos.x,
            sourceY: sourcePos.y,
            targetX: targetPos.x,
            targetY: targetPos.y,
            type: 'address',
            riskLevel: targetUtxo.privacyRisk
          });
        }
        
        // Connect by change output
        if (sourceUtxo.tags.includes('Change') && 
            sourceUtxo.txid === targetUtxo.txid && 
            sourceUtxo.vout !== targetUtxo.vout) {
          newConnections.push({
            source: sourceId,
            target: targetId,
            sourceX: sourcePos.x,
            sourceY: sourcePos.y,
            targetX: targetPos.x,
            targetY: targetPos.y,
            type: 'change',
            riskLevel: targetUtxo.privacyRisk
          });
        }
      });
    });
    
    setConnections(newConnections);
  }, [months, utxos]);
  
  // Calculate UTXO height based on BTC amount
  const calculateUtxoHeight = (amount: number) => {
    // Logarithmic scale for better visualization
    const minHeight = 24;
    const maxHeight = 100;
    return Math.min(maxHeight, minHeight + Math.log10(1 + amount) * 30);
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
    const newZoom = Math.min(3, Math.max(0.5, zoomLevel + delta));
    setZoomLevel(newZoom);
  };
  
  // Zoom buttons handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 0.2));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, prev - 0.2));
  };
  
  const handleResetView = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };
  
  // Update toggle connections handler to work with both internal and external state
  const toggleConnections = () => {
    if (showConnections === undefined) {
      // Only update internal state if not controlled externally
      setShowConnectionsInternal(prev => !prev);
      toast.info(showConnectionsInternal ? "Connections hidden" : "Connections visible");
    }
  };
  
  // Handle UTXO selection
  const handleUtxoClick = (utxo: UTXO) => {
    if (onSelectUtxo) {
      // Toggle selection
      if (selectedUtxo && selectedUtxo.txid === utxo.txid && selectedUtxo.vout === utxo.vout) {
        onSelectUtxo(null);
      } else {
        onSelectUtxo(utxo);
      }
    }
  };
  
  // Handle UTXO hover to highlight connections
  const handleUtxoMouseEnter = (utxoId: string) => {
    setHoveredUtxo(utxoId);
    
    // Find all connected UTXOs
    const connected = new Set<string>([utxoId]);
    connections.forEach(conn => {
      if (conn.source === utxoId) {
        connected.add(conn.target);
      } else if (conn.target === utxoId) {
        connected.add(conn.source);
      }
    });
    
    setHighlightedUtxos(connected);
  };
  
  const handleUtxoMouseLeave = () => {
    setHoveredUtxo(null);
    setHighlightedUtxos(new Set());
  };
  
  // Check if a UTXO is highlighted
  const isHighlighted = (utxoId: string) => {
    return hoveredUtxo === utxoId || highlightedUtxos.has(utxoId);
  };
  
  // Check if a connection is highlighted
  const isConnectionHighlighted = (conn: Connection) => {
    return hoveredUtxo !== null && 
           (conn.source === hoveredUtxo || conn.target === hoveredUtxo);
  };
  
  // Draw connection path between UTXOs
  const getConnectionPath = (conn: Connection) => {
    const dx = conn.targetX - conn.sourceX;
    const midX = conn.sourceX + dx * 0.5;
    
    return `M ${conn.sourceX} ${conn.sourceY} 
            C ${midX} ${conn.sourceY}, 
              ${midX} ${conn.targetY}, 
              ${conn.targetX} ${conn.targetY}`;
  };
  
  // Get connection color based on type and risk
  const getConnectionColor = (conn: Connection, highlighted: boolean) => {
    if (highlighted) {
      return conn.type === 'change' ? '#9333ea' : '#2563eb';
    }
    
    // Muted colors when not highlighted
    return conn.type === 'change' ? 
      'rgba(147, 51, 234, 0.4)' : 
      'rgba(37, 99, 235, 0.3)';
  };
  
  return (
    <div className="relative h-full w-full overflow-hidden border border-muted-foreground/20 rounded-md bg-background">
      {/* Visualization controls - only show if not externally controlled */}
      {externalZoomLevel === undefined && (
        <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleConnections}
            className={effectiveShowConnections ? "bg-primary/10" : ""}
          >
            {effectiveShowConnections ? "Hide Connections" : "Show Connections"}
          </Button>
          
          <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-xs px-2 bg-background/80 rounded">
            {Math.round(effectiveZoomLevel * 100)}%
          </span>
          
          <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleResetView} className="ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Reset View
          </Button>
        </div>
      )}
      
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
          viewBox="0 0 1600 800" 
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${effectiveZoomLevel})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease'
          }}
        >
          {/* Connection lines - use effectiveShowConnections instead of showConnections */}
          {effectiveShowConnections && connections.map((conn, index) => (
            <path
              key={`conn-${index}`}
              d={getConnectionPath(conn)}
              stroke={getConnectionColor(conn, isConnectionHighlighted(conn))}
              strokeWidth={isConnectionHighlighted(conn) ? 3 : 1.5}
              fill="none"
              markerEnd={isConnectionHighlighted(conn) ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
              opacity={isConnectionHighlighted(conn) ? 1 : 0.6}
              className={`transition-all duration-200 ${isConnectionHighlighted(conn) ? 'z-10' : 'z-0'}`}
            />
          ))}
          
          {/* Month columns */}
          {months.map((month) => (
            <g key={month.month} transform={`translate(${month.x}, 0)`}>
              {/* Month header */}
              <rect
                x={5}
                y={5}
                width={month.width - 10}
                height={30}
                rx={4}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="rgba(59, 130, 246, 0.3)"
              />
              <text
                x={month.width / 2}
                y={25}
                textAnchor="middle"
                className="fill-primary-foreground font-semibold text-sm"
              >
                {month.month}
              </text>
              
              {/* UTXOs in this month */}
              {month.utxos.map((utxo, idx) => {
                const utxoId = getUtxoId(utxo);
                const height = calculateUtxoHeight(utxo.amount);
                const yPos = 45 + idx * (height + 10);
                const isSelected = selectedUtxo && 
                                  selectedUtxo.txid === utxo.txid && 
                                  selectedUtxo.vout === utxo.vout;
                const isHover = isHighlighted(utxoId);
                
                return (
                  <g 
                    key={utxoId} 
                    transform={`translate(10, ${yPos})`}
                    onClick={() => handleUtxoClick(utxo)}
                    onMouseEnter={() => handleUtxoMouseEnter(utxoId)}
                    onMouseLeave={handleUtxoMouseLeave}
                    className="cursor-pointer"
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    <rect
                      width={month.width - 20}
                      height={height}
                      rx={4}
                      fill={getRiskColor(utxo.privacyRisk)}
                      fillOpacity={isSelected || isHover ? 0.9 : 0.7}
                      stroke={isSelected ? 'white' : isHover ? getRiskColor(utxo.privacyRisk) : 'transparent'}
                      strokeWidth={isSelected || isHover ? 2 : 0}
                      className={`transition-all duration-200 ${isSelected || isHover ? 'shadow-lg' : ''}`}
                    />
                    
                    {/* UTXO Label */}
                    <text
                      x={10}
                      y={height / 2}
                      dominantBaseline="middle"
                      className="fill-white text-xs font-medium"
                    >
                      {`${utxo.txid.substring(0, 6)}...${utxo.vout}`}
                    </text>
                    
                    {/* UTXO Amount */}
                    <text
                      x={month.width - 30}
                      y={height / 2}
                      dominantBaseline="middle"
                      textAnchor="end"
                      className="fill-white text-xs font-bold"
                    >
                      {formatBTC(utxo.amount, { trimZeros: true, minDecimals: 5 })}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
          
          {/* Arrow markers for connections */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="4"
              refX="5"
              refY="2"
              orient="auto"
            >
              <path d="M0,0 L6,2 L0,4 Z" fill="rgba(37, 99, 235, 0.6)" />
            </marker>
            
            <marker
              id="arrowhead-highlighted"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L8,3 L0,6 Z" fill="#2563eb" />
            </marker>
          </defs>
        </svg>
      </div>
      
      {/* Empty state */}
      {months.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <p className="text-muted-foreground text-lg">No UTXO timeline data available.</p>
        </div>
      )}
    </div>
  );
};
