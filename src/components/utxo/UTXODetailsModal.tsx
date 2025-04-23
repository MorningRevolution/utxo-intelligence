
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/store/WalletContext";
import { UTXO } from "@/types/utxo";

interface UTXODetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  utxoId: string | null;
  onTagUpdate?: (utxoId: string, tagId: string | null) => void;
}

export const UTXODetailsModal = ({
  open,
  onOpenChange,
  utxoId,
  onTagUpdate,
}: UTXODetailsModalProps) => {
  console.count("UTXODetailsModal render");
  console.log("Modal open:", open);
  
  const { walletData } = useWallet();
  const [count, setCount] = useState(0);
  
  // Look up the UTXO from the wallet context based on utxoId
  const selectedUTXO = React.useMemo(() => {
    if (!utxoId || !walletData) return null;
    return walletData.utxos.find(u => u.txid === utxoId) || null;
  }, [utxoId, walletData]);

  // Reset internal state when open state or utxoId changes
  useEffect(() => {
    if (!open) {
      console.log("UTXODetailsModal: Dialog closed, resetting internal state");
    } else {
      console.log("UTXODetailsModal: Dialog opened with UTXO ID:", utxoId?.substring(0, 6));
      
      // Debug log for selectedUTXO
      if (selectedUTXO) {
        console.log("Selected UTXO:", {
          id: selectedUTXO.txid.substring(0, 6),
          tags: selectedUTXO.tags
        });
      }
    }
  }, [open, utxoId, selectedUTXO]);

  const handleOpenChange = (newOpen: boolean) => {
    console.log("Dialog onOpenChange:", newOpen);
    onOpenChange(newOpen);
    
    if (!newOpen) {
      console.log("UTXODetailsModal: Dialog closing, parent will clear state");
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => handleOpenChange(false)}
    >
      <div 
        className="bg-card text-foreground border-border p-6 rounded-lg shadow-lg max-w-lg w-full mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          onClick={() => handleOpenChange(false)}
        >
          ×
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            Test Modal
          </h2>
        </div>

        <p>Test Count: {count}</p>
        <Button onClick={() => setCount(count + 1)}>Increment</Button>
        
        <div className="mt-2 p-2 border border-blue-200 rounded">
          <p>UTXO ID: {utxoId || 'None'}</p>
        </div>
      </div>
    </div>
  );
};

