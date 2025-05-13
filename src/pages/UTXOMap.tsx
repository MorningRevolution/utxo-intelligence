
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/store/WalletContext";
import { Table, BarChart, Grid } from "lucide-react";
import { UTXO } from "@/types/utxo";
import { toast } from "sonner";
import { RefactoredTraceabilityGraph } from "@/components/utxo/RefactoredTraceabilityGraph";
import { PrivacyTreemap } from "@/components/utxo/PrivacyTreemap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const UTXOMap: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { walletData, hasWallet } = useWallet();
  const [selectedUtxo, setSelectedUtxo] = useState<UTXO | null>(null);
  const [activeView, setActiveView] = useState<"traceability" | "treemap">(
    (searchParams.get("view") === "treemap" ? "treemap" : "traceability") as "traceability" | "treemap"
  );

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
        defaultValue="traceability" 
        value={activeView}
        onValueChange={(value) => setActiveView(value as "traceability" | "treemap")}
        className="w-full"
      >
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-6">
          <TabsTrigger value="traceability" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span>Traceability Graph</span>
          </TabsTrigger>
          <TabsTrigger value="treemap" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            <span>Privacy Treemap</span>
          </TabsTrigger>
        </TabsList>

        <div className="bg-card rounded-lg shadow-lg p-2 md:p-4 mb-8">
          <div className="mt-2">
            {activeView === "traceability" && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  This visualization shows connections between your transactions and addresses.
                  Explore how your coins are linked across the blockchain and identify potential privacy issues.
                </p>
                
                <RefactoredTraceabilityGraph
                  utxos={walletData.utxos}
                  onSelectUtxo={handleUtxoSelect}
                />
              </>
            )}
            
            {activeView === "treemap" && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  This visualization displays your UTXOs as tiles sized by their BTC amount and colored by privacy risk.
                  Click any UTXO to inspect its details and edit metadata.
                </p>
                
                <PrivacyTreemap
                  utxos={walletData.utxos}
                  onSelectUtxo={handleUtxoSelect}
                />
              </>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default UTXOMap;
