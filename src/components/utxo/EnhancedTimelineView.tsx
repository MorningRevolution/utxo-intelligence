
import React, { useState, useEffect, useRef } from "react";
import { UTXO } from "@/types/utxo";
import { ZoomIn, ZoomOut, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRiskColor, formatBTC } from "@/utils/utxo-utils";
import { toast } from "sonner";

interface EnhancedTimelineViewProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  selectedUtxo?: UTXO | null;
  showConnections?: boolean;
  zoomLevel?: number;
}

interface TimelineNode {
  utxo: UTXO;
  x: number;
  y: number;
  size: number;
}

interface Connection {
  source: TimelineNode;
  target: TimelineNode;
  path: string;
  risk: 'low' | 'medium' | 'high';
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
  const [showConnections, setShowConnections] = useState(initialShowConnections);
  const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
  const [hoveredUtxo, setHoveredUtxo] = useState<UTXO | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  const [timelineNodes, setTimelineNodes] = useState<TimelineNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  // Calculate timeline layout with proper date-based spacing
  useEffect(() => {
    if (!containerRef.current || !utxos.length) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    
    updateDimensions();
    
    // Sort UTXOs by date
    const sortedUtxos = [...utxos].sort((a, b) => {
      const dateA = a.acquisitionDate ? new Date(a.acquisitionDate).getTime() : 0;
      const dateB = b.acquisitionDate ? new Date(b.acquisitionDate).getTime() : 0;
      return dateA - dateB;
    });
    
    // Calculate time range
    const dates = sortedUtxos.map(utxo => 
      utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : new Date()
    );
    const minDate = Math.min(...dates.map(d => d.getTime()));
    const maxDate = Math.max(...dates.map(d => d.getTime()));
    const timeRange = maxDate - minDate || 1;
    
    // Create timeline nodes with proper spacing
    const nodes: TimelineNode[] = [];
    const nodesByDate = new Map<string, TimelineNode[]>();
    
    sortedUtxos.forEach((utxo, index) => {
      const date = utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : new Date();
      const x = 50 + ((date.getTime() - minDate) / timeRange) * (dimensions.width - 100);
      
      // Group nodes by date for vertical stacking
      const dateKey = date.toDateString();
      if (!nodesByDate.has(dateKey)) {
        nodesByDate.set(dateKey, []);
      }
      
      const sameDataNodes = nodesByDate.get(dateKey)!;
      const y = 100 + (sameDataNodes.length * 80); // Vertical spacing for same date
      
      const size = Math.max(30, Math.min(60, Math.log10(1 + utxo.amount * 10) * 15));
      
      const node: TimelineNode = {
        utxo,
        x,
        y,
        size
      };
      
      nodes.push(node);
      sameDataNodes.push(node);
    });
    
    setTimelineNodes(nodes);
    
    // Calculate connections
    if (showConnections) {
      const newConnections: Connection[] = [];
      const addressMap = new Map<string, TimelineNode[]>();
      
      // Group nodes by address
      nodes.forEach(node => {
        if (node.utxo.address) {
          if (!addressMap.has(node.utxo.address)) {
            addressMap.set(node.utxo.address, []);
          }
          addressMap.get(node.utxo.address)!.push(node);
        }
        
        if (node.utxo.senderAddress) {
          if (!addressMap.has(node.utxo.senderAddress)) {
            addressMap.set(node.utxo.senderAddress, []);
          }
          addressMap.get(node.utxo.senderAddress)!.push(node);
        }
      });
      
      // Create connections between related nodes
      addressMap.forEach(addressNodes => {
        if (addressNodes.length > 1) {
          // Sort by x position (time)
          addressNodes.sort((a, b) => a.x - b.x);
          
          // Connect sequential nodes
          for (let i = 0; i < addressNodes.length - 1; i++) {
            const source = addressNodes[i];
            const target = addressNodes[i + 1];
            
            // Create curved path with arrowhead
            const path = createCurvedArrowPath(source, target);
            
            // Determine risk level
            let risk: 'low' | 'medium' | 'high' = 'low';
            if (source.utxo.privacyRisk === 'high' || target.utxo.privacyRisk === 'high') {
              risk = 'high';
            } else if (source.utxo.privacyRisk === 'medium' || target.utxo.privacyRisk === 'medium') {
              risk = 'medium';
            }
            
            newConnections.push({
              source,
              target,
              path,
              risk
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
  }, [utxos, showConnections, dimensions.width]);

  // Create curved arrow path with visible arrowhead
  const createCurvedArrowPath = (source: TimelineNode, target: TimelineNode): string => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const midX = source.x + dx / 2;
    const midY = source.y + dy / 2 - Math.abs(dx) * 0.3; // Curve upward
    
    return `M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`;
  };

  // Handle mouse events for pan and zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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
    const delta = -Math.sign(e.deltaY) * 0.1;
    const newZoom = Math.min(3, Math.max(0.5, zoomLevel + delta));
    setZoomLevel(newZoom);
  };

  // Handle zoom controls
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
  
  const toggleConnections = () => {
    setShowConnections(prev => !prev);
    toast.info(showConnections ? "Connections hidden" : "Connections visible");
  };
  
  // Handle UTXO selection
  const handleUtxoClick = (utxo: UTXO) => {
    if (onSelectUtxo) {
      if (selectedUtxo && selectedUtxo.txid === utxo.txid && selectedUtxo.vout === utxo.vout) {
        onSelectUtxo(null);
      } else {
        onSelectUtxo(utxo);
      }
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
          className={showConnections ? "bg-primary/10" : ""}
        >
          {showConnections ? (
            <><Eye className="h-4 w-4 mr-1" /> Hide Connections</>
          ) : (
            <><EyeOff className="h-4 w-4 mr-1" /> Show Connections</>
          )}
        </Button>
        
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-xs px-2 bg-background/80 rounded">
          {Math.round(zoomLevel * 100)}%
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
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease'
          }}
        >
          {/* Arrow marker definitions */}
          <defs>
            <marker
              id="arrowhead-high"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </marker>
            <marker
              id="arrowhead-medium"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#d97706"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </marker>
            <marker
              id="arrowhead-low"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#059669"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </marker>
          </defs>
          
          {/* Connection arrows with high contrast */}
          {showConnections && connections.map((conn, index) => (
            <path
              key={`conn-${index}`}
              d={conn.path}
              stroke={getRiskColor(conn.risk)}
              strokeWidth={3}
              strokeOpacity={0.8}
              fill="none"
              markerEnd={`url(#arrowhead-${conn.risk})`}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
            />
          ))}
          
          {/* Timeline nodes */}
          {timelineNodes.map((node, index) => {
            const isSelected = selectedUtxo && 
              selectedUtxo.txid === node.utxo.txid && 
              selectedUtxo.vout === node.utxo.vout;
            const isHovered = hoveredUtxo && 
              hoveredUtxo.txid === node.utxo.txid && 
              hoveredUtxo.vout === node.utxo.vout;
            
            return (
              <g 
                key={`node-${node.utxo.txid}-${node.utxo.vout}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleUtxoClick(node.utxo)}
                onMouseEnter={() => setHoveredUtxo(node.utxo)}
                onMouseLeave={() => setHoveredUtxo(null)}
                className="cursor-pointer"
              >
                {/* Node circle with risk color */}
                <circle
                  r={node.size / 2}
                  fill={getRiskColor(node.utxo.privacyRisk)}
                  stroke={isSelected ? "#ffffff" : "#000000"}
                  strokeWidth={isSelected ? 3 : 1}
                  className="transition-all duration-200"
                  style={{
                    filter: isHovered ? 'brightness(1.2) drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 
                            'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                  }}
                />
                
                {/* BTC amount label - always visible */}
                <text
                  y={2}
                  textAnchor="middle"
                  className="fill-white text-xs font-bold"
                  style={{ 
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    fontSize: Math.min(12, node.size / 3)
                  }}
                >
                  {formatBTC(node.utxo.amount, { trimZeros: true, maxDecimals: 3 })}
                </text>
                
                {/* Date label below node */}
                <text
                  y={node.size / 2 + 16}
                  textAnchor="middle"
                  className="fill-foreground text-xs"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.utxo.acquisitionDate ? 
                    new Date(node.utxo.acquisitionDate).toLocaleDateString() : 
                    'No date'
                  }
                </text>
                
                {/* UTXO details on hover */}
                {isHovered && (
                  <text
                    y={node.size / 2 + 32}
                    textAnchor="middle"
                    className="fill-muted-foreground text-xs"
                    style={{ pointerEvents: 'none' }}
                  >
                    tx{node.utxo.vout}_{node.utxo.txid.substring(0, 6)}...
                  </text>
                )}
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
