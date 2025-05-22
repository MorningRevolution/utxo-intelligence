
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/store/WalletContext";
import { Table, BarChart, Grid, CalendarDays, Network, ZoomIn, ZoomOut, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { UTXO } from "@/types/utxo";
import { toast } from "sonner";
import { EnhancedTimelineView } from "@/components/utxo/EnhancedTimelineView";
import { ResponsiveTraceabilityMatrix } from "@/components/utxo/ResponsiveTraceabilityMatrix";
import { PrivacyTreemap } from "@/components/utxo/PrivacyTreemap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBTC } from "@/utils/utxo-utils";
import { getRiskTextColor } from "@/utils/utxo-utils";
import { Tooltip } from "@/components/ui/tooltip";

const UTXOMap: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { walletData, hasWallet } = useWallet();
  const [selectedUtxo, setSelectedUtxo] = useState<UTXO | null>(null);
  const [activeView, setActiveView] = useState<"timeline" | "traceability" | "treemap">(
    (searchParams.get("view") as "timeline" | "traceability" | "treemap") || "timeline"
  );
  const [showConnections, setShowConnections] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    if (!hasWallet) {
      navigate("/wallet-import");
      toast("No wallet loaded. Please import a wallet first.");
    }
  }, [hasWallet, navigate]);

  const handleUtxoSelect = (utxo: UTXO | null) => {
    setSelectedUtxo(utxo);
    if (utxo) {
      toast.info(`UTXO ${utxo.txid.substring(0, 8)}... selected.`);
    }
  };

  const handleBackToTable = () => {
    navigate("/utxo-table");
  };

  // Handle view change with URL update
  const handleViewChange = (view: "timeline" | "traceability" | "treemap") => {
    setActiveView(view);
    // Update URL to reflect the current view
    setSearchParams({ view });
  };

  const handleToggleConnections = () => {
    setShowConnections(prev => !prev);
    toast.info(showConnections ? "Connections hidden" : "Connections visible");
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  if (!walletData) {
    return (
      <div className="container px-4 md:px-8 py-6">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-foreground mb-4">No wallet data available.</p>
          <Button onClick={() => navigate("/wallet-import")}>Import Wallet</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-8 py-6">
      <div className="flex flex-col md:flex-row justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">UTXO Visualization</h1>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToTable}
            className="flex items-center gap-1"
          >
            <Table className="h-4 w-4" />
            <span className="hidden sm:inline">View UTXO Table</span>
            <span className="sm:hidden">Table</span>
          </Button>
        </div>
      </div>

      <Tabs 
        defaultValue="timeline" 
        value={activeView}
        onValueChange={(value) => handleViewChange(value as "timeline" | "traceability" | "treemap")}
        className="w-full"
      >
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-6">
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="traceability" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Matrix</span>
          </TabsTrigger>
          <TabsTrigger value="treemap" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">Treemap</span>
          </TabsTrigger>
        </TabsList>

        <div className="bg-card rounded-lg shadow-lg p-2 md:p-4 mb-8">
          {/* Visualization Controls */}
          <div className="flex flex-wrap justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {activeView === "timeline" && "Timeline view shows your transactions chronologically, grouped by month."}
              {activeView === "traceability" && "Matrix view shows relationships between addresses and transactions."}
              {activeView === "treemap" && "Treemap displays your UTXOs as proportionally sized tiles based on BTC amount."}
            </div>
            
            <div className="flex items-center gap-2">
              <Tooltip content="Zoom out">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="h-8 w-8"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </Tooltip>
              
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                {Math.round(zoomLevel * 100)}%
              </span>
              
              <Tooltip content="Zoom in">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 2.5}
                  className="h-8 w-8"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content={showConnections ? "Hide connections" : "Show connections"}>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleToggleConnections}
                  className={`h-8 w-8 ${showConnections ? "bg-primary/10" : ""}`}
                >
                  {showConnections ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </Tooltip>
            </div>
          </div>
          
          <TabsContent value="timeline" className="animate-fade-in">
            <div className="h-[600px] overflow-hidden">
              <EnhancedTimelineView
                utxos={walletData.utxos}
                onSelectUtxo={handleUtxoSelect}
                selectedUtxo={selectedUtxo}
                showConnections={showConnections}
                zoomLevel={zoomLevel}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="traceability" className="animate-fade-in">
            <div className="h-[600px] overflow-hidden">
              {walletData.utxos.length > 0 ? (
                <ResponsiveTraceabilityMatrix
                  utxos={walletData.utxos}
                  onSelectUtxo={handleUtxoSelect}
                  selectedUtxo={selectedUtxo}
                  showConnections={showConnections}
                  zoomLevel={zoomLevel}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                  <p className="text-muted-foreground text-lg">No UTXOs available to display traceability.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="treemap" className="animate-fade-in">
            <div className="h-[600px] overflow-hidden">
              {walletData.utxos.length > 0 ? (
                <PrivacyTreemap
                  utxos={walletData.utxos}
                  onSelectUtxo={handleUtxoSelect}
                  zoomLevel={zoomLevel}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                  <p className="text-muted-foreground text-lg">No UTXOs available to display in treemap.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Display selected UTXO information */}
      {selectedUtxo && (
        <div className="bg-card rounded-lg shadow-lg p-4 mb-8 animate-fade-in">
          <h2 className="text-lg font-bold mb-2">Selected UTXO</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm break-all">{selectedUtxo.txid}:{selectedUtxo.vout}</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedUtxo(null)}>Clear Selection</Button>
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-sm font-medium">Amount:</span> 
              <span className="ml-2 font-mono">{formatBTC(selectedUtxo.amount, { trimZeros: true, minDecimals: 5 })}</span>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-sm font-medium">Risk:</span>
              <span className={`ml-2 ${getRiskTextColor(selectedUtxo.privacyRisk)}`}>
                {selectedUtxo.privacyRisk.toUpperCase()}
              </span>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-sm font-medium">Wallet:</span>
              <span className="ml-2">{selectedUtxo.walletName || "Unknown"}</span>
            </div>
            {selectedUtxo.tags.length > 0 && (
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-sm font-medium">Tags:</span>
                <span className="ml-2">{selectedUtxo.tags.join(", ")}</span>
              </div>
            )}
            {selectedUtxo.acquisitionDate && (
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-sm font-medium">Date:</span>
                <span className="ml-2">{new Date(selectedUtxo.acquisitionDate).toLocaleDateString()}</span>
              </div>
            )}
            {selectedUtxo.notes && (
              <div className="p-2 bg-muted/30 rounded col-span-3">
                <span className="text-sm font-medium">Notes:</span>
                <div className="ml-2 mt-1 text-sm">{selectedUtxo.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UTXOMap;
