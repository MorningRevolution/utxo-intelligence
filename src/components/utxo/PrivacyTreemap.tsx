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

export const PrivacyTreemap: React.FC<PrivacyTreemapProps> = ({
  utxos,
  onSelectUtxo,
  zoomLevel: initialZoomLevel = 1
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

  // Generate mempool-style treemap layout
  useEffect(() => {
    if (!utxos.length) return;

    // Sort UTXOs by amount (largest first) for better packing
    const sortedUtxos = [...utxos].sort((a, b) => b.amount - a.amount);
    
    // Calculate total amount for proportional sizing
    const totalAmount = sortedUtxos.reduce((sum, utxo) => sum + utxo.amount, 0);
    
    const newTiles: TreemapTile[] = [];
    
    // Simple rectangle packing algorithm for mempool-style layout
    const padding = 2;
    const availableWidth = containerSize.width - 40; // Account for padding
    const availableHeight = containerSize.height - 40;
    
    let currentX = 20;
    let currentY = 20;
    let rowHeight = 0;
    
    sortedUtxos.forEach(utxo => {
      // Calculate tile size proportional to BTC amount
      const proportion = utxo.amount / totalAmount;
      const tileArea = proportion * availableWidth * availableHeight;
      
      // Try to maintain reasonable aspect ratio
      const aspectRatio = 1.5; // Width to height ratio
      let tileWidth = Math.sqrt(tileArea * aspectRatio);
      let tileHeight = tileArea / tileWidth;
      
      // Minimum and maximum sizes for visibility
      tileWidth = Math.max(30, Math.min(200, tileWidth));
      tileHeight = Math.max(20, Math.min(150, tileHeight));
      
      // Check if we need to start a new row
      if (currentX + tileWidth > availableWidth + 20) {
        currentX = 20;
        currentY += rowHeight + padding;
        rowHeight = 0;
      }
      
      // Make sure we don't exceed container height
      if (currentY + tileHeight > availableHeight + 20) {
        // Start a new column or reduce size
        const scaleFactor = Math.min(1, (availableHeight - currentY + 20) / tileHeight);
        tileHeight *= scaleFactor;
        tileWidth *= scaleFactor;
      }
      
      newTiles.push({
        id: `${utxo.txid}-${utxo.vout}`,
        name: `${utxo.txid.substring(0, 8)}...`,
        value: utxo.amount,
        displaySize: Math.sqrt(utxo.amount / totalAmount) * 100,
        color: getRiskColor(utxo.privacyRisk),
        data: utxo,
        x: currentX,
        y: currentY,
        width: tileWidth,
        height: tileHeight
      });
      
      // Update position for next tile
      currentX += tileWidth + padding;
      rowHeight = Math.max(rowHeight, tileHeight);
    });
    
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
        {/* Render tiles */}
        {tiles.map(tile => (
          <g 
            key={tile.id}
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
            
            {/* Only show text for tiles large enough */}
            {tile.width > 60 && tile.height > 30 && (
              <>
                <text
                  x={tile.x + 5}
                  y={tile.y + 15}
                  className="fill-white text-xs font-medium"
                >
                  {formatBTC(tile.value, { trimZeros: true, maxDecimals: 5 })}
                </text>
                
                {tile.height > 45 && (
                  <text
                    x={tile.x + 5}
                    y={tile.y + 30}
                    className="fill-white text-xs opacity-80"
                  >
                    {tile.name}
                  </text>
                )}
              </>
            )}
          </g>
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
