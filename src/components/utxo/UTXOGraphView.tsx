
import React, { useEffect, useRef, useState, useMemo } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { UTXO } from "@/types/utxo";
import { formatBTC, getRiskColor, getRiskBadgeStyle, getRiskTextColor } from "@/utils/utxo-utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tooltip } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Filter, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRange } from "react-day-picker";

interface UTXOGraphViewProps {
  utxos: UTXO[];
  onSelectUtxo: (utxo: UTXO | null) => void;
  onViewChange: (view: "visual") => void;
}

interface GraphNode {
  id: string;
  name: string;
  val: number; // size
  color: string;
  type: "utxo" | "transaction" | "address";
  data?: any; // Original data
  group?: string;
  riskLevel?: "low" | "medium" | "high";
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  color?: string;
  isChangeOutput?: boolean;
  riskLevel?: "low" | "medium" | "high";
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const UTXOGraphView: React.FC<UTXOGraphViewProps> = ({ utxos, onSelectUtxo, onViewChange }) => {
  const graphRef = useRef<ForceGraphMethods>();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [highlightPrivacyIssues, setHighlightPrivacyIssues] = useState(false);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Extract all available tags and wallets for filters
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    utxos.forEach(utxo => {
      utxo.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [utxos]);

  const availableWallets = useMemo(() => {
    const wallets = new Set<string>();
    utxos.forEach(utxo => {
      wallets.add(utxo.walletName || "Default Wallet");
    });
    return Array.from(wallets);
  }, [utxos]);

  // Construct the graph data
  useEffect(() => {
    // Filter UTXOs based on search and filters
    let filteredUtxos = utxos;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredUtxos = filteredUtxos.filter(utxo => 
        utxo.txid.toLowerCase().includes(term) ||
        utxo.address.toLowerCase().includes(term) ||
        (utxo.notes && utxo.notes.toLowerCase().includes(term)) ||
        utxo.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    if (selectedTags.length > 0) {
      filteredUtxos = filteredUtxos.filter(utxo => 
        selectedTags.some(tag => utxo.tags.includes(tag))
      );
    }
    
    if (selectedWallets.length > 0) {
      filteredUtxos = filteredUtxos.filter(utxo => 
        selectedWallets.includes(utxo.walletName || "Default Wallet")
      );
    }
    
    if (dateRange && dateRange.from) {
      const fromDate = new Date(dateRange.from);
      filteredUtxos = filteredUtxos.filter(utxo => {
        const utxoDate = utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : null;
        return utxoDate && utxoDate >= fromDate;
      });
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        filteredUtxos = filteredUtxos.filter(utxo => {
          const utxoDate = utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : null;
          return utxoDate && utxoDate <= toDate;
        });
      }
    }
    
    // Limit to a reasonable number for performance
    const limitedUtxos = filteredUtxos.slice(0, 100);
    
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();
    const addedTxs = new Set<string>();
    
    // First pass - add UTXO nodes
    limitedUtxos.forEach(utxo => {
      const nodeId = `utxo-${utxo.txid}-${utxo.vout}`;
      const walletName = utxo.walletName || "Default Wallet";
      
      // Assign color based on risk level
      let color;
      switch (utxo.privacyRisk) {
        case "high": color = "#ea384c"; break;
        case "medium": color = "#f97316"; break;
        case "low": color = "#10b981"; break;
        default: color = "#9b87f5"; // default purple
      }
      
      const node: GraphNode = {
        id: nodeId,
        name: `UTXO ${utxo.txid.substring(0, 6)}...${utxo.vout}`,
        val: 1 + (utxo.amount * 5), // Size based on amount
        color: color,
        type: "utxo",
        data: utxo,
        group: walletName,
        riskLevel: utxo.privacyRisk
      };
      
      nodes.push(node);
      nodeMap.set(nodeId, node);
      
      // Add transaction node if not already added
      if (!addedTxs.has(utxo.txid)) {
        addedTxs.add(utxo.txid);
        const txNodeId = `tx-${utxo.txid}`;
        const txNode: GraphNode = {
          id: txNodeId,
          name: `TX ${utxo.txid.substring(0, 8)}...`,
          val: 1.5, // slightly larger
          color: "#8E9196", // neutral gray
          type: "transaction",
          data: { txid: utxo.txid }
        };
        nodes.push(txNode);
        nodeMap.set(txNodeId, txNode);
      }
      
      // Add addresses as nodes
      if (utxo.receiverAddress) {
        const addrNodeId = `addr-${utxo.receiverAddress}`;
        if (!nodeMap.has(addrNodeId)) {
          const addrNode: GraphNode = {
            id: addrNodeId,
            name: `${utxo.receiverAddress.substring(0, 8)}...`,
            val: 0.8, // smaller
            color: "#E5DEFF", // soft purple
            type: "address",
            data: { address: utxo.receiverAddress }
          };
          nodes.push(addrNode);
          nodeMap.set(addrNodeId, addrNode);
        }
      }
      
      if (utxo.senderAddress) {
        const addrNodeId = `addr-${utxo.senderAddress}`;
        if (!nodeMap.has(addrNodeId)) {
          const addrNode: GraphNode = {
            id: addrNodeId,
            name: `${utxo.senderAddress.substring(0, 8)}...`,
            val: 0.8, // smaller
            color: "#E5DEFF", // soft purple
            type: "address",
            data: { address: utxo.senderAddress }
          };
          nodes.push(addrNode);
          nodeMap.set(addrNodeId, addrNode);
        }
      }
      
      // Connect UTXO to transaction
      const txNodeId = `tx-${utxo.txid}`;
      links.push({
        source: txNodeId,
        target: nodeId,
        value: 1,
        riskLevel: utxo.privacyRisk
      });
      
      // Connect addresses to UTXO
      if (utxo.receiverAddress) {
        const addrNodeId = `addr-${utxo.receiverAddress}`;
        links.push({
          source: nodeId,
          target: addrNodeId,
          value: 1,
          isChangeOutput: utxo.tags.includes("Change"),
          riskLevel: utxo.privacyRisk
        });
      }
      
      if (utxo.senderAddress) {
        const addrNodeId = `addr-${utxo.senderAddress}`;
        links.push({
          source: addrNodeId,
          target: txNodeId,
          value: 1,
          riskLevel: utxo.privacyRisk
        });
      }
    });
    
    // Create simulated links between related UTXOs to show traceable paths
    const processedUtxos = new Set<string>();
    
    limitedUtxos.forEach(utxo1 => {
      const utxo1Id = `${utxo1.txid}-${utxo1.vout}`;
      processedUtxos.add(utxo1Id);
      
      limitedUtxos.forEach(utxo2 => {
        const utxo2Id = `${utxo2.txid}-${utxo2.vout}`;
        if (processedUtxos.has(utxo2Id)) return; // Skip already processed pairs
        
        // Create links based on shared addresses, shared tags, or other privacy connections
        if (
          utxo1.senderAddress === utxo2.receiverAddress || 
          utxo1.receiverAddress === utxo2.senderAddress ||
          utxo1.address === utxo2.address ||
          (utxo1.senderAddress && utxo1.senderAddress === utxo2.senderAddress) ||
          (utxo1.receiverAddress && utxo1.receiverAddress === utxo2.receiverAddress)
        ) {
          // Address reuse privacy issue
          const highestRisk = utxo1.privacyRisk === "high" || utxo2.privacyRisk === "high" 
            ? "high" 
            : (utxo1.privacyRisk === "medium" || utxo2.privacyRisk === "medium" ? "medium" : "low");
            
          // Only add these links when highlighting privacy issues
          if (highlightPrivacyIssues) {
            links.push({
              source: `tx-${utxo1.txid}`,
              target: `tx-${utxo2.txid}`,
              value: 0.5, // thinner line
              color: "#ea384c", // privacy risk color
              riskLevel: highestRisk
            });
          }
        }
        
        // Check for shared tags
        const sharedTags = utxo1.tags.filter(tag => utxo2.tags.includes(tag));
        if (sharedTags.length > 0) {
          // Tag correlation privacy issue
          // Only add these links when highlighting privacy issues
          if (highlightPrivacyIssues) {
            links.push({
              source: `utxo-${utxo1.txid}-${utxo1.vout}`,
              target: `utxo-${utxo2.txid}-${utxo2.vout}`,
              value: 0.3, // very thin line
              color: "#f97316", // medium risk color
              riskLevel: "medium"
            });
          }
        }
      });
    });
    
    // Colorize links based on privacy risk level
    links.forEach(link => {
      if (link.isChangeOutput) {
        link.color = "#9b87f5"; // purple for change outputs
      } else if (link.riskLevel) {
        switch (link.riskLevel) {
          case "high": link.color = highlightPrivacyIssues ? "#ea384c" : "#ea384c80"; break;
          case "medium": link.color = highlightPrivacyIssues ? "#f97316" : "#f9731680"; break;
          case "low": link.color = "#10b981"; break;
          default: link.color = "#8E9196"; // neutral gray
        }
      }
    });
    
    setGraphData({ nodes, links });
  }, [utxos, searchTerm, selectedTags, selectedWallets, dateRange, highlightPrivacyIssues]);

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    
    if (node.type === "utxo" && node.data) {
      // Select this UTXO for detailed visualization
      onSelectUtxo(node.data);
      onViewChange("visual");
      
      toast({
        title: "UTXO Selected",
        description: `Showing details for UTXO ${node.data.txid.substring(0, 8)}...`,
      });
    } else if (node.type === "transaction") {
      // Open transaction in mempool.space
      window.open(`https://mempool.space/tx/${node.data.txid}`, '_blank');
    } else if (node.type === "address") {
      // Open address in mempool.space
      window.open(`https://mempool.space/address/${node.data.address}`, '_blank');
    }
  };

  // Handle node hover
  const handleNodeHover = (node: GraphNode | null) => {
    setHoveredNode(node);
    
    if (graphRef.current) {
      // Highlight connected nodes/links
      if (node) {
        const linkedNodeIds = graphData.links
          .filter(link => link.source === node.id || link.target === node.id)
          .flatMap(link => [
            typeof link.source === 'object' ? link.source.id : link.source,
            typeof link.target === 'object' ? link.target.id : link.target
          ]);
          
        graphRef.current.nodeColor((n: GraphNode) => 
          n === node || linkedNodeIds.includes(n.id) 
            ? n.color 
            : `rgba(150, 150, 150, 0.2)`
        );
        
        graphRef.current.linkColor((link) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          return (sourceId === node.id || targetId === node.id)
            ? (link.color || '#666')
            : 'rgba(150, 150, 150, 0.1)';
        });
        
        // Set link width based on connection to hovered node
        graphRef.current.linkWidth((link) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          return (sourceId === node.id || targetId === node.id) ? 2 : 0.5;
        });
      } else {
        // Reset colors when not hovering
        graphRef.current.nodeColor((n: GraphNode) => n.color);
        graphRef.current.linkColor((link) => link.color || '#666');
        graphRef.current.linkWidth((link) => link.value || 1);
      }
    }
  };

  // Node tooltip content
  const nodeTooltip = (node: GraphNode) => {
    if (node.type === "utxo" && node.data) {
      const utxo = node.data as UTXO;
      return (
        <div className="bg-background/95 p-2 rounded-md shadow-md border border-border max-w-[250px]">
          <div className="font-semibold">{utxo.txid.substring(0, 8)}...:{utxo.vout}</div>
          <div className="text-sm">{formatBTC(utxo.amount)}</div>
          <div className="text-xs">Wallet: {utxo.walletName || "Default"}</div>
          {utxo.acquisitionDate && (
            <div className="text-xs">Date: {new Date(utxo.acquisitionDate).toLocaleDateString()}</div>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {utxo.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[0.65rem]">{tag}</Badge>
            ))}
          </div>
          <div className={`mt-1 text-xs font-medium ${getRiskTextColor(utxo.privacyRisk)}`}>
            {utxo.privacyRisk.toUpperCase()} risk
          </div>
        </div>
      );
    } else if (node.type === "transaction") {
      return (
        <div className="bg-background/95 p-2 rounded-md shadow-md border border-border">
          <div>Transaction</div>
          <div className="text-xs">{node.data.txid}</div>
          <div className="text-[0.65rem] mt-1">Click to open in mempool.space</div>
        </div>
      );
    } else if (node.type === "address") {
      return (
        <div className="bg-background/95 p-2 rounded-md shadow-md border border-border">
          <div>Address</div>
          <div className="text-xs">{node.data.address}</div>
          <div className="text-[0.65rem] mt-1">Click to open in mempool.space</div>
        </div>
      );
    }
    return null;
  };

  // Link tooltip content
  const linkTooltip = (link: GraphLink) => {
    if (link.isChangeOutput) {
      return (
        <div className="bg-background/95 p-2 rounded-md shadow-md border border-border">
          <div>Change Output</div>
        </div>
      );
    }
    return null;
  };

  // Custom node rendering
  const nodeCanvasObject = (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12/globalScale;
    const nodeSize = node.val;
    
    // Draw node circle
    ctx.beginPath();
    ctx.fillStyle = node.color;
    ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
    ctx.fill();
    
    if (node === hoveredNode || node === selectedNode) {
      ctx.beginPath();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2/globalScale;
      ctx.arc(node.x!, node.y!, nodeSize + 1/globalScale, 0, 2 * Math.PI, false);
      ctx.stroke();
    }
    
    // Draw node label if close enough
    if (globalScale > 0.4) {
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText(label, node.x!, node.y!);
      
      // Add badge for UTXO type
      if (node.type === "utxo" && node.data?.tags?.includes("Change") && globalScale > 0.8) {
        const badgeText = "Change";
        const badgeWidth = ctx.measureText(badgeText).width + 4/globalScale;
        
        ctx.fillStyle = '#9b87f5';
        ctx.beginPath();
        ctx.roundRect(
          node.x! - badgeWidth/2, 
          node.y! + nodeSize + 2/globalScale, 
          badgeWidth, 
          fontSize, 
          3/globalScale
        );
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.fillText(
          badgeText, 
          node.x!, 
          node.y! + nodeSize + 2/globalScale + fontSize/2
        );
      }
    }
  };

  return (
    <div className="w-full" style={{ height: '70vh' }}>
      {/* Toolbar */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by txid, address, tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            prefixIcon={<Search className="h-4 w-4" />}
          />
        </div>
        
        <div className="flex gap-2">
          {/* Tag Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <span>Tags {selectedTags.length > 0 && `(${selectedTags.length})`}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Filter by Tag</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableTags.map((tag) => (
                    <div key={tag} className="flex items-center gap-2">
                      <Checkbox 
                        id={`tag-${tag}`}
                        checked={selectedTags.includes(tag)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTags([...selectedTags, tag]);
                          } else {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          }
                        }}
                      />
                      <label htmlFor={`tag-${tag}`} className="text-sm">{tag}</label>
                    </div>
                  ))}
                </div>
                {availableTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags available</p>
                )}
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    disabled={selectedTags.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Wallet Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <span>Wallets {selectedWallets.length > 0 && `(${selectedWallets.length})`}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Filter by Wallet</h4>
                <div className="grid grid-cols-1 gap-2">
                  {availableWallets.map((wallet) => (
                    <div key={wallet} className="flex items-center gap-2">
                      <Checkbox 
                        id={`wallet-${wallet}`}
                        checked={selectedWallets.includes(wallet)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedWallets([...selectedWallets, wallet]);
                          } else {
                            setSelectedWallets(selectedWallets.filter(w => w !== wallet));
                          }
                        }}
                      />
                      <label htmlFor={`wallet-${wallet}`} className="text-sm">{wallet}</label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedWallets([])}
                    disabled={selectedWallets.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Privacy Highlight Toggle */}
          <Button
            variant={highlightPrivacyIssues ? "default" : "outline"}
            size="sm"
            onClick={() => setHighlightPrivacyIssues(!highlightPrivacyIssues)}
            className="flex items-center gap-1"
          >
            <span>Highlight Privacy Issues</span>
          </Button>
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ea384c' }}></div>
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9b87f5' }}></div>
          <span>Change Output</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8E9196' }}></div>
          <span>Transaction</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E5DEFF' }}></div>
          <span>Address</span>
        </div>
      </div>
      
      {/* Graph */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        {graphData.nodes.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            No UTXOs to display. Try adjusting your filters.
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel={(node: GraphNode) => ''}  // Using custom tooltips instead
            linkLabel={(link: GraphLink) => ''}  // Using custom tooltips instead
            nodeAutoColorBy="group"
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.25}
            nodeCanvasObject={(node, ctx, globalScale) => nodeCanvasObject(node, ctx, globalScale)}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            cooldownTicks={100}
            linkWidth={(link) => link.value}
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
            nodeRelSize={6}
          />
        )}
        
        {/* Tooltip for hovered node */}
        {hoveredNode && (
          <div 
            style={{
              position: 'absolute',
              left: (hoveredNode.x || 0) + 'px',
              top: (hoveredNode.y || 0) + 'px',
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            {nodeTooltip(hoveredNode)}
          </div>
        )}
        
        {/* Instructions */}
        <div className="absolute bottom-4 right-4 bg-background/80 p-2 rounded text-xs">
          Drag to pan. Scroll to zoom. Click nodes to explore.
        </div>
      </div>
    </div>
  );
};
