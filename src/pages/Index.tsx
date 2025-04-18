import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 bg-[#f9f9f9]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1a1a1a] mb-4">UTXO Intelligence</h1>
          <p className="text-xl text-[#4a4a4a]">
            Bitcoin privacy analysis and transaction simulation tool
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="bg-white border border-[#e5e5e5] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1a1a1a]">Wallet Import</CardTitle>
              <CardDescription className="text-[#737373]">
                Import your wallet or use demo mode
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-[#737373] mb-4">
                Start by importing your wallet data or use our demo mode to explore the features.
              </p>
              <Button onClick={() => navigate("/wallet-import")}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#e5e5e5] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1a1a1a]">UTXO Analysis</CardTitle>
              <CardDescription className="text-[#737373]">
                Analyze your Bitcoin UTXO set
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-[#737373] mb-4">
                View, filter, and analyze your UTXOs with our powerful visualization tools.
              </p>
              <Button variant="outline" onClick={() => navigate("/utxo-table")}>
                View UTXO Table <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border border-[#e5e5e5] shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-[#1a1a1a]">Privacy Risk Simulator</CardTitle>
            <CardDescription className="text-[#737373]">
              Test transaction privacy before sending
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-[#737373] mb-4">
              Our risk simulator helps you identify potential privacy leaks before broadcasting your transactions.
              Select UTXOs, define outputs, and get immediate feedback on potential privacy issues.
            </p>
            <Button variant="default" onClick={() => navigate("/risk-simulator")}>
              Try Risk Simulator <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
