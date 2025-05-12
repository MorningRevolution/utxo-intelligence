
import React, { useEffect, useRef, useState, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { UTXO } from "@/types/utxo";
import { GraphNode, GraphLink, GraphData, NodeSelectionCallback } from "@/types/utxo-graph";
import { formatBTC, getRiskBadgeStyle, getRiskTextColor } from "@/utils/utxo-utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Filter, Network, Maximize2, Minimize2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRange } from "react-day-picker";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createGraphData, nodeCanvasObject, TRANSACTION_NODE_COLOR } from "@/lib/utxo-graph-utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface UTXOGraphViewProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  onSelectTransaction?: (txid: string) => void;
  onSelectAddress?: (address: string) => void;
  maxNodes?: number;
  initialHighlightPrivacyIssues?: boolean;
}

export const UTXOGraphView: React.FC<UTXOGraphViewProps> = ({ 
  utxos, 
  onSelectUtxo,
  onSelectTransaction,
  onSelectAddress,
  maxNodes = 500,
  initialHighlightPrivacyIssues = false
}) => {
  // Using any for graphRef since ForceGraphMethods has TypeScript issues
  const graphRef = useRef<any>();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [highlightPrivacyIssues, setHighlightPrivacyIssues] = useState(initialHighlightPrivacyIssues);
  const [hideAddressNodes, setHideAddressNodes] = useState(false);
  const [equalNodeSize, setEqualNodeSize] = useState(false);
  const [chronologicalFlow, setChronologicalFlow] = useState(false);
  const [showingTruncatedWarning, setShowingTruncatedWarning] = useState(false);
  const [showTransactionDrawer, setShowTransactionDrawer] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  
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
    
    // Show warning if there are too many UTXOs
    if (filteredUtxos.length > maxNodes) {
      if (!showingTruncatedWarning) {
        toast.warning(
          `Displaying ${maxNodes} out of ${filteredUtxos.length} UTXOs. Use filters to narrow results.`,
          { duration: 5000 }
        );
        setShowingTruncatedWarning(true);
      }
      filteredUtxos = filteredUtxos.slice(0, maxNodes);
    } else {
      setShowingTruncatedWarning(false);
    }
    
    // Use the utility function to create graph data
    setGraphData(createGraphData(
      filteredUtxos, 
      {
        highlightPrivacyIssues,
        hideAddressNodes,
        equalNodeSize,
        chronologicalFlow
      }
    ));
  }, [
    utxos, 
    searchTerm, 
    selectedTags, 
    selectedWallets, 
    dateRange, 
    highlightPrivacyIssues,
    hideAddressNodes,
    equalNodeSize,
    chronologicalFlow,
    maxNodes,
    showingTruncatedWarning
  ]);

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    
    if (!node || !node.type) return;
    
    if (node.type === "utxo" && node.data && onSelectUtxo) {
      // Select this UTXO for detailed visualization
      onSelectUtxo(node.data);
      
      toast({
        title: "UTXO Selected",
        description: `Showing details for UTXO ${node.data.txid.substring(0, 8)}...`,
      });
    } else if (node.type === "transaction" && node.data) {
      // Open transaction drawer
      setSelectedTransactionId(node.data.txid);
      setShowTransactionDrawer(true);
      
      // Also call the callback if provided
      if (onSelectTransaction) {
        onSelectTransaction(node.data.txid);
      }
    } else if (node.type === "address" && onSelectAddress) {
      // Call the address selection callback
      onSelectAddress(node.data.address);
    }
  };

  // Handle node hover
  const handleNodeHover = (node: GraphNode | null) => {
    setHoveredNode(node);
    
    if (graphRef.current && node) {
      // Get connected nodes and links when a node is hovered
      const linkedNodeIds = graphData.links
        .filter(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return sourceId === node.id || targetId === node.id;
        })
        .flatMap(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return [sourceId, targetId];
        });
        
      // Modify the graph rendering to highlight connected nodes and links
      if (graphRef.current.nodeColor) {
        graphRef.current.nodeColor((n: GraphNode) => 
          n === node || linkedNodeIds.includes(n.id) 
            ? n.color 
            : `rgba(150, 150, 150, 0.2)`
        );
      }
      
      if (graphRef.current.linkColor) {
        graphRef.current.linkColor((link: GraphLink) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          return (sourceId === node.id || targetId === node.id)
            ? (link.color || '#666')
            : 'rgba(150, 150, 150, 0.1)';
        });
      }
      
      if (graphRef.current.linkWidth) {
        graphRef.current.linkWidth((link: GraphLink) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          return (sourceId === node.id || targetId === node.id) ? 2 : 0.5;
        });
      }
    } else if (graphRef.current) {
      // Reset colors when not hovering
      if (graphRef.current.nodeColor) {
        graphRef.current.nodeColor((n: GraphNode) => n.color);
      }
      if (graphRef.current.linkColor) {
        graphRef.current.linkColor((link: GraphLink) => link.color || '#666');
      }
      if (graphRef.current.linkWidth) {
        graphRef.current.linkWidth((link: GraphLink) => link.value || 1);
      }
    }
  };

  // Node tooltip content rendering function - Properly return JSX rather than objects
  const renderNodeTooltip = (node: GraphNode) => {
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
      // Enhanced transaction tooltip
      const linkedNodes = graphData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return sourceId === node.id || targetId === node.id;
      });
      
      // Count connected UTXOs
      const connectedUtxos = new Set();
      linkedNodes.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId !== node.id && sourceId.startsWith('utxo-')) connectedUtxos.add(sourceId);
        if (targetId !== node.id && targetId.startsWith('utxo-')) connectedUtxos.add(targetId);
      });
      
      return (
        <div className="bg-background/95 p-2 rounded-md shadow-md border border-border">
          <div className="font-semibold">Transaction</div>
          <div className="text-xs">{node.data.txid}</div>
          <div className="text-xs mt-1">Connected to {connectedUtxos.size} UTXO(s)</div>
          <div className="text-[0.65rem] mt-1">Click to view details</div>
        </div>
      );
    } else if (node.type === "address") {
      return (
        <div className="bg-background/95 p-2 rounded-md shadow-md border border-border">
          <div className="font-semibold">Address</div>
          <div className="text-xs">{node.data.address}</div>
          <div className="text-[0.65rem] mt-1">Click to view details</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height: '70vh' }}>
      {/* Toolbar */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by txid, address, tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9"
            />
          </div>
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
          
          {/* Graph options */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Network className="h-4 w-4" />
                <span>Options</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Graph Display Options</h4>
                
                {/* Privacy issues toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="privacy-toggle" className="flex flex-col">
                    <span>Highlight Privacy Issues</span>
                    <span className="text-xs text-muted-foreground">Emphasize risky connections</span>
                  </Label>
                  <Switch
                    id="privacy-toggle"
                    checked={highlightPrivacyIssues}
                    onCheckedChange={setHighlightPrivacyIssues}
                  />
                </div>
                
                {/* Hide address nodes toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="address-toggle" className="flex flex-col">
                    <span>Simplify Graph</span>
                    <span className="text-xs text-muted-foreground">Hide address nodes</span>
                  </Label>
                  <Switch
                    id="address-toggle"
                    checked={hideAddressNodes}
                    onCheckedChange={setHideAddressNodes}
                  />
                </div>
                
                {/* Equalize node sizes toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="size-toggle" className="flex flex-col">
                    <span>Equal Node Size</span>
                    <span className="text-xs text-muted-foreground">Ignore UTXO amounts for sizing</span>
                  </Label>
                  <Switch
                    id="size-toggle"
                    checked={equalNodeSize}
                    onCheckedChange={setEqualNodeSize}
                  />
                </div>
                
                {/* Chronological flow toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="chrono-toggle" className="flex flex-col">
                    <span>Chronological Flow</span>
                    <span className="text-xs text-muted-foreground">Arrange by timeline (left to right)</span>
                  </Label>
                  <Switch
                    id="chrono-toggle"
                    checked={chronologicalFlow}
                    onCheckedChange={setChronologicalFlow}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Legend - Pinned at the top with updated transaction color */}
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
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRANSACTION_NODE_COLOR }}></div>
          <span>Transaction</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E5DEFF' }}></div>
          <span>Address</span>
        </div>
      </div>
      
      {/* Graph */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden relative">
        {graphData.nodes.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            No UTXOs to display. Try adjusting your filters.
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeId="id"
            nodeLabel={() => ''}  // Using custom tooltips instead
            linkSource="source"
            linkTarget="target"
            nodeAutoColorBy="group"
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.25}
            nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => 
              nodeCanvasObject(node, ctx, globalScale)
            }
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            cooldownTicks={100}
            linkWidth={(link) => link.value}
            enableNodeDrag={true}
            nodeRelSize={6}
          />
        )}
        
        {/* Tooltip for hovered node */}
        {hoveredNode && hoveredNode.x !== undefined && hoveredNode.y !== undefined && (
          <div 
            style={{
              position: 'absolute',
              left: (hoveredNode.x) + 'px',
              top: (hoveredNode.y) + 'px',
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            {renderNodeTooltip(hoveredNode)}
          </div>
        )}
        
        {/* Instructions */}
        <div className="absolute bottom-4 right-4 bg-background/80 p-2 rounded text-xs">
          Drag to pan. Scroll to zoom. Click nodes to explore.
        </div>
        
        {/* Node count warning */}
        {showingTruncatedWarning && (
          <div className="absolute top-4 right-4 bg-yellow-500/90 text-white p-2 rounded text-xs max-w-[300px]">
            Only showing {maxNodes} of {utxos.length} possible nodes. Use filters to narrow results.
          </div>
        )}
      </div>

      {/* Transaction Details Drawer */}
      <Drawer open={showTransactionDrawer} onOpenChange={setShowTransactionDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Transaction Details</DrawerTitle>
            <DrawerDescription>
              {selectedTransactionId ? 
                `Transaction ID: ${selectedTransactionId}` : 
                "No transaction selected"}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 py-2">
            {selectedTransactionId ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-1">Transaction ID</h3>
                  <p className="text-xs break-all font-mono">{selectedTransactionId}</p>
                </div>
                
                {/* Connected UTXOs */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Connected UTXOs</h3>
                  {graphData.links.filter(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    const txNodeId = `tx-${selectedTransactionId}`;
                    return sourceId === txNodeId || targetId === txNodeId;
                  }).map((link, i) => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    const utxoId = sourceId.startsWith('utxo-') ? sourceId : targetId;
                    const direction = sourceId.startsWith('utxo-') ? 'Input' : 'Output';
                    
                    // Find the UTXO data
                    const utxoNode = graphData.nodes.find(n => n.id === utxoId);
                    const utxo = utxoNode?.data as UTXO | undefined;
                    
                    if (!utxo) return null;
                    
                    return (
                      <div key={i} className="border rounded-md p-2 mb-2 flex justify-between">
                        <div>
                          <Badge variant={direction === 'Input' ? "default" : "outline"} className="mb-1">
                            {direction}
                          </Badge>
                          <p className="text-xs">{utxo.txid.substring(0, 10)}...:{utxo.vout}</p>
                          <p className="text-xs text-muted-foreground">{formatBTC(utxo.amount)} BTC</p>
                        </div>
                        <div>
                          <Badge 
                            variant={utxo.privacyRisk === "high" ? "destructive" : 
                                   utxo.privacyRisk === "medium" ? "warning" : "success"} 
                            className="text-[0.65rem]">
                              {utxo.privacyRisk}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Transaction risk summary */}
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm">Transaction analysis coming in future updates.</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                Select a transaction node to view details
              </div>
            )}
          </div>
          
          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowTransactionDrawer(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
