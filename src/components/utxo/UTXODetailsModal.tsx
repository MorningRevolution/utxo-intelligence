
import React, { useEffect, useState, Component, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWallet } from "@/store/WalletContext";
import { UTXO } from "@/types/utxo";

// Error boundary component for the dialog content
class DialogErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Dialog render error", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-destructive">
          <h3 className="font-medium">Something went wrong</h3>
          <p className="text-sm text-muted-foreground">
            There was an error rendering this dialog. Please try again or contact support.
          </p>
          <Button 
            className="mt-4" 
            variant="outline" 
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    
    // If dialog is closing, ensure we log it
    if (!newOpen) {
      console.log("UTXODetailsModal: Dialog closing, parent will clear state");
    }
  };

  // Always render the Dialog component, never conditionally render it
  return (
    <div className="pointer-events-auto"> {/* Added to test event layering */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle>Test Modal</DialogTitle>
          </DialogHeader>
          <p>Test Count: {count}</p>
          <Button onClick={() => setCount(count + 1)}>Increment</Button>
          <div className="mt-2 p-2 border border-blue-200 rounded">
            <p>UTXO ID: {utxoId || 'None'}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
