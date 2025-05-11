import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Upload, FileJson, Watch, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/store/WalletContext";
import { mockWalletData } from "@/data/mockData";

const WalletImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { importFromJson, importWallet } = useWallet();
  const [jsonData, setJsonData] = useState("");
  const [descriptor, setDescriptor] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJsonImport = () => {
    try {
      setIsLoading(true);
      importFromJson(jsonData);
      toast({
        title: "Wallet imported successfully",
        description: "Your wallet has been imported from JSON data",
      });
      navigate("/utxo-map"); // Redirect to map view instead of table
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Import failed",
        description: "The JSON data is invalid or malformed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDescriptorImport = () => {
    setIsLoading(true);
    // In a full implementation, this would parse the descriptor
    // For now, we'll just show an error since it's not implemented
    toast({
      variant: "destructive",
      title: "Not implemented",
      description: "Descriptor import is not available in this prototype",
    });
    setIsLoading(false);
  };

  const handleDemoWallet = () => {
    setIsLoading(true);
    try {
      // Import full mock wallet data with all 14 UTXOs
      importWallet(mockWalletData);
      toast({
        title: "Demo wallet loaded",
        description: "A demo wallet has been loaded with all sample data",
      });
      navigate("/utxo-map"); // Redirect to map view instead of table
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to load demo wallet",
        description: "An error occurred while loading the demo wallet",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonData(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="flex items-center mb-8">
        <Shield className="h-10 w-10 text-bitcoin mr-3" />
        <h1 className="text-3xl font-bold text-foreground">Wallet Import</h1>
      </div>
      
      <Card className="bg-dark-card border-dark-border shadow-lg">
        <CardHeader>
          <CardTitle>Import Your Bitcoin Wallet</CardTitle>
          <CardDescription>
            Choose a method to import your Bitcoin wallet for UTXO analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="json" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="json">
                <FileJson className="mr-2 h-4 w-4" />
                JSON Import
              </TabsTrigger>
              <TabsTrigger value="descriptor">
                <ArrowRight className="mr-2 h-4 w-4" />
                Descriptor
              </TabsTrigger>
              <TabsTrigger value="demo">
                <Watch className="mr-2 h-4 w-4" />
                Demo Wallet
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="json" className="space-y-4">
              <div className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Input 
                    id="fileUpload"
                    type="file" 
                    accept=".json"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                </div>
                
                <div className="grid w-full gap-1.5">
                  <textarea
                    className="min-h-[200px] rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Paste your wallet JSON data here..."
                    value={jsonData}
                    onChange={(e) => setJsonData(e.target.value)}
                  />
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Format example:</p>
                  <pre className="p-2 bg-dark-lighter rounded-md overflow-x-auto text-xs mt-1">
                    {`{
  "name": "My Wallet",
  "utxos": [
    {
      "txid": "1a2b3c...",
      "vout": 0,
      "address": "bc1q...",
      "amount": 0.25,
      "confirmations": 145,
      "scriptPubKey": "0014..."
    }
  ]
}`}
                  </pre>
                </div>
              </div>
              
              <Button 
                onClick={handleJsonImport}
                disabled={!jsonData || isLoading}
                className="w-full"
              >
                {isLoading ? "Importing..." : "Import Wallet"}
              </Button>
            </TabsContent>
            
            <TabsContent value="descriptor" className="space-y-4">
              <div className="space-y-4">
                <Input
                  placeholder="Enter your xpub or descriptor..."
                  value={descriptor}
                  onChange={(e) => setDescriptor(e.target.value)}
                />
                
                <div className="text-xs text-muted-foreground">
                  <p>Example formats:</p>
                  <p className="pt-1">• xpub descriptor: <span className="text-bitcoin">xpub6CUGRUo...</span></p>
                  <p className="pt-1">• Output descriptor: <span className="text-bitcoin">wpkh([fingerprint/derivation]xpub.../0/*)</span></p>
                </div>
              </div>
              
              <Button 
                onClick={handleDescriptorImport}
                disabled={!descriptor || isLoading}
                className="w-full"
              >
                {isLoading ? "Importing..." : "Import from Descriptor"}
              </Button>
            </TabsContent>
            
            <TabsContent value="demo" className="space-y-4">
              <div className="p-4 border border-dashed border-bitcoin rounded-md text-center space-y-4">
                <Watch className="mx-auto h-12 w-12 text-bitcoin" />
                <div>
                  <h3 className="text-lg font-medium">Load Demo Wallet</h3>
                  <p className="text-muted-foreground">
                    Load a pre-configured wallet with sample UTXOs and privacy scenarios for demonstration
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={handleDemoWallet}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? "Loading..." : "Load Demo Wallet"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-dark-border pt-4">
          <p className="text-xs text-muted-foreground">
            All data is processed locally. No information leaves your browser.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default WalletImport;
