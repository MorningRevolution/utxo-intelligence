
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

  // Enhanced rectangle packing algorithm for mempool-style layout
  useEffect(() => {
    if (!utxos.length) return;

    // Sort UTXOs by amount (largest first) for optimal packing
    const sortedUtxos = [...utxos].sort((a, b) => b.amount - a.amount);
    
    // Calculate total amount for proportional sizing
    const totalAmount = sortedUtxos.reduce((sum, utxo) => sum + utxo.amount, 0);
    
    const newTiles: TreemapTile[] = [];
    
    // Enhanced rectangle packing with better space utilization
    const padding = 1;
    const availableWidth = containerSize.width - 40;
    const availableHeight = containerSize.height - 40;
    const totalArea = availableWidth * availableHeight;
    
    // Calculate optimal aspect ratio for rectangles
    const targetAspectRatio = 1.618; // Golden ratio for pleasing proportions
    
    // Bin packing data structure
    interface PackingNode {
      x: number;
      y: number;
      width: number;
      height: number;
      used: boolean;
      right?: PackingNode;
      down?: PackingNode;
    }
    
    const root: PackingNode = {
      x: 20,
      y: 20,
      width: availableWidth,
      height: availableHeight,
      used: false
    };
    
    const findNode = (node: PackingNode, width: number, height: number): PackingNode | null => {
      if (node.used) {
        return findNode(node.right!, width, height) || findNode(node.down!, width, height);
      } else if (width <= node.width && height <= node.height) {
        return node;
      } else {
        return null;
      }
    };
    
    const splitNode = (node: PackingNode, width: number, height: number): PackingNode => {
      node.used = true;
      node.down = {
        x: node.x,
        y: node.y + height,
        width: node.width,
        height: node.height - height,
        used: false
      };
      node.right = {
        x: node.x + width,
        y: node.y,
        width: node.width - width,
        height: height,
        used: false
      };
      return node;
    };
    
    sortedUtxos.forEach(utxo => {
      // Calculate proportional area
      const proportion = utxo.amount / totalAmount;
      const tileArea = proportion * totalArea * 0.9; // Leave some space for padding
      
      // Calculate optimal dimensions maintaining aspect ratio
      let tileWidth = Math.sqrt(tileArea * targetAspectRatio);
      let tileHeight = tileArea / tileWidth;
      
      // Apply size constraints for visibility and aesthetics
      const minSize = 20;
      const maxSize = Math.min(availableWidth * 0.4, availableHeight * 0.4);
      
      tileWidth = Math.max(minSize, Math.min(maxSize, tileWidth));
      tileHeight = Math.max(minSize, Math.min(maxSize, tileHeight));
      
      // Find position using bin packing
      const node = findNode(root, tileWidth + padding, tileHeight + padding);
      
      if (node) {
        const splitResult = splitNode(node, tileWidth + padding, tileHeight + padding);
        
        newTiles.push({
          id: `${utxo.txid}-${utxo.vout}`,
          name: `${utxo.txid.substring(0, 6)}...`,
          value: utxo.amount,
          displaySize: Math.sqrt(utxo.amount / totalAmount) * 100,
          color: getRiskColor(utxo.privacyRisk),
          data: utxo,
          x: splitResult.x,
          y: splitResult.y,
          width: tileWidth,
          height: tileHeight
        });
      }
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
              stroke={selectedTile === tile.id ? "#ffffff" : "rgba(255,255,255,0.3)"}
              strokeWidth={selectedTile === tile.id ? 3 : 1}
              rx={3}
              className="transition-all duration-200"
            />
            
            {/* Enhanced text visibility - only show text for tiles large enough */}
            {tile.width > 50 && tile.height > 25 && (
              <>
                {/* Background for text readability */}
                <rect
                  x={tile.x + 2}
                  y={tile.y + 2}
                  width={tile.width - 4}
                  height={tile.height - 4}
                  fill="rgba(0,0,0,0.1)"
                  rx={2}
                />
                
                {/* BTC Amount - primary text */}
                <text
                  x={tile.x + tile.width / 2}
                  y={tile.y + tile.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white text-sm font-bold"
                  style={{ 
                    fontSize: Math.min(14, tile.width / 8, tile.height / 3),
                    filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))'
                  }}
                >
                  {formatBTC(tile.value, { trimZeros: true, maxDecimals: 5 })}
                </text>
                
                {/* Transaction ID - secondary text for larger tiles */}
                {tile.height > 40 && (
                  <text
                    x={tile.x + tile.width / 2}
                    y={tile.y + 15}
                    textAnchor="middle"
                    className="fill-white text-xs opacity-90"
                    style={{ 
                      fontSize: Math.min(10, tile.width / 12),
                      filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))'
                    }}
                  >
                    {tile.name}
                  </text>
                )}
              </>
            )}
            
            {/* Small indicator for very small tiles */}
            {(tile.width <= 50 || tile.height <= 25) && tile.width > 10 && tile.height > 10 && (
              <circle
                cx={tile.x + tile.width / 2}
                cy={tile.y + tile.height / 2}
                r={Math.min(tile.width, tile.height) / 4}
                fill="rgba(255,255,255,0.8)"
              />
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
