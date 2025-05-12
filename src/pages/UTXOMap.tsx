
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/store/WalletContext";
import { Table } from "lucide-react";
import { UTXOGraphView } from "@/components/utxo/UTXOGraphView";
import { UTXO } from "@/types/utxo";
import { toast } from "sonner";

const UTXOMap: React.FC = () => {
  const navigate = useNavigate();
  const { walletData, hasWallet } = useWallet();
  const [selectedUtxo, setSelectedUtxo] = useState<UTXO | null>(null);

  useEffect(() => {
    if (!hasWallet) {
      navigate("/wallet-import");
      toast("No wallet loaded. Please import a wallet first.");
    }
  }, [hasWallet, navigate]);

  const handleUtxoSelect = (utxo: UTXO | null) => {
    setSelectedUtxo(utxo);
    if (utxo) {
      // If a UTXO is selected, navigate to the visualizer view
      navigate("/utxo-table", { 
        state: { 
          view: "visual", 
          selectedUtxo: utxo 
        }
      });
    }
  };

  const handleTransactionSelect = (txid: string) => {
    toast.info(`Transaction ${txid.substring(0, 8)}... selected.`, {
      description: "Transaction details panel coming soon."
    });
    // Ideally we would open a side drawer or panel here to show transaction details
    // For now just show a toast
  };

  const handleAddressSelect = (address: string) => {
    toast.info(`Address ${address.substring(0, 8)}... selected.`, {
      description: "Address details panel coming soon."
    });
    // Ideally we would open a side drawer or panel here to show address details
    // For now just show a toast
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
        <h1 className="text-2xl font-bold text-foreground">UTXO Network Map</h1>
        
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

      <div className="bg-card rounded-lg shadow-lg p-2 md:p-4 mb-8">
        <div className="mt-2">
          <p className="text-sm text-muted-foreground mb-4">
            This visualization shows connections between your UTXOs, transactions, and addresses. 
            You can drag nodes to explore relationships, zoom in/out, and click on nodes to see details.
          </p>
          
          <UTXOGraphView
            utxos={walletData.utxos}
            onSelectUtxo={handleUtxoSelect}
            onSelectTransaction={handleTransactionSelect}
            onSelectAddress={handleAddressSelect}
            maxNodes={500}
            initialHighlightPrivacyIssues={true}
          />
        </div>
      </div>
    </div>
  );
};

export default UTXOMap;
