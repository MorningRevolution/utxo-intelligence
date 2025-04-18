
import { Download, FileText, Tag, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExportOptionsProps {
  onDownloadJSON: () => void;
  onDownloadCSV: () => void;
}

const ExportOptions = ({ onDownloadJSON, onDownloadCSV }: ExportOptionsProps) => {
  return (
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
              onClick={onDownloadJSON}
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
              onClick={onDownloadCSV}
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
  );
};

export default ExportOptions;
