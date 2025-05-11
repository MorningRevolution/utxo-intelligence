
import { useState, useEffect } from "react";
import { UTXO } from "@/types/utxo";
import { useWallet } from "@/store/WalletContext";
import { formatBTC } from "@/utils/utxo-utils";
import { Wallet, ArrowRight, Database, ExternalLink } from "lucide-react";

interface UTXOVisualizerProps {
  selectedUtxo: UTXO | null;
}

export const UTXOVisualizer = ({ selectedUtxo }: UTXOVisualizerProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Add a small delay to trigger animation when UTXO is selected
    if (selectedUtxo) {
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [selectedUtxo]);

  const openMempoolLink = (hash: string, type: 'tx' | 'address') => {
    window.open(`https://mempool.space/${type}/${hash}`, '_blank');
  };

  // Empty state when no UTXO is selected
  if (!selectedUtxo) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">No Transaction Selected</h3>
        <p className="text-muted-foreground max-w-md">
          Select a UTXO from the table to view its transaction flow. Visual representation 
          will show input addresses, output addresses, and transaction details.
        </p>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <h3 className="text-xl font-medium mb-4">Transaction Visualization</h3>
      
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-center p-6 bg-card border border-border rounded-lg">
        {/* Input Section */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mb-2 text-sm font-medium text-muted-foreground">Input Address</div>
          <div 
            className="relative w-full max-w-sm p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary transition-colors"
            onClick={() => selectedUtxo.senderAddress ? openMempoolLink(selectedUtxo.senderAddress, 'address') : null}
          >
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-medium">Sender</span>
              {selectedUtxo.senderAddress && (
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <div className="text-sm break-all">
              {selectedUtxo.senderAddress || "Unknown Address"}
            </div>
          </div>
        </div>
        
        {/* Transaction Node */}
        <div className="flex flex-col items-center">
          <div className="hidden lg:block text-primary mb-2">
            <ArrowRight className="h-6 w-6" />
          </div>
          <div 
            className="w-full lg:w-auto px-6 py-4 bg-primary/10 rounded-lg border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => openMempoolLink(selectedUtxo.txid, 'tx')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="font-medium">Transaction</span>
              <ExternalLink className="h-3 w-3 text-primary" />
            </div>
            <div className="text-sm truncate max-w-[300px]">
              {selectedUtxo.txid}
            </div>
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Amount:</span>{' '}
              <span className="font-medium">{formatBTC(selectedUtxo.amount)} BTC</span>
            </div>
            <div className="mt-1 text-sm">
              <span className="text-muted-foreground">Output Index:</span>{' '}
              <span className="font-medium">{selectedUtxo.vout}</span>
            </div>
          </div>
          <div className="block lg:hidden text-primary my-2">
            <ArrowRight className="h-6 w-6 transform rotate-90" />
          </div>
        </div>
        
        {/* Output Section */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mb-2 text-sm font-medium text-muted-foreground">Output Address</div>
          <div 
            className="relative w-full max-w-sm p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary transition-colors"
            onClick={() => selectedUtxo.address ? openMempoolLink(selectedUtxo.address, 'address') : null}
          >
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-medium">Receiver</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-sm break-all">
              {selectedUtxo.address}
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-4 bg-card border border-border rounded-lg">
          <h4 className="text-sm font-medium mb-1">Privacy Risk</h4>
          <div className={`text-sm font-medium ${
            selectedUtxo.privacyRisk === 'high' 
              ? 'text-red-500' 
              : selectedUtxo.privacyRisk === 'medium' 
                ? 'text-amber-500' 
                : 'text-green-500'
          }`}>
            {selectedUtxo.privacyRisk.charAt(0).toUpperCase() + selectedUtxo.privacyRisk.slice(1)}
          </div>
        </div>
        
        <div className="p-4 bg-card border border-border rounded-lg">
          <h4 className="text-sm font-medium mb-1">Confirmations</h4>
          <div className="text-sm">{selectedUtxo.confirmations}</div>
        </div>
        
        <div className="p-4 bg-card border border-border rounded-lg">
          <h4 className="text-sm font-medium mb-1">Tags</h4>
          <div className="flex flex-wrap gap-1">
            {selectedUtxo.tags.length > 0 ? (
              selectedUtxo.tags.map((tag, i) => (
                <span 
                  key={i} 
                  className="text-xs px-2 py-1 bg-muted rounded-full"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No tags</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
