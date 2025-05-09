
import { UTXO } from "@/types/utxo";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Wallet, Tag } from "lucide-react";
import { useWallet } from "@/store/WalletContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagSelector } from "@/components/utxo/TagSelector";
import { getBitcoinHistoricalPrice } from "@/services/coingeckoService";

interface AddUTXOModalProps {
  open: boolean;
  onOpenChange: (success: boolean) => void;
}

export function AddUTXOModal({ open, onOpenChange }: AddUTXOModalProps) {
  const { selectedCurrency, walletData, tags, importWallet } = useWallet();
  const [txid, setTxid] = useState("");
  const [amount, setAmount] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState<Date | undefined>(new Date());
  const [acquisitionFiatValue, setAcquisitionFiatValue] = useState("");
  const [acquisitionBtcPrice, setAcquisitionBtcPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Define available wallets (for demonstration)
  const availableWallets = walletData ? [walletData.name, "Wallet 2"] : [];

  const fetchBtcPrice = async () => {
    if (!acquisitionDate) return;
    
    setIsLoading(true);
    try {
      const dateString = format(acquisitionDate, "yyyy-MM-dd");
      const price = await getBitcoinHistoricalPrice(dateString, selectedCurrency);
      
      if (price) {
        setAcquisitionBtcPrice(price.toString());
        
        // If no acquisition value is set, suggest one based on the BTC price
        if (!acquisitionFiatValue) {
          const btcAmount = parseFloat(amount) || 0;
          setAcquisitionFiatValue((btcAmount * price).toString());
        }
        
        toast.success("BTC price loaded for selected date");
      } else {
        toast.error("Could not fetch historical BTC price");
      }
    } catch (error) {
      console.error("Error fetching BTC price:", error);
      toast.error("Failed to load BTC price data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagSelection = (tagId: string, remove?: boolean) => {
    if (remove) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else if (!selectedTags.includes(tagId)) {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSubmit = async () => {
    if (!walletData || !amount || !acquisitionDate) {
      toast.error("Amount and acquisition date are required");
      return;
    }

    // Add validation for BTC amount
    const btcAmount = parseFloat(amount);
    if (isNaN(btcAmount) || btcAmount <= 0) {
      toast.error("Please enter a valid BTC amount");
      return;
    }

    // If no wallet is selected, use the default wallet
    const walletName = selectedWallet || walletData.name;

    // Map selected tag IDs to tag names
    const tagNames = selectedTags.map(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag ? tag.name : '';
    }).filter(Boolean);

    // Create new UTXO
    const newUtxo: UTXO = {
      txid: txid || `manual-${Date.now()}`,
      vout: 0,
      address: receiverAddress || "Manual Entry",
      amount: btcAmount,
      confirmations: 6,
      scriptPubKey: "",
      tags: tagNames,
      createdAt: new Date().toISOString(),
      privacyRisk: 'low' as const,
      acquisitionDate: acquisitionDate.toISOString(),
      acquisitionFiatValue: acquisitionFiatValue ? parseFloat(acquisitionFiatValue) : null,
      acquisitionBtcPrice: acquisitionBtcPrice ? parseFloat(acquisitionBtcPrice) : null,
      disposalDate: null,
      disposalFiatValue: null,
      realizedGainFiat: null,
      costAutoPopulated: false,
      notes: notes || null,
      senderAddress: senderAddress || null,
      receiverAddress: receiverAddress || null,
      walletName: walletName !== walletData.name ? walletName : undefined  // Only set if different from default
    };

    // Update wallet data
    const updatedWalletData = {
      ...walletData,
      totalBalance: walletData.totalBalance + btcAmount,
      utxos: [...walletData.utxos, newUtxo]
    };

    try {
      importWallet(updatedWalletData);
      toast.success("UTXO added successfully");
      
      // Reset form
      setTxid("");
      setAmount("");
      setSenderAddress("");
      setReceiverAddress("");
      setAcquisitionDate(new Date());
      setAcquisitionFiatValue("");
      setAcquisitionBtcPrice("");
      setNotes("");
      setSelectedWallet("");
      setSelectedTags([]);
      
      // Close modal and trigger refresh by passing true
      onOpenChange(true);
    } catch (error) {
      console.error("Error adding UTXO:", error);
      toast.error("Failed to add UTXO");
      onOpenChange(false);
    }
  };
  
  const handleCancel = () => {
    // Reset form
    setTxid("");
    setAmount("");
    setSenderAddress("");
    setReceiverAddress("");
    setAcquisitionDate(new Date());
    setAcquisitionFiatValue("");
    setAcquisitionBtcPrice("");
    setNotes("");
    setSelectedWallet("");
    setSelectedTags([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()} modal={true}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New UTXO</DialogTitle>
          <DialogDescription>
            Enter the details for your new UTXO. Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="txid" className="text-sm font-medium">
                TXID
              </label>
              <Input
                id="txid"
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                placeholder="Enter transaction ID or leave empty for auto-generate"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (BTC) *
              </label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter BTC amount"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="senderAddress" className="text-sm font-medium">
                Sender Address
              </label>
              <Input
                id="senderAddress"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder="Enter sender address"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="receiverAddress" className="text-sm font-medium">
                Receiver Address
              </label>
              <Input
                id="receiverAddress"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="Enter receiver address"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="wallet" className="text-sm font-medium">
              Wallet
            </label>
            <Select value={selectedWallet} onValueChange={setSelectedWallet}>
              <SelectTrigger id="wallet" className="w-full">
                <SelectValue placeholder={walletData ? walletData.name : "Select wallet"} />
              </SelectTrigger>
              <SelectContent>
                {availableWallets.map((wallet) => (
                  <SelectItem key={wallet} value={wallet}>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      <span>{wallet}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leave empty to use your default wallet
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Acquisition Date *</label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {acquisitionDate ? (
                    format(acquisitionDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={acquisitionDate}
                  onSelect={(date) => {
                    setAcquisitionDate(date || undefined);
                    setIsCalendarOpen(false);
                    // Clear the BTC price when date changes
                    setAcquisitionBtcPrice("");
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchBtcPrice}
                disabled={!acquisitionDate || isLoading}
              >
                {isLoading ? "Loading..." : "Get BTC Price for Date"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="btcPrice" className="text-sm font-medium">
                BTC Market Price ({selectedCurrency.toUpperCase()})
              </label>
              <Input
                id="btcPrice"
                type="number"
                step="0.01"
                min="0"
                value={acquisitionBtcPrice}
                onChange={(e) => setAcquisitionBtcPrice(e.target.value)}
                placeholder={`BTC price in ${selectedCurrency.toUpperCase()}`}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="fiatValue" className="text-sm font-medium">
                Acquisition Value ({selectedCurrency.toUpperCase()})
              </label>
              <Input
                id="fiatValue"
                type="number"
                step="0.01"
                min="0"
                value={acquisitionFiatValue}
                onChange={(e) => setAcquisitionFiatValue(e.target.value)}
                placeholder={`Value in ${selectedCurrency.toUpperCase()}`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Tags</span>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="h-8"
                onClick={() => setIsTagSelectorOpen(true)}
              >
                <Tag className="h-4 w-4 mr-1" />
                Manage Tags
              </Button>
            </label>
            <div className="flex flex-wrap gap-2 min-h-10 p-2 border rounded-md">
              {selectedTags.length > 0 ? (
                selectedTags.map((tagId) => {
                  const tag = tags.find(t => t.id === tagId);
                  return tag ? (
                    <span 
                      key={tag.id} 
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white" 
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ) : null;
                })
              ) : (
                <span className="text-muted-foreground text-sm">No tags selected</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this UTXO"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add UTXO</Button>
        </div>

        {/* Tag Selector Dialog */}
        {isTagSelectorOpen && (
          <Dialog open={isTagSelectorOpen} onOpenChange={setIsTagSelectorOpen} modal={true}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Manage Tags</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-2" 
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        <span>{tag.name}</span>
                      </div>
                      <Button
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTagSelection(tag.id, selectedTags.includes(tag.id))}
                      >
                        {selectedTags.includes(tag.id) ? "Remove" : "Add"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setIsTagSelectorOpen(false)}>Done</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

