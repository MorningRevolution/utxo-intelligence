
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { taxJurisdictions } from "@/data/taxConfigs";
import { useTaxConfig } from "@/store/TaxConfigContext";

export function JurisdictionSelector() {
  const { selectedJurisdiction, setSelectedJurisdiction } = useTaxConfig();

  const handleJurisdictionChange = (jurisdictionId: string) => {
    const jurisdiction = taxJurisdictions.find(j => j.id === jurisdictionId);
    if (jurisdiction) {
      setSelectedJurisdiction(jurisdiction);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Jurisdiction</CardTitle>
        <CardDescription>
          Select your tax jurisdiction to apply the appropriate rules and calculations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={selectedJurisdiction?.id}
          onValueChange={handleJurisdictionChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            {taxJurisdictions.map((jurisdiction) => (
              <SelectItem key={jurisdiction.id} value={jurisdiction.id}>
                {jurisdiction.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
