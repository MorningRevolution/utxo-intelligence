import React, { useState, useEffect } from "react";
import { UTXO } from "@/types/utxo";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRiskColor, formatBTC } from "@/utils/utxo-utils";
import { TreemapTile } from "@/types/utxo-graph";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PrivacyTreemapProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  zoomLevel?: number;
}

export const PrivacyTreemap: React.FC<PrivacyTreemapProps> = ({
  utxos,
  onSelectUtxo,
  zoomLevel: initialZoomLevel = 1
}) => {
  const [localZoomLevel, setLocalZoomLevel] = useState(initialZoomLevel);
  const [tiles, setTiles] = useState<TreemapTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Handle zoom controls
  const handleZoomIn = () => {
    setLocalZoomLevel(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setLocalZoomLevel(prev => Math.max(0.5, prev - 0.2));
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

  // Generate treemap layout
  useEffect(() => {
    if (!utxos.length) return;

    // Group UTXOs by risk level
    const riskGroups: Record<string, UTXO[]> = {
      high: [],
      medium: [],
      low: []
    };

    utxos.forEach(utxo => {
      riskGroups[utxo.privacyRisk].push(utxo);
    });

    // Create tiles with hierarchical layout
    const newTiles: TreemapTile[] = [];
    
    // Calculate total amount for scaling
    const totalAmount = utxos.reduce((sum, utxo) => sum + utxo.amount, 0);
    
    // Squarified layout algorithm - returns layout coordinates for a group of items
    const layoutSquarified = (
      items: UTXO[], 
      x: number, 
      y: number, 
      width: number, 
      height: number
    ) => {
      if (items.length === 0) return;
      
      // Sort by amount (descending)
      const sortedItems = [...items].sort((a, b) => b.amount - a.amount);
      
      // Calculate total amount for this group
      const groupAmount = sortedItems.reduce((sum, utxo) => sum + utxo.amount, 0);
      
      // Implementation of squarified treemap algorithm
      // This is a simplified version that creates rows of similarly sized tiles
      let remainingItems = [...sortedItems];
      let remainingX = x;
      let remainingY = y;
      let remainingWidth = width;
      let remainingHeight = height;
      
      while (remainingItems.length > 0) {
        const row: UTXO[] = [];
        let rowAmount = 0;
        
        // Decide which direction to layout - use the shorter dimension
        const isHorizontal = remainingWidth < remainingHeight;
        const availableLength = isHorizontal ? remainingHeight : remainingWidth;
        let bestAspectRatio = Infinity;
        
        // Add items to row until aspect ratio starts to get worse
        for (let i = 0; i < remainingItems.length; i++) {
          const currentItem = remainingItems[i];
          const potentialRow = [...row, currentItem];
          const rowPlusItemAmount = rowAmount + currentItem.amount;
          
          if (rowPlusItemAmount === 0) continue;
          
          // Calculate the aspect ratio if we add this item
          const rowLength = (rowPlusItemAmount / groupAmount) * availableLength;
          const rowBreadth = isHorizontal ? remainingWidth : remainingHeight;
          
          if (rowLength === 0) continue;
          
          const maxItemSize = Math.max(...potentialRow.map(item => item.amount));
          const minItemSize = Math.min(...potentialRow.map(item => item.amount));
          
          // Aspect ratio is the max of width/height and height/width
          const aspectRatio = Math.max(
            (rowBreadth * rowBreadth * maxItemSize) / (rowLength * rowLength),
            (rowLength * rowLength) / (rowBreadth * rowBreadth * minItemSize)
          );
          
          if (i === 0 || aspectRatio < bestAspectRatio) {
            bestAspectRatio = aspectRatio;
            row.push(currentItem);
            rowAmount += currentItem.amount;
            remainingItems.splice(i, 1);
            i--; // Adjust index since we removed an item
          } else {
            break; // Stop if adding more items makes the aspect ratio worse
          }
        }
        
        if (row.length === 0) break; // Avoid infinite loops
        
        // Layout the current row
        const rowRatio = rowAmount / groupAmount;
        const rowLength = isHorizontal ? 
                         Math.min(remainingHeight, rowRatio * availableLength) : 
                         Math.min(remainingWidth, rowRatio * availableLength);
        
        let currentPos = isHorizontal ? remainingY : remainingX;
        
        // Position each item in the row
        row.forEach(item => {
          const itemRatio = item.amount / rowAmount;
          const itemLength = itemRatio * rowLength;
          
          let tileX, tileY, tileWidth, tileHeight;
          
          if (isHorizontal) {
            // Layout horizontally (rows)
            tileX = remainingX;
            tileY = currentPos;
            tileWidth = remainingWidth;
            tileHeight = itemLength;
            currentPos += itemLength;
          } else {
            // Layout vertically (columns)
            tileX = currentPos;
            tileY = remainingY;
            tileWidth = itemLength;
            tileHeight = remainingHeight;
            currentPos += itemLength;
          }
          
          // Add tile with calculated position and size
          newTiles.push({
            id: `${item.txid}-${item.vout}`,
            name: `${item.txid.substring(0, 8)}...`,
            value: item.amount,
            displaySize: Math.sqrt(item.amount / totalAmount) * 100,
            color: getRiskColor(item.privacyRisk),
            data: item,
            x: tileX,
            y: tileY,
            width: tileWidth,
            height: tileHeight
          });
        });
        
        // Update remaining space
        if (isHorizontal) {
          remainingY += rowLength;
          remainingHeight -= rowLength;
        } else {
          remainingX += rowLength;
          remainingWidth -= rowLength;
        }
      }
    };
    
    // Calculate section heights based on amount proportions
    const highRiskTotal = riskGroups.high.reduce((sum, u) => sum + u.amount, 0);
    const mediumRiskTotal = riskGroups.medium.reduce((sum, u) => sum + u.amount, 0);
    const lowRiskTotal = riskGroups.low.reduce((sum, u) => sum + u.amount, 0);
    
    const totalHeight = containerSize.height - 40; // Account for padding
    const totalWidth = containerSize.width - 40;
    
    // Ensure minimum height for each section based on their ratio with a minimum value
    const totalRiskAmount = highRiskTotal + mediumRiskTotal + lowRiskTotal;
    
    // Layout each risk section with proper proportional sizes
    let yOffset = 20;
    
    // Only create sections for risk levels that have data
    if (riskGroups.high.length > 0) {
      const highHeight = Math.max(50, (highRiskTotal / totalRiskAmount) * totalHeight);
      layoutSquarified(
        riskGroups.high, 
        20, 
        yOffset, 
        totalWidth, 
        highHeight
      );
      yOffset += highHeight + 5; // Small gap between sections
    }
    
    if (riskGroups.medium.length > 0) {
      const mediumHeight = Math.max(50, (mediumRiskTotal / totalRiskAmount) * totalHeight);
      layoutSquarified(
        riskGroups.medium, 
        20, 
        yOffset, 
        totalWidth, 
        mediumHeight
      );
      yOffset += mediumHeight + 5;
    }
    
    if (riskGroups.low.length > 0) {
      const lowHeight = Math.max(50, (lowRiskTotal / totalRiskAmount) * totalHeight);
      layoutSquarified(
        riskGroups.low, 
        20, 
        yOffset, 
        totalWidth, 
        lowHeight
      );
    }
    
    setTiles(newTiles);
  }, [utxos, containerSize]);

  // Handle tile selection
  const handleTileClick = (tile: TreemapTile) => {
    if (onSelectUtxo) {
      if (selectedTile === tile.id) {
        setSelectedTile(null);
        onSelectUtxo(null);
      } else {
        setSelectedTile(tile.id);
        onSelectUtxo(tile.data);
      }
    }
  };

  return (
    <div className="relative h-full w-full bg-background" ref={containerRef}>
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-xs px-2 bg-background/80 rounded">
          {Math.round(localZoomLevel * 100)}%
        </span>
        
        <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Risk level labels */}
      <div className="absolute top-2 left-4 flex flex-col gap-1 z-10">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <span className="text-xs font-medium">High Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-xs font-medium">Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-xs font-medium">Low Risk</span>
        </div>
      </div>
      
      {/* SVG Treemap */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
        style={{
          transform: `scale(${localZoomLevel})`,
          transformOrigin: '0 0',
          transition: 'transform 0.2s ease'
        }}
      >
        {/* Render tiles */}
        {tiles.map(tile => (
          <TooltipProvider key={tile.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <g 
                  onClick={() => handleTileClick(tile)}
                  onMouseEnter={() => setHoveredTile(tile.id)}
                  onMouseLeave={() => setHoveredTile(null)}
                  className="cursor-pointer transition-opacity duration-200"
                  style={{ opacity: hoveredTile && hoveredTile !== tile.id ? 0.7 : 1 }}
                >
                  <rect
                    x={tile.x}
                    y={tile.y}
                    width={tile.width}
                    height={tile.height}
                    fill={tile.color}
                    stroke={selectedTile === tile.id ? "#ffffff" : "rgba(255,255,255,0.2)"}
                    strokeWidth={selectedTile === tile.id ? 2 : 1}
                    rx={2}
                    className="transition-all duration-200"
                  />
                  
                  {/* Improved label visibility - add text background for contrast */}
                  {tile.width > 40 && tile.height > 25 && (
                    <g>
                      {/* Semi-transparent background for better text contrast */}
                      <rect
                        x={tile.x + 2}
                        y={tile.y + 2}
                        width={tile.width - 4}
                        height={tile.height > 45 ? 36 : 18}
                        rx={2}
                        fill="rgba(0,0,0,0.5)"
                        opacity={0.7}
                      />
                      
                      {/* Amount label - always visible if space allows */}
                      <text
                        x={tile.x + 5}
                        y={tile.y + 15}
                        className="fill-white text-xs font-medium"
                        style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}
                      >
                        {formatBTC(tile.value, { trimZeros: true, maxDecimals: 5 })}
                      </text>
                      
                      {/* ID label - shown only for larger tiles */}
                      {tile.height > 45 && tile.width > 80 && (
                        <text
                          x={tile.x + 5}
                          y={tile.y + 30}
                          className="fill-white text-xs opacity-80"
                          style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}
                        >
                          {tile.name}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              </TooltipTrigger>
              <TooltipContent className="p-2">
                <div className="flex flex-col gap-1">
                  <div className="font-medium">UTXO {tile.name}</div>
                  <div className="font-mono">{formatBTC(tile.value)} BTC</div>
                  <div className="text-xs">
                    Risk: <span className={
                      tile.data.privacyRisk === 'high' ? 'text-red-500' : 
                      tile.data.privacyRisk === 'medium' ? 'text-amber-500' : 
                      'text-emerald-500'
                    }>
                      {tile.data.privacyRisk.toUpperCase()}
                    </span>
                  </div>
                  {tile.data.tags.length > 0 && (
                    <div className="text-xs mt-1">
                      Tags: {tile.data.tags.join(", ")}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </svg>
      
      {/* Empty state */}
      {tiles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <p className="text-muted-foreground text-lg">No UTXOs available for treemap visualization.</p>
        </div>
      )}
    </div>
  );
};
