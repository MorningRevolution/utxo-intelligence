import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/store/WalletContext";
import { Table, BarChart, Grid, CalendarDays, Network, ZoomIn, ZoomOut, ArrowLeft } from "lucide-react";
import { UTXO } from "@/types/utxo";
import { toast } from "sonner";
import { TimelineTraceabilityGraph } from "@/components/utxo/TimelineTraceabilityGraph";
import { SimpleTraceabilityGraph } from "@/components/utxo/SimpleTraceabilityGraph";
import { PrivacyTreemap } from "@/components/utxo/PrivacyTreemap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const UTXOMap: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { walletData, hasWallet } = useWallet();
  const [selectedUtxo, setSelectedUtxo] = useState<UTXO | null>(null);
  const [activeView, setActiveView] = useState<"timeline" | "traceability" | "treemap">(
    (searchParams.get("view") as "timeline" | "traceability" | "treemap") || "timeline"
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showConnections, setShowConnections] = useState<boolean>(true);

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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.3));
  };

  const handleResetView = () => {
    setZoomLevel(1);
  };

  const handleToggleConnections = () => {
    setShowConnections(prev => !prev);
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
            <span>View UTXO Table</span>
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
            <span>Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="traceability" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            <span>Traceability</span>
          </TabsTrigger>
          <TabsTrigger value="treemap" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            <span>Treemap</span>
          </TabsTrigger>
        </TabsList>

        <div className="bg-card rounded-lg shadow-lg p-2 md:p-4 mb-8">
          {/* Visualization Controls */}
          <div className="flex flex-wrap justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {activeView === "timeline" && "Timeline view shows your transactions chronologically, grouped by month."}
              {activeView === "traceability" && "Traceability view shows relationships between your transactions."}
              {activeView === "treemap" && "Treemap displays your UTXOs as proportionally sized tiles based on BTC amount."}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleToggleConnections}
                className={showConnections ? "bg-primary/10" : ""}
              >
                {showConnections ? "Hide Connections" : "Show Connections"}
              </Button>
              
              <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
              
              <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleResetView} className="ml-2">
                Reset View
              </Button>
            </div>
          </div>
          
          <TabsContent value="timeline" className="animate-fade-in">
            <div className="h-[600px] overflow-hidden">
              <TimelineTraceabilityGraph
                utxos={walletData.utxos}
                onSelectUtxo={handleUtxoSelect}
                showConnections={showConnections}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="traceability" className="animate-fade-in">
            <div className="h-[600px] overflow-hidden">
              {walletData.utxos.length > 0 ? (
                <SimpleTraceabilityGraph
                  utxos={walletData.utxos}
                  onSelectUtxo={handleUtxoSelect}
                  layout="vertical"
                  zoomLevel={zoomLevel}
                  showConnections={showConnections}
                  animate={true}
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
              <span className="ml-2 font-mono">{selectedUtxo.amount.toFixed(8)} BTC</span>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-sm font-medium">Risk:</span>
              <span className={`ml-2 ${
                selectedUtxo.privacyRisk === 'high' ? 'text-red-500' : 
                selectedUtxo.privacyRisk === 'medium' ? 'text-amber-500' : 
                'text-green-500'
              }`}>
                {selectedUtxo.privacyRisk.toUpperCase()}
              </span>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-sm font-medium">Wallet:</span>
              <span className="ml-2">{selectedUtxo.walletName || "Unknown"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UTXOMap;
