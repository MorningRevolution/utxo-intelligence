
import React from "react";
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
  utxo: UTXO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagUpdate?: (utxoId: string, tagId: string) => void;
}

export const UTXODetailsModal = ({
  utxo,
  open,
  onOpenChange,
  onTagUpdate,
}: UTXODetailsModalProps) => {
  const { isUTXOSelected, toggleUTXOSelection, tags } = useWallet();

  const handleTagSelection = (utxoId: string, tagId: string) => {
    if (onTagUpdate && tagId && utxoId) {
      onTagUpdate(utxoId, tagId);
      console.log("UTXODetailsModal: Tag updated for UTXO", utxoId.substring(0, 6));
    }
  };

  const handleToggleSelection = (utxo: UTXO) => {
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

        {utxo ? (
          <>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transaction ID</Label>
                  <div className="font-mono text-xs mt-1 bg-muted p-2 rounded overflow-x-auto text-foreground">
                    {utxo.txid}
                  </div>
                </div>
                <div>
                  <Label>Output Index</Label>
                  <div className="font-mono text-sm mt-1 text-foreground">
                    {utxo.vout}
                  </div>
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <div className="font-mono text-xs mt-1 bg-muted p-2 rounded overflow-x-auto text-foreground">
                  {utxo.address}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <div className="font-mono text-sm mt-1 text-foreground">
                    {formatBTC(utxo.amount)}
                  </div>
                </div>
                <div>
                  <Label>Confirmations</Label>
                  <div className="font-mono text-sm mt-1 text-foreground">
                    {utxo.confirmations}
                  </div>
                </div>
              </div>

              <div>
                <Label>Script Pubkey</Label>
                <div className="font-mono text-xs mt-1 bg-muted p-2 rounded overflow-x-auto text-foreground">
                  {utxo.scriptPubKey}
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1 items-center">
                  {utxo.tags.length > 0 ? (
                    utxo.tags.map((tagName, index) => {
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
                    utxoId={utxo.txid}
                    onSelect={(tagId) => handleTagSelection(utxo.txid, tagId)}
                    utxoTags={utxo.tags}
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
                      utxo.privacyRisk
                    )}`}
                  ></div>
                  <span className="ml-2 capitalize text-foreground">
                    {utxo.privacyRisk}
                  </span>
                </div>
              </div>

              {!isUTXOSelected(utxo) ? (
                <Button
                  onClick={() => handleToggleSelection(utxo)}
                  className="w-full"
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Add to Simulation
                </Button>
              ) : (
                <Button
                  onClick={() => handleToggleSelection(utxo)}
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
        ) : (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">No UTXO selected</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
