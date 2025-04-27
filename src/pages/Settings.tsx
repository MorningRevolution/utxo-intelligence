
import { useState } from "react";
import { FileText, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/store/WalletContext";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { selectedCurrency, setSelectedCurrency } = useWallet();
  const [currency, setCurrency] = useState(selectedCurrency);

  const currencies = [
    { id: "usd", label: "USD ($)", symbol: "$" },
    { id: "eur", label: "EUR (€)", symbol: "€" },
    { id: "gbp", label: "GBP (£)", symbol: "£" },
    { id: "jpy", label: "JPY (¥)", symbol: "¥" },
    { id: "aud", label: "AUD (A$)", symbol: "A$" },
    { id: "cad", label: "CAD (C$)", symbol: "C$" },
  ];

  const handleCurrencyChange = (value: string) => {
    setCurrency(value as any);
  };

  const handleSaveCurrency = () => {
    setSelectedCurrency(currency as any);
    toast.success("Currency preference saved");
  };

  return (
    <div className="container px-2 md:px-4 py-6">
      <div className="flex items-center mb-6">
        <FileText className="h-10 w-10 text-bitcoin mr-3" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Currency Settings</CardTitle>
            <CardDescription>
              Select your preferred currency for displaying fiat values
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              className="grid grid-cols-2 gap-4" 
              value={currency} 
              onValueChange={handleCurrencyChange}
            >
              {currencies.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="flex items-center">
                    <CircleDollarSign className="h-4 w-4 mr-2" />
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            <div className="mt-6">
              <Button onClick={handleSaveCurrency}>
                Save Currency Preference
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => navigate("/settings/tax")}
        >
          Tax Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
