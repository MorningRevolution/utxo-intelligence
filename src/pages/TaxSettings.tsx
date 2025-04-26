
import { FileText } from "lucide-react";
import { JurisdictionSelector } from "@/components/tax/JurisdictionSelector";
import { TaxRulesSummary } from "@/components/tax/TaxRulesSummary";
import { TaxOverrideForm } from "@/components/tax/TaxOverrideForm";

const TaxSettings = () => {
  return (
    <div className="container px-2 md:px-4 py-6">
      <div className="flex items-center mb-6">
        <FileText className="h-10 w-10 text-bitcoin mr-3" />
        <h1 className="text-2xl font-bold text-foreground">Tax Settings</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        <JurisdictionSelector />
        <TaxRulesSummary />
        <TaxOverrideForm />
      </div>
    </div>
  );
};

export default TaxSettings;
