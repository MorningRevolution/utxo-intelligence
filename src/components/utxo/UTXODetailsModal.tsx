import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/store/WalletContext";
import { UTXO } from "@/types/utxo";
import { TagSelector } from "./TagSelector";

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

  useEffect(() => {
    // Add keyboard event listener for Escape key
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        handleOpenChange(false);
      }
    };

    if (open) {
      window.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [open]);

  const handleModalClose = () => {
    handleOpenChange(false);
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleModalClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-card text-foreground border-border p-6 rounded-lg shadow-lg max-w-lg w-full mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          onClick={handleModalClose}
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="mb-6">
          <h2 id="modal-title" className="text-lg font-semibold leading-none tracking-tight">
            UTXO Details
          </h2>
        </div>

        {selectedUTXO && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Transaction ID</div>
              <div className="text-sm text-muted-foreground break-all">
                {selectedUTXO.txid}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Amount</div>
              <div className="text-sm text-muted-foreground">
                {selectedUTXO.value} BTC
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Tags</div>
              <TagSelector
                utxoId={selectedUTXO.txid}
                onSelect={(tagId) => onTagUpdate?.(selectedUTXO.txid, tagId)}
                utxoTags={selectedUTXO.tags || []}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={handleModalClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
