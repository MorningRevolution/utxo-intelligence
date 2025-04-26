
import { useState, useEffect } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useWallet } from "@/store/WalletContext";
import { UTXO } from "@/types/utxo";
import { Textarea } from "@/components/ui/textarea";
import { formatBTC } from "@/utils/utxo-utils";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";

interface CostBasisFormValues {
  acquisitionFiatValue: string;
  notes: string;
}

interface CostBasisEditorProps {
  utxo: UTXO;
  onClose: () => void;
}

export function CostBasisEditor({ utxo, onClose }: CostBasisEditorProps) {
  // Move useWallet hook to the top level of the component
  const { updateUtxoCostBasis, autoPopulateUTXOCostBasis, walletData } = useWallet();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [acquisitionDate, setAcquisitionDate] = useState<Date | undefined>(
    utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : undefined
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Initialize the form with default values from the UTXO
  const form = useForm<CostBasisFormValues>({
    defaultValues: {
      acquisitionFiatValue: utxo.acquisitionFiatValue !== null ? utxo.acquisitionFiatValue.toString() : "",
      notes: utxo.notes || ""
    }
  });

  // This effect updates the form values when the utxo prop changes
  // This is crucial for updating the UI after auto-population
  useEffect(() => {
    form.reset({
      acquisitionFiatValue: utxo.acquisitionFiatValue !== null ? utxo.acquisitionFiatValue.toString() : "",
      notes: utxo.notes || ""
    });
    
    if (utxo.acquisitionDate) {
      setAcquisitionDate(new Date(utxo.acquisitionDate));
    }
  }, [utxo, form]);

  const handleSave = () => {
    try {
      const values = form.getValues();
      const fiatValue = values.acquisitionFiatValue === "" 
        ? null 
        : parseFloat(values.acquisitionFiatValue);
      
      // Format the date properly if it exists
      const formattedDate = acquisitionDate ? format(acquisitionDate, "yyyy-MM-dd") : null;
      
      updateUtxoCostBasis(
        utxo.txid,
        formattedDate, // Use the formatted date string
        fiatValue,
        values.notes.trim() === "" ? null : values.notes
      );
      
      toast({
        title: "Cost basis updated",
        description: "The UTXO cost basis information has been saved.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error saving cost basis",
        description: "Failed to save the cost basis information.",
        variant: "destructive",
      });
    }
  };

  const handleAutoPopulate = async () => {
    // Capture the current UTXO ID before async operations
    const utxoId = utxo.txid;
    
    setIsLoading(true);
    try {
      const success = await autoPopulateUTXOCostBasis(utxoId);
      
      if (success) {
        // Get the updated UTXO data after auto-population
        // Direct access to walletData instead of through ref
        const updatedUtxo = walletData?.utxos.find(
          u => u.txid === utxoId
        );
        
        if (updatedUtxo) {
          // Update form values with new data
          form.setValue(
            "acquisitionFiatValue", 
            updatedUtxo.acquisitionFiatValue !== null 
              ? updatedUtxo.acquisitionFiatValue.toString() 
              : ""
          );
          
          if (updatedUtxo.acquisitionDate) {
            setAcquisitionDate(new Date(updatedUtxo.acquisitionDate));
          }
          
          form.setValue("notes", updatedUtxo.notes || "");
          
          toast({
            title: "Cost basis auto-populated",
            description: "Historical price data has been used to populate the cost basis.",
          });
        } else {
          toast({
            title: "Auto-population succeeded",
            description: "However, the updated UTXO could not be retrieved. You may need to refresh.",
          });
        }
      } else {
        toast({
          title: "Auto-population failed",
          description: "Could not retrieve historical price data. Please enter values manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to auto-populate cost basis.",
        variant: "destructive",
      });
      console.error("Auto-populate error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Edit Cost Basis</h3>
        <div className="text-muted-foreground text-sm mb-4">
          <p>UTXO: {utxo.txid.substring(0, 8)}...{utxo.txid.substring(utxo.txid.length - 8)}</p>
          <p>Amount: {formatBTC(utxo.amount)}</p>
        </div>
      </div>

      <Form {...form}>
        <div className="space-y-4">
          <div className="space-y-2">
            <FormLabel>Acquisition Date</FormLabel>
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
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <FormField
            control={form.control}
            name="acquisitionFiatValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Acquisition Value (USD)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Cost in USD"
                    step="0.01"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add notes about this UTXO"
                    rows={3}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                onClick={handleAutoPopulate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                  </>
                ) : (
                  "Auto-populate"
                )}
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}

// Add type definition to window object for walletContext
declare global {
  interface Window {
    walletContext?: ReturnType<typeof useWallet>;
  }
}
