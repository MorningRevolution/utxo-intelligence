
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { getBitcoinHistoricalPrice } from "@/services/coingeckoService";

interface AddUTXOModalProps {
  open: boolean;
  onOpenChange: (success: boolean) => void;
}

export function AddUTXOModal({ open, onOpenChange }: AddUTXOModalProps) {
  const { selectedCurrency, walletData, importWallet } = useWallet();
  const [amount, setAmount] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState<Date | undefined>(new Date());
  const [acquisitionFiatValue, setAcquisitionFiatValue] = useState("");
  const [acquisitionBtcPrice, setAcquisitionBtcPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

    // Create new UTXO
    const newUtxo = {
      txid: `manual-${Date.now()}`,
      vout: 0,
      address: "Manual Entry",
      amount: btcAmount,
      confirmations: 6,
      scriptPubKey: "",
      tags: [],
      createdAt: new Date().toISOString(),
      privacyRisk: 'low' as const,
      acquisitionDate: acquisitionDate.toISOString(),
      acquisitionFiatValue: acquisitionFiatValue ? parseFloat(acquisitionFiatValue) : null,
      acquisitionBtcPrice: acquisitionBtcPrice ? parseFloat(acquisitionBtcPrice) : null,
      disposalDate: null,
      disposalFiatValue: null,
      realizedGainFiat: null,
      costAutoPopulated: false,
      notes: notes || null
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
      setAmount("");
      setAcquisitionDate(new Date());
      setAcquisitionFiatValue("");
      setAcquisitionBtcPrice("");
      setNotes("");
      
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
    setAmount("");
    setAcquisitionDate(new Date());
    setAcquisitionFiatValue("");
    setAcquisitionBtcPrice("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New UTXO</DialogTitle>
          <DialogDescription>
            Enter the details for your new UTXO. The acquisition cost will be auto-populated if left empty.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount (BTC)
            </label>
            <Input
              id="amount"
              type="number"
              step="0.00000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter BTC amount"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Acquisition Date</label>
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
            <p className="text-sm text-muted-foreground">
              Price per Bitcoin at acquisition date
            </p>
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
              placeholder={`Enter value in ${selectedCurrency.toUpperCase()}`}
            />
            <p className="text-sm text-muted-foreground">
              Total amount paid for this UTXO
            </p>
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
      </DialogContent>
    </Dialog>
  );
}
