
import React, { useState, useEffect } from "react";
import { UTXO } from "@/types/utxo";
import { GraphNode, GraphLink } from "@/types/utxo-graph";
import { createTraceabilityGraph, safeFormatBTC } from "@/utils/visualization-utils";
import { Badge } from "@/components/ui/badge";
import { getRiskBadgeStyle, getRiskTextColor } from "@/utils/utxo-utils";
import { X, ZoomIn, ZoomOut, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface TraceabilityGraphProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
}

export const TraceabilityGraph: React.FC<TraceabilityGraphProps> = ({ 
  utxos, 
  onSelectUtxo 
}) => {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [editableNote, setEditableNote] = useState("");
  
  // Extract all available tags for filters
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    utxos.forEach(utxo => {
      utxo.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [utxos]);

  // Generate graph data from UTXOs
  useEffect(() => {
    // Filter UTXOs based on search and tags
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
    
    setGraphData(createTraceabilityGraph(filteredUtxos));
  }, [utxos, searchTerm, selectedTags]);

  // Handle node selection
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setShowDrawer(true);
    
    if (node.type === "utxo" && node.data && onSelectUtxo) {
      onSelectUtxo(node.data);
      
      // Initialize editable note
      setEditableNote(node.data.notes || "");
    }
  };
  
  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };
  
  // Calculate node size based on amount and type
  const getNodeSize = (node: GraphNode) => {
    const baseSize = node.type === "transaction" ? 80 : 60;
    const sizeMultiplier = node.type === "transaction" ? 20 : 10;
    
    // Logarithmic scale to prevent extremely large nodes
    return baseSize + Math.log10(1 + (node.amount || 0)) * sizeMultiplier;
  };
  
  // Determine node color based on risk level and type
  const getNodeColor = (node: GraphNode) => {
    if (node.type === "transaction") {
      return "#6366F1"; // Indigo for transactions
    } else if (node.type === "address") {
      return "#E5DEFF"; // Light purple for addresses
    } else if (node.riskLevel) {
      switch (node.riskLevel) {
        case "high": return "#ea384c";
        case "medium": return "#f97316";
        case "low": return "#10b981";
        default: return "#8E9196";
      }
    }
    return "#8E9196"; // Default gray
  };
  
  // Determine node border style based on type
  const getNodeBorder = (node: GraphNode) => {
    if (node.type === "transaction") {
      return "border-2 border-indigo-600";
    } else if (node.type === "address") {
      return "border border-purple-200";
    }
    return "border border-gray-300";
  };
  
  // Determine node shape based on type
  const getNodeShape = (node: GraphNode) => {
    if (node.type === "transaction") {
      return "rounded-md"; // Square with rounded corners for transactions
    } else if (node.type === "address") {
      return "rounded-full"; // Circle for addresses
    }
    return "rounded-lg"; // Rounded rectangle for UTXOs
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Input
            placeholder="Search by txid, address, tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="flex gap-2">
          {/* Tag Filter */}
          <div className="flex flex-wrap gap-1 items-center">
            {availableTags.slice(0, 5).map(tag => (
              <Badge 
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter(t => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
              >
                {tag}
              </Badge>
            ))}
            {availableTags.length > 5 && (
              <Badge variant="outline">+{availableTags.length - 5} more</Badge>
            )}
          </div>
          
          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs">{Math.round(zoomLevel * 100)}%</span>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-card p-2 rounded-lg shadow-sm mb-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#ea384c]"></div>
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-md bg-[#6366F1]"></div>
          <span>Transaction</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#E5DEFF]"></div>
          <span>Address</span>
        </div>
      </div>
      
      {/* Graph container with horizontal flow layout */}
      <div className="bg-card rounded-lg shadow-sm p-4 overflow-auto" style={{ minHeight: '60vh' }}>
        {graphData.nodes.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            No UTXOs to display. Try adjusting your filters.
          </div>
        ) : (
          <div 
            className="relative"
            style={{ 
              transform: `scale(${zoomLevel})`, 
              transformOrigin: 'top left',
              minHeight: '800px',
              minWidth: '1200px'
            }}
          >
            {/* Render nodes */}
            {graphData.nodes.map(node => (
              <div
                key={node.id}
                className={`absolute flex flex-col items-center justify-center cursor-pointer transition-shadow hover:shadow-lg ${getNodeShape(node)} ${getNodeBorder(node)}`}
                style={{
                  width: `${getNodeSize(node)}px`,
                  height: `${getNodeSize(node)}px`,
                  backgroundColor: getNodeColor(node),
                  color: node.type === 'transaction' ? 'white' : 'black',
                  // Position nodes in a flowchart layout (calculated based on node type)
                  left: (() => {
                    // Simple horizontal positioning
                    if (node.type === 'address') return `${100 + Math.random() * 800}px`;
                    if (node.type === 'transaction') return `${400 + Math.random() * 400}px`;
                    return `${700 + Math.random() * 400}px`;
                  })(),
                  top: (() => {
                    // Vertical positioning with some randomness
                    return `${100 + Math.random() * 600}px`;
                  })()
                }}
                onClick={() => handleNodeClick(node)}
              >
                {/* Node content varies by type */}
                <div className="text-xs font-medium truncate max-w-[90%] text-center">
                  {node.name}
                </div>
                {node.type === "utxo" && (
                  <div className="text-xs mt-1">
                    {safeFormatBTC(node.amount)}
                  </div>
                )}
                {node.type === "transaction" && (
                  <div className="text-xs mt-1 font-bold">
                    TX: {safeFormatBTC(node.amount)}
                  </div>
                )}
                {node.type === "utxo" && node.riskLevel && (
                  <Badge 
                    className="mt-1 text-[0.6rem]"
                    variant={node.riskLevel === "high" ? "destructive" : "outline"}
                  >
                    {node.riskLevel}
                  </Badge>
                )}
              </div>
            ))}
            
            {/* SVG layer for drawing links between nodes */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{zIndex: -1}}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#8E9196" />
                </marker>
              </defs>
              {/* This is a placeholder for the actual link drawing logic */}
              {/* In a real implementation, we would calculate the positions of nodes and draw paths between them */}
              <g>
                {/* For now, we'll use a simplified approach */}
                {graphData.links.map((link, i) => {
                  // Find source and target nodes
                  const sourceNode = graphData.nodes.find(n => n.id === link.source);
                  const targetNode = graphData.nodes.find(n => n.id === link.target);
                  
                  if (!sourceNode || !targetNode) return null;
                  
                  // In a real implementation, we would calculate these positions based on node positions
                  // Here, we're just using placeholder values
                  const x1 = 200 + Math.random() * 800;
                  const y1 = 200 + Math.random() * 500;
                  const x2 = 200 + Math.random() * 800;
                  const y2 = 200 + Math.random() * 500;
                  
                  return (
                    <path
                      key={`link-${i}`}
                      d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                      stroke={link.riskLevel === "high" ? "#ea384c" : link.riskLevel === "medium" ? "#f97316" : "#8E9196"}
                      strokeWidth={Math.max(1, link.value * 0.5)}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      opacity={0.7}
                    />
                  );
                })}
              </g>
            </svg>
          </div>
        )}
      </div>
      
      {/* Node Details Drawer */}
      <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>
              {selectedNode?.type === "utxo" ? "UTXO Details" : 
               selectedNode?.type === "transaction" ? "Transaction Details" : 
               "Address Details"}
            </DrawerTitle>
            <DrawerDescription>
              {selectedNode?.name || "No node selected"}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 py-2">
            {selectedNode ? (
              <div className="space-y-4">
                {/* Node ID and amount */}
                <div className="bg-muted p-3 rounded-lg">
                  <h3 className="text-sm font-medium mb-1">
                    {selectedNode.type === "utxo" ? "TXID:Vout" : 
                     selectedNode.type === "transaction" ? "Transaction ID" : 
                     "Address"}
                  </h3>
                  <p className="text-xs break-all font-mono">
                    {selectedNode.type === "utxo" ? selectedNode.data?.txid + ":" + selectedNode.data?.vout : 
                     selectedNode.type === "transaction" ? selectedNode.data?.txid : 
                     selectedNode.data?.address}
                  </p>
                  <div className="mt-2">
                    <span className="text-sm font-medium">Amount: </span>
                    <span className="font-mono">{safeFormatBTC(selectedNode.amount)}</span>
                  </div>
                </div>
                
                {/* UTXO specific details */}
                {selectedNode.type === "utxo" && selectedNode.data && (
                  <>
                    {/* Risk level */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Risk Level: </span>
                      <Badge className={getRiskBadgeStyle(selectedNode.data.privacyRisk)}>
                        {selectedNode.data.privacyRisk.toUpperCase()}
                      </Badge>
                    </div>
                    
                    {/* Tags */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.data.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {selectedNode.data.tags.length === 0 && (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Notes (editable) */}
                    <div>
                      <h3 className="text-sm font-medium mb-1">Notes</h3>
                      <div className="flex items-center gap-2">
                        <Input
                          value={editableNote}
                          onChange={(e) => setEditableNote(e.target.value)}
                          placeholder="Add notes..."
                          className="text-sm"
                        />
                        <Button size="sm" className="shrink-0">
                          <Edit className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Transaction specific details */}
                {selectedNode.type === "transaction" && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Connected UTXOs</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {graphData.links
                        .filter(link => {
                          return link.source === selectedNode.id || link.target === selectedNode.id;
                        })
                        .map((link, i) => {
                          // Display connected UTXOs
                          const connectedId = link.source === selectedNode.id ? link.target : link.source;
                          const connectedNode = graphData.nodes.find(n => n.id === connectedId);
                          
                          if (!connectedNode || connectedNode.type !== "utxo") return null;
                          
                          const direction = link.source === selectedNode.id ? "Output" : "Input";
                          
                          return (
                            <div key={i} className="border rounded-md p-2 flex justify-between">
                              <div>
                                <Badge variant={direction === "Input" ? "default" : "outline"} className="mb-1">
                                  {direction}
                                </Badge>
                                <p className="text-xs">{connectedNode.name}</p>
                                <p className="text-xs text-muted-foreground">{safeFormatBTC(connectedNode.amount)}</p>
                              </div>
                              {connectedNode.riskLevel && (
                                <Badge 
                                  variant={connectedNode.riskLevel === "high" ? "destructive" : 
                                          connectedNode.riskLevel === "medium" ? "outline" : "default"} 
                                  className="text-[0.65rem]">
                                  {connectedNode.riskLevel}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                
                {/* Address specific details */}
                {selectedNode.type === "address" && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Connected UTXOs</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {graphData.links
                        .filter(link => {
                          return link.source === selectedNode.id || link.target === selectedNode.id;
                        })
                        .map((link, i) => {
                          // Display connected UTXOs
                          const connectedId = link.source === selectedNode.id ? link.target : link.source;
                          const connectedNode = graphData.nodes.find(n => n.id === connectedId);
                          
                          if (!connectedNode || connectedNode.type !== "utxo") return null;
                          
                          return (
                            <div key={i} className="border rounded-md p-2 flex justify-between">
                              <div>
                                <p className="text-xs">{connectedNode.name}</p>
                                <p className="text-xs text-muted-foreground">{safeFormatBTC(connectedNode.amount)}</p>
                              </div>
                              {connectedNode.riskLevel && (
                                <Badge 
                                  variant={connectedNode.riskLevel === "high" ? "destructive" : 
                                          connectedNode.riskLevel === "medium" ? "outline" : "default"} 
                                  className="text-[0.65rem]">
                                  {connectedNode.riskLevel}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                Select a node to view details
              </div>
            )}
          </div>
          
          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowDrawer(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
