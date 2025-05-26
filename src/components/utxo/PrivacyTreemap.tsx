
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

  // Mempool-style rectangle packing algorithm
  useEffect(() => {
    if (!utxos.length) return;

    // Sort UTXOs by amount (largest first) for optimal packing
    const sortedUtxos = [...utxos].sort((a, b) => b.amount - a.amount);
    
    // Calculate total amount for proportional sizing
    const totalAmount = sortedUtxos.reduce((sum, utxo) => sum + utxo.amount, 0);
    
    const newRectangles: Rectangle[] = [];
    
    // Container dimensions with padding
    const padding = 4;
    const availableWidth = containerSize.width - 40;
    const availableHeight = containerSize.height - 40;
    const totalArea = availableWidth * availableHeight * 0.95; // Use 95% of available space
    
    // Squarified treemap algorithm
    interface PackingRow {
      rectangles: Rectangle[];
      totalArea: number;
      bounds: { x: number; y: number; width: number; height: number };
    }
    
    const calculateAspectRatio = (areas: number[], width: number): number => {
      const sum = areas.reduce((a, b) => a + b, 0);
      const maxArea = Math.max(...areas);
      const minArea = Math.min(...areas);
      return Math.max((width * width * maxArea) / (sum * sum), (sum * sum) / (width * width * minArea));
    };
    
    const layoutRow = (row: number[], x: number, y: number, width: number, height: number): Rectangle[] => {
      const sum = row.reduce((a, b) => a + b, 0);
      const rects: Rectangle[] = [];
      let offset = 0;
      
      const isHorizontal = width >= height;
      
      row.forEach((area, index) => {
        const utxo = sortedUtxos[rectangles.length + index];
        if (!utxo) return;
        
        if (isHorizontal) {
          const rectHeight = height;
          const rectWidth = (area / sum) * width;
          rects.push({
            x: x + offset,
            y: y,
            width: rectWidth - padding,
            height: rectHeight - padding,
            utxo
          });
          offset += rectWidth;
        } else {
          const rectWidth = width;
          const rectHeight = (area / sum) * height;
          rects.push({
            x: x,
            y: y + offset,
            width: rectWidth - padding,
            height: rectHeight - padding,
            utxo
          });
          offset += rectHeight;
        }
      });
      
      return rects;
    };
    
    // Calculate areas proportional to BTC amounts
    const areas = sortedUtxos.map(utxo => (utxo.amount / totalAmount) * totalArea);
    
    const rectangles: Rectangle[] = [];
    let remainingAreas = [...areas];
    let currentBounds = { x: 20, y: 20, width: availableWidth, height: availableHeight };
    
    while (remainingAreas.length > 0) {
      let row: number[] = [remainingAreas[0]];
      let bestAspectRatio = calculateAspectRatio(row, Math.min(currentBounds.width, currentBounds.height));
      
      // Try adding more rectangles to the row
      for (let i = 1; i < remainingAreas.length; i++) {
        const newRow = [...row, remainingAreas[i]];
        const newAspectRatio = calculateAspectRatio(newRow, Math.min(currentBounds.width, currentBounds.height));
        
        if (newAspectRatio < bestAspectRatio) {
          row = newRow;
          bestAspectRatio = newAspectRatio;
        } else {
          break;
        }
      }
      
      // Layout the current row
      const rowRects = layoutRow(row, currentBounds.x, currentBounds.y, currentBounds.width, currentBounds.height);
      rectangles.push(...rowRects);
      
      // Update remaining areas and bounds
      remainingAreas = remainingAreas.slice(row.length);
      
      if (remainingAreas.length > 0) {
        const rowSum = row.reduce((a, b) => a + b, 0);
        const remainingSum = remainingAreas.reduce((a, b) => a + b, 0);
        
        if (currentBounds.width >= currentBounds.height) {
          // Horizontal split
          const usedWidth = (rowSum / (rowSum + remainingSum)) * currentBounds.width;
          currentBounds = {
            x: currentBounds.x + usedWidth,
            y: currentBounds.y,
            width: currentBounds.width - usedWidth,
            height: currentBounds.height
          };
        } else {
          // Vertical split
          const usedHeight = (rowSum / (rowSum + remainingSum)) * currentBounds.height;
          currentBounds = {
            x: currentBounds.x,
            y: currentBounds.y + usedHeight,
            width: currentBounds.width,
            height: currentBounds.height - usedHeight
          };
        }
      }
    }
    
    setRectangles(rectangles);
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
