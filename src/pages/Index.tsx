
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Coins, FileText, WalletIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center py-12 md:py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          Master Your Bitcoin UTXOs
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
          Unspent Transaction Outputs (UTXOs) are the building blocks of Bitcoin transactions.
          Our tools help you manage them effectively for better privacy, tax efficiency, and portfolio control.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button 
            size="lg" 
            onClick={() => navigate('/wallet-import')}
            className="animate-pulse"
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => navigate('/utxo-table')}
          >
            Explore UTXOs <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <Separator className="my-12" />
      
      {/* Benefits Section */}
      <div className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12">Why UTXO Management Matters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Privacy Card */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Enhanced Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Identify and mitigate privacy risks in your transaction history before making new transactions.
              </p>
            </CardContent>
          </Card>
          
          {/* Tax Efficiency Card */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <FileText className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Tax Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Select specific UTXOs for transactions to optimize tax outcomes and maintain accurate cost basis records.
              </p>
            </CardContent>
          </Card>
          
          {/* Multi-wallet Card */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <WalletIcon className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Wallet Consolidation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage UTXOs across multiple wallets and addresses from one unified dashboard.
              </p>
            </CardContent>
          </Card>
          
          {/* Portfolio Analysis Card */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <Coins className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Portfolio Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track acquisition dates, cost basis, and realized/unrealized gains for detailed portfolio insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Separator className="my-12" />
      
      {/* Educational Block */}
      <div className="max-w-4xl mx-auto py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Understanding UTXOs</h2>
        
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-xl font-semibold mb-4">What exactly is a UTXO?</h3>
              <p className="mb-4 text-muted-foreground">
                Unlike traditional bank accounts with balances, Bitcoin uses a UTXO model where your "balance" 
                is actually a collection of discrete unspent outputs from previous transactions.
              </p>
              <p className="mb-4 text-muted-foreground">
                Think of UTXOs as individual bills in your wallet. When you spend Bitcoin, you don't just 
                remove a portion of a balance – you use specific "bills" and may receive "change" back.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/risk-simulator')}
                className="mt-2"
              >
                Try the Risk Simulator
              </Button>
            </div>
            
            <div className="bg-background p-6 rounded-lg border border-border relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full"></div>
              <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full"></div>
              
              <h4 className="font-medium mb-4">UTXO Structure</h4>
              <div className="space-y-3 font-mono text-sm">
                <div className="p-2 bg-muted rounded-md">TxID: Transaction Identifier</div>
                <div className="p-2 bg-muted rounded-md">vout: Output Index</div>
                <div className="p-2 bg-muted rounded-md">amount: Bitcoin Value</div>
                <div className="p-2 bg-muted rounded-md">address: Where It's Locked</div>
                <div className="p-2 bg-muted rounded-md">scriptPubKey: Spending Conditions</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold mb-6">Ready to take control of your Bitcoin?</h3>
          <Button 
            size="lg" 
            onClick={() => navigate('/wallet-import')}
          >
            Import Your Wallet <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Or explore in demo mode to see how our tools can help you manage your UTXOs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
