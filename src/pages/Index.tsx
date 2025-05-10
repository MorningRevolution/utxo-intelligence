
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Coins, FileText, WalletIcon, Info, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const Index = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
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
              onClick={handleGetStarted}
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
      </div>
      
      <Separator className="my-12" />
      
      {/* What is a UTXO - Educational Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">What is a UTXO?</h2>
          
          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">The Building Block of Bitcoin</h3>
                <p className="mb-4 text-muted-foreground">
                  UTXO stands for <strong>Unspent Transaction Output</strong>. Unlike traditional bank accounts with balances, 
                  Bitcoin uses a UTXO model where your "balance" is actually a collection of discrete unspent outputs from 
                  previous transactions.
                </p>
                <p className="mb-4 text-muted-foreground">
                  Think of UTXOs as individual bills in your wallet. When you spend Bitcoin, you don't just 
                  remove a portion of a balance – you use specific "bills" and may receive "change" back.
                </p>
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

            <div className="bg-muted p-6 rounded-lg border border-border">
              <div className="flex items-start">
                <Info className="text-primary mr-4 h-6 w-6 shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium mb-2">Why UTXOs Matter for Your Bitcoin Strategy</h4>
                  <p className="text-sm text-muted-foreground">
                    Understanding and managing your UTXOs is crucial for maintaining privacy, optimizing taxes, 
                    and gaining greater control over your Bitcoin holdings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Separator className="my-12" />
      
      {/* Benefits Section - Enhanced */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12">Why UTXO Management Matters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Privacy Card - Enhanced */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>Enhanced Privacy</CardTitle>
              <CardDescription>Protect your financial sovereignty</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Identify and mitigate privacy risks in your transaction history. Avoid unintentionally linking 
                your financial activities when making new transactions.
              </p>
              <div className="mt-4 flex items-center text-sm">
                <EyeOff className="h-4 w-4 text-primary mr-2" />
                <span>Prevents blockchain analysis</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Tax Efficiency Card - Enhanced */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>Tax Optimization</CardTitle>
              <CardDescription>Improve your tax outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Select specific UTXOs for transactions to optimize tax outcomes and maintain accurate cost basis records
                for better tax reporting.
              </p>
              <div className="mt-4 flex items-center text-sm">
                <Coins className="h-4 w-4 text-primary mr-2" />
                <span>Specific UTXO selection for tax strategy</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Multi-wallet Card - Enhanced */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <WalletIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>Wallet Consolidation</CardTitle>
              <CardDescription>Unified wallet management</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage UTXOs across multiple wallets and addresses from one unified dashboard for better 
                organization and control.
              </p>
              <div className="mt-4 flex items-center text-sm">
                <Eye className="h-4 w-4 text-primary mr-2" />
                <span>Complete view of all holdings</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Portfolio Analysis Card - Enhanced */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Coins className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>Portfolio Analysis</CardTitle>
              <CardDescription>Advanced insights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track acquisition dates, cost basis, and realized/unrealized gains for detailed portfolio insights
                and better investment decisions.
              </p>
              <div className="mt-4 flex items-center text-sm">
                <Lock className="h-4 w-4 text-primary mr-2" />
                <span>Accurate performance tracking</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Separator className="my-12" />
      
      {/* Financial Sovereignty Section */}
      <div className="container mx-auto px-4 py-12 mb-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Reclaim Your Financial Sovereignty</h2>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-8">
            <div className="prose max-w-none text-center">
              <p className="text-lg">
                Bitcoin empowers individuals with unprecedented control over their money. UTXO Intelligence helps 
                you exercise that control with precision and confidence.
              </p>
              
              <div className="mt-10 flex justify-center">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                >
                  Start Managing Your UTXOs <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
