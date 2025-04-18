
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText } from "lucide-react";
import { WalletData } from "@/types/utxo";
import { formatBTC, calculatePrivacyScore } from "@/utils/utxo-utils";

interface WalletSummaryProps {
  walletData: WalletData | null;
  onGenerateReport: () => void;
  hasReport: boolean;
}

const WalletSummary = ({ walletData, onGenerateReport, hasReport }: WalletSummaryProps) => {
  const privacyScore = walletData ? calculatePrivacyScore(walletData.utxos) : 0;
  
  const getScoreColor = () => {
    if (privacyScore >= 80) return "bg-risk-low";
    if (privacyScore >= 50) return "bg-risk-medium";
    return "bg-risk-high";
  };

  return (
    <Card className="bg-dark-card border-dark-border shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5 text-bitcoin" />
          Wallet Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-dark-lighter rounded-md">
            <div className="text-sm text-muted-foreground mb-1">Wallet Name</div>
            <div className="text-xl font-medium">{walletData?.name}</div>
          </div>
          <div className="p-4 bg-dark-lighter rounded-md">
            <div className="text-sm text-muted-foreground mb-1">Total Balance</div>
            <div className="text-xl font-medium">{walletData && formatBTC(walletData.totalBalance)}</div>
          </div>
          <div className="p-4 bg-dark-lighter rounded-md">
            <div className="text-sm text-muted-foreground mb-1">UTXO Count</div>
            <div className="text-xl font-medium">{walletData?.utxos.length}</div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-2">
            <div className="text-sm text-muted-foreground">Privacy Score</div>
            <div className="text-sm font-medium">{privacyScore.toFixed(0)}/100</div>
          </div>
          <Progress value={privacyScore} className={getScoreColor()} />
        </div>

        {!hasReport && (
          <Button 
            onClick={onGenerateReport}
            className="w-full"
          >
            <FileText className="mr-2 h-4 w-4" />
            Generate Full Privacy Report
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletSummary;
