
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/store/WalletContext";
import { createDownloadableJSON, createDownloadableCSV } from "@/utils/utxo-utils";
import { Report } from "@/types/utxo";
import WalletSummary from "@/components/report/WalletSummary";
import PrivacyAnalysisReport from "@/components/report/PrivacyAnalysisReport";
import ExportOptions from "@/components/report/ExportOptions";

const ReportExport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { walletData, hasWallet, generateReport } = useWallet();
  const [report, setReport] = useState<Report | null>(null);

  if (!hasWallet) {
    navigate("/wallet-import");
    toast({
      title: "No wallet loaded",
      description: "Please import a wallet first",
    });
    return null;
  }

  const handleGenerateReport = () => {
    try {
      const generatedReport = generateReport();
      setReport(generatedReport);
      toast({
        title: "Report generated",
        description: "Privacy analysis report has been generated successfully",
      });
    } catch (error) {
      console.error("Report generation failed:", error);
      toast({
        variant: "destructive",
        title: "Report generation failed",
        description: "Could not generate the report. Please try again.",
      });
    }
  };

  const handleDownloadJSON = () => {
    if (!walletData) return;
    
    const downloadLink = document.createElement("a");
    downloadLink.href = createDownloadableJSON(report || walletData);
    downloadLink.download = `utxo-intelligence-report-${new Date().toISOString().slice(0, 10)}.json`;
    downloadLink.click();
    
    toast({
      title: "Report downloaded",
      description: "The report has been downloaded in JSON format",
    });
  };

  const handleDownloadCSV = () => {
    if (!walletData) return;
    
    const downloadLink = document.createElement("a");
    downloadLink.href = createDownloadableCSV(walletData.utxos);
    downloadLink.download = `utxo-intelligence-export-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadLink.click();
    
    toast({
      title: "Data exported",
      description: "Your UTXOs have been exported in CSV format",
    });
  };

  return (
    <div className="container px-2 md:px-4 py-6">
      <div className="flex items-center mb-6">
        <FileText className="h-10 w-10 text-bitcoin mr-3" />
        <h1 className="text-2xl font-bold text-foreground">Report & Export</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <WalletSummary 
          walletData={walletData}
          onGenerateReport={handleGenerateReport}
          hasReport={!!report}
        />
        
        {report && (
          <>
            <PrivacyAnalysisReport report={report} />
            <ExportOptions 
              onDownloadJSON={handleDownloadJSON}
              onDownloadCSV={handleDownloadCSV}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ReportExport;
