
import React, { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagSelector } from "@/components/utxo/TagSelector";
import { useWallet } from "@/store/WalletContext";
import { formatBTC, getRiskColor } from "@/utils/utxo-utils";
import { UTXO } from "@/types/utxo";
import { Bookmark, Check, Tag } from "lucide-react";

interface UTXODetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  utxoId: string | null;
  onTagUpdate?: (utxoId: string, tagId: string) => void;
}

export const UTXODetailsModal = ({
  open,
  onOpenChange,
  utxoId,
  onTagUpdate,
}: UTXODetailsModalProps) => {
  const { isUTXOSelected, toggleUTXOSelection, tags, walletData } = useWallet();
  
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
    }
  }, [open, utxoId]);

  const handleTagSelection = (utxoId: string, tagId: string) => {
    if (!selectedUTXO) return;
    
    if (onTagUpdate && tagId && utxoId) {
      onTagUpdate(utxoId, tagId);
      console.log("UTXODetailsModal: Tag updated for UTXO", utxoId.substring(0, 6));
    }
  };

  const handleToggleSelection = (utxo: UTXO) => {
    if (!selectedUTXO) return;
    
    toggleUTXOSelection(utxo);
    console.log("UTXODetailsModal: Toggled UTXO selection", utxo.txid.substring(0, 6));
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log("UTXODetailsModal: Dialog state changing to:", newOpen);
    onOpenChange(newOpen);
    
    // If dialog is closing, ensure we log it
    if (!newOpen) {
      console.log("UTXODetailsModal: Dialog closing, parent will clear state");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card text-foreground border-border">
        <DialogHeader>
          <DialogTitle>UTXO Details</DialogTitle>
          <DialogDescription>
            View and manage details for this UTXO
          </DialogDescription>
        </DialogHeader>

        {!selectedUTXO ? (
          <div className="py-6 text-center text-muted-foreground">
            No UTXO selected.
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transaction ID</Label>
                  <div className="font-mono text-xs mt-1 bg-muted p-2 rounded overflow-x-auto text-foreground">
                    {selectedUTXO.txid}
                  </div>
                </div>
                <div>
                  <Label>Output Index</Label>
                  <div className="font-mono text-sm mt-1 text-foreground">
                    {selectedUTXO.vout}
                  </div>
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <div className="font-mono text-xs mt-1 bg-muted p-2 rounded overflow-x-auto text-foreground">
                  {selectedUTXO.address}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <div className="font-mono text-sm mt-1 text-foreground">
                    {formatBTC(selectedUTXO.amount)}
                  </div>
                </div>
                <div>
                  <Label>Confirmations</Label>
                  <div className="font-mono text-sm mt-1 text-foreground">
                    {selectedUTXO.confirmations}
                  </div>
                </div>
              </div>

              <div>
                <Label>Script Pubkey</Label>
                <div className="font-mono text-xs mt-1 bg-muted p-2 rounded overflow-x-auto text-foreground">
                  {selectedUTXO.scriptPubKey}
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1 items-center">
                  {selectedUTXO.tags.length > 0 ? (
                    selectedUTXO.tags.map((tagName, index) => {
                      const tag = tags.find((t) => t.name === tagName);
                      return tag ? (
                        <Badge
                          key={index}
                          style={{ backgroundColor: tag.color }}
                          className="text-white"
                        >
                          {tagName}
                        </Badge>
                      ) : null;
                    })
                  ) : (
                    <span className="text-muted-foreground">No tags assigned</span>
                  )}

                  <TagSelector
                    utxoId={selectedUTXO.txid}
                    onSelect={(tagId) => handleTagSelection(selectedUTXO.txid, tagId)}
                    utxoTags={selectedUTXO.tags}
                    trigger={
                      <Button variant="outline" size="sm" className="ml-2">
                        <Tag className="mr-2 h-3 w-3" />
                        Manage
                      </Button>
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Privacy Risk</Label>
                <div className="flex items-center mt-1">
                  <div
                    className={`w-3 h-3 rounded-full ${getRiskColor(
                      selectedUTXO.privacyRisk
                    )}`}
                  ></div>
                  <span className="ml-2 capitalize text-foreground">
                    {selectedUTXO.privacyRisk}
                  </span>
                </div>
              </div>

              {!isUTXOSelected(selectedUTXO) ? (
                <Button
                  onClick={() => handleToggleSelection(selectedUTXO)}
                  className="w-full"
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Add to Simulation
                </Button>
              ) : (
                <Button
                  onClick={() => handleToggleSelection(selectedUTXO)}
                  variant="outline"
                  className="w-full"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Remove from Simulation
                </Button>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
