import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Wallet, 
  Table, 
  AlertTriangle, 
  FileText, 
  Bot, 
  ArrowRight, 
  CreditCard,
  Tag,
  Eye,
  Shield,
  ChevronRight,
  Settings,
  ChartLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWallet } from "@/store/WalletContext";
import { formatBTC, calculatePrivacyScore } from "@/utils/utxo-utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { walletData, hasWallet } = useWallet();

  const privacyScore = walletData ? calculatePrivacyScore(walletData.utxos) : 0;
  const getScoreColor = () => {
    if (privacyScore >= 80) return "bg-risk-low";
    if (privacyScore >= 50) return "bg-risk-medium";
    return "bg-risk-high";
  };

  const getScoreText = () => {
    if (privacyScore >= 80) return "Good";
    if (privacyScore >= 50) return "Fair";
    return "Poor";
  };

  return (
    <div className="container py-6">
      <div className="flex items-center mb-8">
        <Shield className="h-10 w-10 text-bitcoin mr-3" />
        <h1 className="text-3xl font-bold text-foreground">UTXO Intelligence</h1>
      </div>

      {!hasWallet ? (
        <Card className="bg-dark-card border-dark-border shadow-lg">
          <CardHeader>
            <CardTitle>Welcome to UTXO Intelligence</CardTitle>
            <CardDescription>
              A privacy-focused UTXO management and tagging system for Bitcoin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              This tool lets you analyze your Bitcoin UTXOs, assess privacy risks, and simulate transactions to identify potential privacy leaks.
            </p>
            <div className="rounded-md bg-dark-lighter p-4">
              <h3 className="font-medium mb-2">To get started:</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Import a wallet or load the demo wallet to explore the features.
              </p>
              <Button onClick={() => navigate("/wallet-import")}>
                <Wallet className="mr-2 h-5 w-5" />
                Import Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-dark-card border-dark-border shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Wallet Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-bitcoin">
                {formatBTC(walletData!.totalBalance)}
              </div>
              <p className="text-muted-foreground text-sm mt-1">{walletData?.utxos.length} UTXOs</p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" size="sm" onClick={() => navigate("/utxo-table")}>
                <Eye className="mr-2 h-4 w-4" />
                View UTXOs
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="bg-dark-card border-dark-border shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Privacy Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-1">
                <span className="text-3xl font-bold text-bitcoin">
                  {privacyScore.toFixed(0)}/100
                </span>
                <span className={`text-${getScoreColor().replace('bg-', '')}`}>
                  {getScoreText()}
                </span>
              </div>
              <Progress value={privacyScore} className={getScoreColor()} />
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" size="sm" onClick={() => navigate("/report-export")}>
                <FileText className="mr-2 h-4 w-4" />
                View Full Report
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="bg-dark-card border-dark-border shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-1">
                <div className="flex gap-2 items-center">
                  <div className="w-3 h-3 rounded-full bg-risk-high"></div>
                  <span>High Risk</span>
                </div>
                <span>{walletData?.utxos.filter(u => u.privacyRisk === 'high').length}</span>
              </div>
              <div className="flex justify-between mb-1">
                <div className="flex gap-2 items-center">
                  <div className="w-3 h-3 rounded-full bg-risk-medium"></div>
                  <span>Medium Risk</span>
                </div>
                <span>{walletData?.utxos.filter(u => u.privacyRisk === 'medium').length}</span>
              </div>
              <div className="flex justify-between">
                <div className="flex gap-2 items-center">
                  <div className="w-3 h-3 rounded-full bg-risk-low"></div>
                  <span>Low Risk</span>
                </div>
                <span>{walletData?.utxos.filter(u => u.privacyRisk === 'low').length}</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" size="sm" onClick={() => navigate("/risk-simulator")}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Simulate Transaction
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-dark-card border-dark-border shadow-lg">
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="bg-dark-lighter p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-bitcoin" />
              </div>
              <div>
                <h3 className="font-medium">UTXO Management</h3>
                <p className="text-muted-foreground text-sm">
                  View all your UTXOs, track confirmations, and monitor balances in one place
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="bg-dark-lighter p-3 rounded-lg">
                <Tag className="h-6 w-6 text-bitcoin" />
              </div>
              <div>
                <h3 className="font-medium">Custom Tagging</h3>
                <p className="text-muted-foreground text-sm">
                  Create and apply custom tags to organize UTXOs by source, purpose, or privacy level
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="bg-dark-lighter p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-bitcoin" />
              </div>
              <div>
                <h3 className="font-medium">Privacy Risk Simulation</h3>
                <p className="text-muted-foreground text-sm">
                  Simulate transactions to analyze potential privacy implications before sending
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="bg-dark-lighter p-3 rounded-lg">
                <ChartLine className="h-6 w-6 text-bitcoin" />
              </div>
              <div>
                <h3 className="font-medium">Portfolio Analysis</h3>
                <p className="text-muted-foreground text-sm">
                  Track your Bitcoin portfolio value, cost basis, and unrealized gains over time
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate("/wallet-import")} disabled={hasWallet}>
              <ArrowRight className="mr-2 h-5 w-5" />
              {hasWallet ? 'Wallet Already Imported' : 'Get Started'}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="bg-dark-card border-dark-border shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/wallet-import")}
            >
              <Wallet className="mr-2 h-5 w-5" />
              {hasWallet ? 'Update Wallet' : 'Import Wallet'}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/utxo-table")}
              disabled={!hasWallet}
            >
              <Table className="mr-2 h-5 w-5" />
              Browse UTXOs
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/portfolio")}
              disabled={!hasWallet}
            >
              <ChartLine className="mr-2 h-5 w-5" />
              Portfolio Dashboard
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/risk-simulator")}
              disabled={!hasWallet}
            >
              <AlertTriangle className="mr-2 h-5 w-5" />
              Simulate Transaction
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/report-export")}
              disabled={!hasWallet}
            >
              <FileText className="mr-2 h-5 w-5" />
              Generate Report
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/ai-assistant")}
            >
              <Bot className="mr-2 h-5 w-5" />
              Ask AI Assistant
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/settings/tax")}
            >
              <Settings className="mr-2 h-5 w-5" />
              Configure Tax Rules
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
