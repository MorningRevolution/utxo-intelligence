
import { useState, useEffect } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useWallet } from "@/store/WalletContext";
import { UTXO } from "@/types/utxo";
import { Textarea } from "@/components/ui/textarea";
import { formatBTC } from "@/utils/utxo-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormDescription
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { AlertTriangle } from "lucide-react";

interface CostBasisFormValues {
  acquisitionFiatValue: string;
  notes: string;
}

interface CostBasisEditorProps {
  utxo: UTXO;
  onClose: () => void;
}

export function CostBasisEditor({ utxo, onClose }: CostBasisEditorProps) {
  const { 
    updateUtxoCostBasis, 
    autoPopulateUTXOCostBasis, 
    walletData, 
    selectedCurrency 
  } = useWallet();
  
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [acquisitionDate, setAcquisitionDate] = useState<Date | undefined>(
    utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : undefined
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  
  const form = useForm<CostBasisFormValues>({
    defaultValues: {
      acquisitionFiatValue: utxo.acquisitionFiatValue !== null ? utxo.acquisitionFiatValue.toString() : "",
      notes: utxo.notes || ""
    }
  });

  // Reset form when UTXO changes
  useEffect(() => {
    form.reset({
      acquisitionFiatValue: utxo.acquisitionFiatValue !== null ? utxo.acquisitionFiatValue.toString() : "",
      notes: utxo.notes || ""
    });
    
    if (utxo.acquisitionDate) {
      setAcquisitionDate(new Date(utxo.acquisitionDate));
    }
  }, [utxo, form]);
  
  // Validate the acquisition date
  useEffect(() => {
    setDateError(null);
    
    if (acquisitionDate) {
      const currentDate = new Date();
      
      if (isAfter(acquisitionDate, currentDate)) {
        setDateError("Acquisition date cannot be in the future");
      }
    }
  }, [acquisitionDate]);

  const handleSave = () => {
    try {
      const values = form.getValues();
      const fiatValue = values.acquisitionFiatValue === "" 
        ? null 
        : parseFloat(values.acquisitionFiatValue);
      
      // Format date as ISO string for storage
      const formattedDate = acquisitionDate ? format(acquisitionDate, "yyyy-MM-dd") : null;
      
      updateUtxoCostBasis(
        utxo.txid,
        formattedDate,
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
    if (!acquisitionDate) {
      toast({
        title: "Acquisition date required",
        description: "Please select an acquisition date before auto-populating.",
        variant: "destructive",
      });
      return;
    }
    
    const utxoId = utxo.txid;
    
    setIsLoading(true);
    try {
      const success = await autoPopulateUTXOCostBasis(utxoId);
      
      if (success) {
        const updatedUtxo = walletData?.utxos.find(u => u.txid === utxoId);
        
        if (updatedUtxo) {
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

  const getCurrencySymbol = () => {
    switch (selectedCurrency) {
      case 'usd': return '$';
      case 'eur': return '€';
      case 'gbp': return '£';
      case 'jpy': return '¥';
      case 'aud': return 'A$';
      case 'cad': return 'C$';
      default: return '$';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${getCurrencySymbol()}${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Edit Cost Basis</h3>
        <div className="text-muted-foreground text-sm mb-4">
          <p>UTXO: {utxo.txid.substring(0, 8)}...{utxo.txid.substring(utxo.txid.length - 8)}</p>
          <p>Amount: {formatBTC(utxo.amount)}</p>
          {utxo.acquisitionBtcPrice !== null && (
            <p>BTC Market Price at Acquisition: {formatCurrency(utxo.acquisitionBtcPrice)} per BTC</p>
          )}
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
                  disabled={(date) => isAfter(date, new Date())}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            {dateError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{dateError}</AlertDescription>
              </Alert>
            )}
          </div>

          <FormField
            control={form.control}
            name="acquisitionFiatValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Acquisition Value ({selectedCurrency.toUpperCase()})
                </FormLabel>
                <FormDescription>
                  The total amount paid to acquire this UTXO
                </FormDescription>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={`Cost in ${selectedCurrency.toUpperCase()}`}
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
                disabled={isLoading || !acquisitionDate}
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
