
import React, { useState, useEffect } from "react";
import { UTXO } from "@/types/utxo";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRiskColor, formatBTC } from "@/utils/utxo-utils";
import { TreemapTile } from "@/types/utxo-graph";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

interface PrivacyTreemapProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  initialZoomLevel?: number;
}

export const PrivacyTreemap: React.FC<PrivacyTreemapProps> = ({
  utxos,
  onSelectUtxo,
  initialZoomLevel = 1
}) => {
  const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
  const [tiles, setTiles] = useState<TreemapTile[]>([]);
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

  // Generate treemap layout - squarified algorithm
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
    
    // Layout algorithm (squarified treemap)
    const layoutTreemap = (
      items: UTXO[], 
      x: number, 
      y: number, 
      width: number, 
      height: number,
      riskLevel: 'high' | 'medium' | 'low'
    ) => {
      if (items.length === 0) return;
      
      // Sort by amount (descending)
      const sortedItems = [...items].sort((a, b) => b.amount - a.amount);
      
      // Calculate group total
      const groupTotal = sortedItems.reduce((sum, utxo) => sum + utxo.amount, 0);
      
      // Squarified treemap layout algorithm
      const layoutRow = (
        row: UTXO[],
        rowTotal: number,
        currentX: number,
        currentY: number,
        remainingWidth: number,
        remainingHeight: number
      ) => {
        // Determine row orientation (horizontal or vertical)
        const isHorizontal = remainingWidth >= remainingHeight;
        
        // Calculate scale factor based on row's proportion of total
        const scaleFactor = isHorizontal ? 
          remainingHeight / groupTotal :
          remainingWidth / groupTotal;
        
        // Calculate row width/height
        const rowSize = rowTotal * scaleFactor;
        
        // Layout the row
        let offset = 0;
        row.forEach(utxo => {
          const tileSize = utxo.amount * scaleFactor;
          
          let tileWidth: number, tileHeight: number, tileX: number, tileY: number;
          
          if (isHorizontal) {
            tileWidth = tileSize * remainingWidth / rowSize;
            tileHeight = rowSize;
            tileX = currentX + offset;
            tileY = currentY;
            offset += tileWidth;
          } else {
            tileWidth = rowSize;
            tileHeight = tileSize * remainingHeight / rowSize;
            tileX = currentX;
            tileY = currentY + offset;
            offset += tileHeight;
          }
          
          // Add tile with correct position and size
          newTiles.push({
            id: `${utxo.txid}-${utxo.vout}`,
            name: `${utxo.txid.substring(0, 8)}...`,
            value: utxo.amount,
            displaySize: Math.sqrt(utxo.amount / totalAmount) * 100,
            color: getRiskColor(utxo.privacyRisk),
            data: utxo,
            x: tileX,
            y: tileY,
            width: tileWidth,
            height: tileHeight
          });
        });
        
        // Return the remaining rectangle
        if (isHorizontal) {
          return {
            x: currentX,
            y: currentY + rowSize,
            width: remainingWidth,
            height: remainingHeight - rowSize
          };
        } else {
          return {
            x: currentX + rowSize,
            y: currentY,
            width: remainingWidth - rowSize,
            height: remainingHeight
          };
        }
      };
      
      // Calculate worst aspect ratio for a given row
      const worstAspectRatio = (row: UTXO[], rowTotal: number, width: number, height: number) => {
        if (row.length === 0) return Infinity;
        if (width === 0 || height === 0) return Infinity;
        
        // Determine row orientation (horizontal or vertical)
        const isHorizontal = width >= height;
        
        // Calculate scale factor
        const scaleFactor = isHorizontal ? 
          height / groupTotal :
          width / groupTotal;
        
        // Calculate row size
        const rowSize = rowTotal * scaleFactor;
        
        // Calculate min and max aspect ratios in row
        let minRatio = Infinity;
        let maxRatio = 0;
        
        row.forEach(utxo => {
          let tileWidth, tileHeight;
          
          if (isHorizontal) {
            tileWidth = utxo.amount * scaleFactor * width / rowSize;
            tileHeight = rowSize;
          } else {
            tileWidth = rowSize;
            tileHeight = utxo.amount * scaleFactor * height / rowSize;
          }
          
          // Calculate aspect ratio (always >= 1)
          const ratio = Math.max(tileWidth / tileHeight, tileHeight / tileWidth);
          
          minRatio = Math.min(minRatio, ratio);
          maxRatio = Math.max(maxRatio, ratio);
        });
        
        // Use the worst (highest) aspect ratio
        return maxRatio;
      };
      
      // Squarified algorithm
      const squarify = (
        remaining: UTXO[],
        row: UTXO[] = [],
        rowTotal: number = 0,
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        if (remaining.length === 0) {
          // Layout final row
          if (row.length > 0) {
            layoutRow(row, rowTotal, x, y, width, height);
          }
          return;
        }
        
        // Current item
        const utxo = remaining[0];
        const newRowTotal = rowTotal + utxo.amount;
        const newRow = [...row, utxo];
        
        // Calculate worst aspect ratio with and without this item
        const currentWorst = row.length > 0 ? 
          worstAspectRatio(row, rowTotal, width, height) : 
          Infinity;
        
        const newWorst = worstAspectRatio(newRow, newRowTotal, width, height);
        
        if (row.length > 0 && newWorst > currentWorst) {
          // Adding the item makes the aspect ratio worse, layout current row
          const remaining_rect = layoutRow(row, rowTotal, x, y, width, height);
          
          // Process remaining items in the remaining rectangle
          squarify(
            remaining,
            [],
            0,
            remaining_rect.x,
            remaining_rect.y,
            remaining_rect.width,
            remaining_rect.height
          );
        } else {
          // Continue with the current row
          squarify(
            remaining.slice(1),
            newRow,
            newRowTotal,
            x,
            y,
            width,
            height
          );
        }
      };
      
      // Start squarified layout
      squarify(sortedItems, [], 0, x, y, width, height);
    };
    
    // Calculate section heights based on amount proportions
    const highRiskTotal = riskGroups.high.reduce((sum, u) => sum + u.amount, 0);
    const mediumRiskTotal = riskGroups.medium.reduce((sum, u) => sum + u.amount, 0);
    const lowRiskTotal = riskGroups.low.reduce((sum, u) => sum + u.amount, 0);
    
    const totalHeight = containerSize.height - 40; // Account for padding
    const highHeight = Math.max(50, (highRiskTotal / totalAmount) * totalHeight);
    const mediumHeight = Math.max(50, (mediumRiskTotal / totalAmount) * totalHeight);
    const lowHeight = Math.max(50, (lowRiskTotal / totalAmount) * totalHeight);
    
    // Layout each risk section
    let yOffset = 20;
    
    if (riskGroups.high.length > 0) {
      layoutTreemap(
        riskGroups.high, 
        20, 
        yOffset, 
        containerSize.width - 40, 
        highHeight,
        'high'
      );
      yOffset += highHeight + 10;
    }
    
    if (riskGroups.medium.length > 0) {
      layoutTreemap(
        riskGroups.medium, 
        20, 
        yOffset, 
        containerSize.width - 40, 
        mediumHeight,
        'medium'
      );
      yOffset += mediumHeight + 10;
    }
    
    if (riskGroups.low.length > 0) {
      layoutTreemap(
        riskGroups.low, 
        20, 
        yOffset, 
        containerSize.width - 40, 
        lowHeight,
        'low'
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
  
  // Format date for tooltip
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return "Invalid Date";
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
          transform: `scale(${zoomLevel})`,
          transformOrigin: '0 0',
          transition: 'transform 0.2s ease'
        }}
      >
        <defs>
          <filter id="treemap-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
          </filter>
        </defs>
        
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
                    style={{ filter: hoveredTile === tile.id ? 'url(#treemap-shadow)' : 'none' }}
                  />
                  
                  {/* Show text for tiles large enough */}
                  {tile.width > 60 && tile.height > 30 && (
                    <>
                      <text
                        x={tile.x + 5}
                        y={tile.y + 15}
                        className="fill-white text-xs font-medium"
                        style={{ 
                          textShadow: "0px 1px 2px rgba(0,0,0,0.5)",
                          pointerEvents: "none" 
                        }}
                      >
                        {formatBTC(tile.value, { trimZeros: true, maxDecimals: 5 })}
                      </text>
                      
                      {tile.height > 45 && (
                        <text
                          x={tile.x + 5}
                          y={tile.y + 30}
                          className="fill-white text-xs opacity-80"
                          style={{ 
                            textShadow: "0px 1px 2px rgba(0,0,0,0.5)",
                            pointerEvents: "none" 
                          }}
                        >
                          {tile.name}
                        </text>
                      )}
                    </>
                  )}
                </g>
              </TooltipTrigger>
              <TooltipContent side="top" className="z-50">
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {formatBTC(tile.data.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[250px]">
                    {tile.data.txid}:{tile.data.vout}
                  </p>
                  <div className="text-xs pt-1">
                    <p><span className="font-medium">Date:</span> {formatDate(tile.data.acquisitionDate)}</p>
                    {tile.data.walletName && <p><span className="font-medium">Wallet:</span> {tile.data.walletName}</p>}
                    {tile.data.address && <p><span className="font-medium">Address:</span> {tile.data.address}</p>}
                    {tile.data.notes && <p><span className="font-medium">Notes:</span> {tile.data.notes}</p>}
                  </div>
                  <div className="pt-1">
                    <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${
                      tile.data.privacyRisk === 'high' ? 'bg-red-100 text-red-800' : 
                      tile.data.privacyRisk === 'medium' ? 'bg-amber-100 text-amber-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {tile.data.privacyRisk.toUpperCase()} RISK
                    </span>
                  </div>
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
