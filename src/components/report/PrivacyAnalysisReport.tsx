
import { FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Report, UTXO } from "@/types/utxo";
import { formatBTC, getRiskColor } from "@/utils/utxo-utils";

interface PrivacyAnalysisReportProps {
  report: Report;
}

const PrivacyAnalysisReport = ({ report }: PrivacyAnalysisReportProps) => {
  return (
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
  );
};

export default PrivacyAnalysisReport;
