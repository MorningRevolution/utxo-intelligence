
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTaxConfig } from "@/store/TaxConfigContext";
import { useState } from "react";
import { TaxConfig, TaxMethod } from "@/types/tax";

export function TaxOverrideForm() {
  const { selectedJurisdiction } = useTaxConfig();
  const [overrides, setOverrides] = useState<Partial<TaxConfig>>({});

  if (!selectedJurisdiction) {
    return null;
  }

  const { config } = selectedJurisdiction;

  const handleMethodChange = (value: TaxMethod) => {
    setOverrides((prev) => ({ ...prev, defaultMethod: value }));
  };

  const handleLegalTenderChange = (checked: boolean) => {
    setOverrides((prev) => ({ ...prev, isBTCLegalTender: checked }));
  };

  const handleExemptThresholdChange = (value: string) => {
    setOverrides((prev) => ({ ...prev, exemptThreshold: Number(value) }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Rule Overrides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Accounting Method</Label>
          <Select
            value={overrides.defaultMethod || config.defaultMethod}
            onValueChange={handleMethodChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIFO">FIFO</SelectItem>
              <SelectItem value="LIFO">LIFO</SelectItem>
              <SelectItem value="SPECIFIC_ID">Specific ID</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>BTC Legal Tender Status</Label>
          <Switch
            checked={overrides.isBTCLegalTender ?? config.isBTCLegalTender}
            onCheckedChange={handleLegalTenderChange}
          />
        </div>

        <div className="space-y-2">
          <Label>Tax-Free Threshold ({config.exemptThresholdCurrency})</Label>
          <Input
            type="number"
            value={overrides.exemptThreshold ?? config.exemptThreshold ?? 0}
            onChange={(e) => handleExemptThresholdChange(e.target.value)}
            min={0}
          />
        </div>
      </CardContent>
    </Card>
  );
}
