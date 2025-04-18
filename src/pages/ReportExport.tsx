import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Download, 
  Eye, 
  Shield, 
  AlertTriangle, 
  Tag, 
  CreditCard 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/store/WalletContext";
import { 
  createDownloadableJSON, 
  createDownloadableCSV, 
  formatBTC, 
  getRiskColor, 
  calculatePrivacyScore 
} from "@/utils/utxo-utils";

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

  const privacyScore = walletData ? calculatePrivacyScore(walletData.utxos) : 0;
  const getScoreColor = () => {
    if (privacyScore >= 80) return "bg-risk-low";
    if (privacyScore >= 50) return "bg-risk-medium";
    return "bg-risk-high";
  };

  return (
    <div className="container px-2 md:px-4 py-6">
      <div className="flex items-center mb-6">
        <FileText className="h-10 w-10 text-bitcoin mr-3" />
        <h1 className="text-2xl font-bold text-foreground">Report & Export</h1>
      </div>

      {/* Wallet Summary Card */}
      <div className="grid grid-cols-1 gap-6">
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

            {!report && (
              <Button 
                onClick={handleGenerateReport}
                className="w-full"
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Full Privacy Report
              </Button>
            )}
          </CardContent>
        </Card>
        
        {report && (
          <>
            {/* Privacy Analysis Report */}
            <Card className="bg-dark-card border-dark-border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-bitcoin" />
                  Privacy Analysis Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-dark-lighter rounded-md">
                  <h3 className="text-lg font-medium mb-3">Recommendations</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Tag Distribution</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.tagBreakdown.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4">
                            No tags found
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.tagBreakdown.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Badge variant="outline">{item.tagName}</Badge>
                            </TableCell>
                            <TableCell>{item.count}</TableCell>
                            <TableCell>{formatBTC(item.totalAmount)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Risky UTXOs</h3>
                  {report.riskyUtxos.length === 0 ? (
                    <div className="text-center p-4 border border-dashed border-dark-border rounded-md">
                      <AlertTriangle className="mx-auto h-8 w-8 text-bitcoin mb-2" />
                      <p className="text-muted-foreground">No high-risk UTXOs found in your wallet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>TXID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead>Tags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.riskyUtxos.map((utxo, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">
                              {utxo.txid.substring(0, 8)}...{utxo.txid.substring(utxo.txid.length - 8)}
                            </TableCell>
                            <TableCell>{formatBTC(utxo.amount)}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full ${getRiskColor(utxo.privacyRisk)}`}></div>
                                <span className="ml-2 capitalize">{utxo.privacyRisk}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {utxo.tags.map((tag, j) => (
                                  <Badge key={j} variant="outline" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Export Options */}
            <Card className="bg-dark-card border-dark-border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="mr-2 h-5 w-5 text-bitcoin" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-dashed border-dark-border rounded-md text-center space-y-4">
                    <FileText className="mx-auto h-12 w-12 text-bitcoin" />
                    <div>
                      <h3 className="text-lg font-medium">Export Full Report</h3>
                      <p className="text-muted-foreground text-sm">
                        Download complete privacy analysis in JSON format
                      </p>
                    </div>
                    <Button
                      onClick={handleDownloadJSON}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download JSON
                    </Button>
                  </div>
                  
                  <div className="p-4 border border-dashed border-dark-border rounded-md text-center space-y-4">
                    <Tag className="mx-auto h-12 w-12 text-bitcoin" />
                    <div>
                      <h3 className="text-lg font-medium">Export UTXOs</h3>
                      <p className="text-muted-foreground text-sm">
                        Export all UTXOs and tags in CSV format
                      </p>
                    </div>
                    <Button
                      onClick={handleDownloadCSV}
                      variant="outline"
                      className="w-full"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportExport;
