
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaxConfig } from "@/store/TaxConfigContext";

export function TaxRulesSummary() {
  const { selectedJurisdiction } = useTaxConfig();

  if (!selectedJurisdiction) {
    return null;
  }

  const { config } = selectedJurisdiction;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Rules Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Default Method</p>
          <p className="font-medium">{config.defaultMethod}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Long Term Threshold</p>
          <p className="font-medium">{config.longTermThresholdDays} days</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">BTC Legal Tender Status</p>
          <p className="font-medium">{config.isBTCLegalTender ? "Yes" : "No"}</p>
        </div>
        {config.exemptThreshold && (
          <div>
            <p className="text-sm text-muted-foreground">Tax-Free Threshold</p>
            <p className="font-medium">
              {config.exemptThreshold} {config.exemptThresholdCurrency}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
