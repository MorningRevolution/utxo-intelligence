
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

interface AddUTXOModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUTXOModal({ open, onOpenChange }: AddUTXOModalProps) {
  const { selectedCurrency } = useWallet();
  const [amount, setAmount] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState<Date | undefined>();
  const [acquisitionFiatValue, setAcquisitionFiatValue] = useState("");
  const [notes, setNotes] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !acquisitionDate) {
      toast.error("Amount and acquisition date are required");
      return;
    }

    // Add validation for BTC amount
    const btcAmount = parseFloat(amount);
    if (isNaN(btcAmount) || btcAmount <= 0) {
      toast.error("Please enter a valid BTC amount");
      return;
    }

    // TODO: Implement actual UTXO creation
    toast.success("UTXO added successfully");
    onOpenChange(false);
    
    // Reset form
    setAmount("");
    setAcquisitionDate(undefined);
    setAcquisitionFiatValue("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                    setAcquisitionDate(date);
                    setIsCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label htmlFor="fiatValue" className="text-sm font-medium">
              Acquisition Value ({selectedCurrency.toUpperCase()}) - Optional
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add UTXO</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
