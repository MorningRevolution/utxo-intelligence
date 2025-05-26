import React, { useState, useEffect } from "react";
import { UTXO } from "@/types/utxo";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRiskColor, formatBTC } from "@/utils/utxo-utils";
import { TreemapTile } from "@/types/utxo-graph";

interface PrivacyTreemapProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  zoomLevel?: number;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  utxo: UTXO;
}

export const PrivacyTreemap: React.FC<PrivacyTreemapProps> = ({
  utxos,
  onSelectUtxo,
  zoomLevel: initialZoomLevel = 1
}) => {
  const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Handle zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, prev - 0.2));
  };

  // Resize observer to keep treemap responsive
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Improved treemap layout algorithm - proper container-based proportional layout
  useEffect(() => {
    if (!utxos.length) return;

    // Sort UTXOs by amount (largest first) for optimal packing
    const sortedUtxos = [...utxos].sort((a, b) => b.amount - a.amount);
    
    // Calculate total amount for proportional sizing
    const totalAmount = sortedUtxos.reduce((sum, utxo) => sum + utxo.amount, 0);
    
    // Container dimensions with proper padding
    const padding = 20;
    const containerWidth = containerSize.width - (padding * 2);
    const containerHeight = containerSize.height - (padding * 2);
    const totalArea = containerWidth * containerHeight;
    
    // Squarified treemap algorithm for proper non-overlapping layout
    const newRectangles: Rectangle[] = [];
    
    // Calculate normalized areas based on BTC amounts
    const areas = sortedUtxos.map(utxo => (utxo.amount / totalAmount) * totalArea);
    
    // Recursive function to layout rectangles
    const layoutRectangles = (
      utxoIndices: number[],
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      if (utxoIndices.length === 0) return;
      
      if (utxoIndices.length === 1) {
        // Single rectangle - fill the space
        const index = utxoIndices[0];
        const utxo = sortedUtxos[index];
        newRectangles.push({
          x: x + 2,
          y: y + 2,
          width: width - 4,
          height: height - 4,
          utxo
        });
        return;
      }
      
      // Find the best split point
      const totalAreaForGroup = utxoIndices.reduce((sum, i) => sum + areas[i], 0);
      let bestSplit = 1;
      let bestRatio = Infinity;
      
      for (let split = 1; split < utxoIndices.length; split++) {
        const leftArea = utxoIndices.slice(0, split).reduce((sum, i) => sum + areas[i], 0);
        const rightArea = totalAreaForGroup - leftArea;
        const ratio = Math.max(leftArea / rightArea, rightArea / leftArea);
        
        if (ratio < bestRatio) {
          bestRatio = ratio;
          bestSplit = split;
        }
      }
      
      // Split the area
      const leftIndices = utxoIndices.slice(0, bestSplit);
      const rightIndices = utxoIndices.slice(bestSplit);
      const leftArea = leftIndices.reduce((sum, i) => sum + areas[i], 0);
      const leftRatio = leftArea / totalAreaForGroup;
      
      if (width > height) {
        // Split vertically
        const leftWidth = width * leftRatio;
        layoutRectangles(leftIndices, x, y, leftWidth, height);
        layoutRectangles(rightIndices, x + leftWidth, y, width - leftWidth, height);
      } else {
        // Split horizontally
        const leftHeight = height * leftRatio;
        layoutRectangles(leftIndices, x, y, width, leftHeight);
        layoutRectangles(rightIndices, x, y + leftHeight, width, height - leftHeight);
      }
    };
    
    // Start the layout process
    const indices = Array.from({ length: sortedUtxos.length }, (_, i) => i);
    layoutRectangles(indices, padding, padding, containerWidth, containerHeight);
    
    setRectangles(newRectangles);
  }, [utxos, containerSize]);

  // Handle tile selection
  const handleTileClick = (rectangle: Rectangle) => {
    if (onSelectUtxo) {
      const tileId = `${rectangle.utxo.txid}-${rectangle.utxo.vout}`;
      if (selectedTile === tileId) {
        setSelectedTile(null);
        onSelectUtxo(null);
      } else {
        setSelectedTile(tileId);
        onSelectUtxo(rectangle.utxo);
      }
    }
  };

  // Get risk border color
  const getRiskBorderColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high': return '#dc2626'; // red-600
      case 'medium': return '#d97706'; // amber-600
      case 'low': return '#059669'; // emerald-600
      default: return '#6b7280'; // gray-500
    }
  };

  // Get subtle fill color
  const getRiskFillColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high': return '#fef2f2'; // red-50
      case 'medium': return '#fffbeb'; // amber-50
      case 'low': return '#f0fdf4'; // emerald-50
      default: return '#f9fafb'; // gray-50
    }
  };

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-xs px-2 bg-background/80 rounded">
          {Math.round(zoomLevel * 100)}%
        </span>
        
        <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Risk level legend */}
      <div className="absolute top-2 left-4 flex flex-col gap-1 z-10">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border-2" style={{ borderColor: getRiskBorderColor('high'), backgroundColor: getRiskFillColor('high') }}></div>
          <span className="text-xs font-medium">High Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border-2" style={{ borderColor: getRiskBorderColor('medium'), backgroundColor: getRiskFillColor('medium') }}></div>
          <span className="text-xs font-medium">Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border-2" style={{ borderColor: getRiskBorderColor('low'), backgroundColor: getRiskFillColor('low') }}></div>
          <span className="text-xs font-medium">Low Risk</span>
        </div>
      </div>
      
      {/* SVG Treemap */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: '0 0',
          transition: 'transform 0.2s ease'
        }}
      >
        {/* Render tiles */}
        {rectangles.map((rect, index) => {
          const tileId = `${rect.utxo.txid}-${rect.utxo.vout}`;
          const isSelected = selectedTile === tileId;
          const isHovered = hoveredTile === tileId;
          
          return (
            <g 
              key={tileId}
              onClick={() => handleTileClick(rect)}
              onMouseEnter={() => setHoveredTile(tileId)}
              onMouseLeave={() => setHoveredTile(null)}
              className="cursor-pointer"
              style={{ 
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: `${rect.x + rect.width/2}px ${rect.y + rect.height/2}px`,
                transition: 'transform 0.2s ease'
              }}
            >
              {/* Hover glow effect */}
              {isHovered && (
                <rect
                  x={rect.x - 2}
                  y={rect.y - 2}
                  width={rect.width + 4}
                  height={rect.height + 4}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  rx={4}
                  className="animate-pulse"
                />
              )}
              
              {/* Main rectangle */}
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill={getRiskFillColor(rect.utxo.privacyRisk)}
                stroke={getRiskBorderColor(rect.utxo.privacyRisk)}
                strokeWidth={isSelected ? 3 : 2}
                rx={3}
                className="transition-all duration-200"
                style={{
                  filter: isSelected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none'
                }}
              />
              
              {/* Text content - only show if rectangle is large enough */}
              {rect.width > 60 && rect.height > 40 && (
                <g>
                  {/* BTC Amount */}
                  <text
                    x={rect.x + rect.width / 2}
                    y={rect.y + rect.height / 2 - 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-gray-800 text-sm font-bold"
                    style={{ 
                      fontSize: Math.min(14, rect.width / 8, rect.height / 4)
                    }}
                  >
                    {formatBTC(rect.utxo.amount, { trimZeros: true, maxDecimals: 4 })}
                  </text>
                  
                  {/* Transaction ID - show if height allows */}
                  {rect.height > 60 && (
                    <text
                      x={rect.x + rect.width / 2}
                      y={rect.y + rect.height / 2 + 12}
                      textAnchor="middle"
                      className="fill-gray-600 text-xs"
                      style={{ 
                        fontSize: Math.min(10, rect.width / 12)
                      }}
                    >
                      {`${rect.utxo.txid.substring(0, 6)}...${rect.utxo.vout}`}
                    </text>
                  )}
                </g>
              )}
              
              {/* Small indicator for very small tiles */}
              {(rect.width <= 60 || rect.height <= 40) && rect.width > 20 && rect.height > 20 && (
                <circle
                  cx={rect.x + rect.width / 2}
                  cy={rect.y + rect.height / 2}
                  r={Math.min(rect.width, rect.height) / 6}
                  fill={getRiskBorderColor(rect.utxo.privacyRisk)}
                />
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Empty state */}
      {rectangles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <p className="text-muted-foreground text-lg">No UTXOs available for treemap visualization.</p>
        </div>
      )}
    </div>
  );
};
