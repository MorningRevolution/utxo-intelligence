
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/store/WalletContext";
import { calculatePrivacyScore, formatBTC } from "@/utils/utxo-utils";
import { Progress } from "@/components/ui/progress";
import { Wallet, ShieldAlert, AlertTriangle, CheckCircle, FileText, Table, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { walletData } = useWallet();
  
  if (!walletData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-6">Welcome to UTXO Intelligence</h1>
          <p className="text-xl text-gray-400 mb-8">
            Your Bitcoin UTXO privacy analysis dashboard
          </p>
        </div>

        <Card className="w-full max-w-md bg-dark-card border-dark-lighter">
          <CardHeader>
            <CardTitle className="text-2xl">Get Started</CardTitle>
            <CardDescription>Import your wallet to begin UTXO analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/wallet-import">
              <Button className="w-full bg-bitcoin hover:bg-bitcoin-dark">
                <Wallet className="mr-2 h-4 w-4" />
                Import Wallet
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const privacyScore = calculatePrivacyScore(walletData.utxos);
  const highRiskUtxos = walletData.utxos.filter(u => u.privacyRisk === 'high');
  const mediumRiskUtxos = walletData.utxos.filter(u => u.privacyRisk === 'medium');
  const lowRiskUtxos = walletData.utxos.filter(u => u.privacyRisk === 'low');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-dark-card border-dark-lighter">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-400 text-sm font-normal">Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{walletData.name}</div>
            <p className="text-sm text-gray-400">{walletData.utxos.length} UTXOs</p>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-card border-dark-lighter">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-400 text-sm font-normal">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBTC(walletData.totalBalance)}</div>
            <p className="text-sm text-gray-400">Total Balance</p>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-card border-dark-lighter">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-400 text-sm font-normal">Privacy Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{privacyScore.toFixed(0)}/100</div>
              {privacyScore >= 80 ? (
                <CheckCircle className="text-risk-low h-5 w-5" />
              ) : privacyScore >= 50 ? (
                <AlertTriangle className="text-risk-medium h-5 w-5" />
              ) : (
                <ShieldAlert className="text-risk-high h-5 w-5" />
              )}
            </div>
            <div className="mt-2">
              <div className={`h-2 w-full rounded-full ${
                  privacyScore >= 80 
                    ? "bg-risk-low/20" 
                    : privacyScore >= 50 
                    ? "bg-risk-medium/20" 
                    : "bg-risk-high/20"
                }`}>
                <div 
                  className={`h-2 rounded-full ${
                    privacyScore >= 80 
                      ? "bg-risk-low" 
                      : privacyScore >= 50 
                      ? "bg-risk-medium" 
                      : "bg-risk-high"
                  }`}
                  style={{ width: `${privacyScore}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-card border-dark-lighter">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-400 text-sm font-normal">UTXOs by Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold text-risk-low">{lowRiskUtxos.length}</div>
                <p className="text-xs text-gray-400">Low</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-risk-medium">{mediumRiskUtxos.length}</div>
                <p className="text-xs text-gray-400">Medium</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-risk-high">{highRiskUtxos.length}</div>
                <p className="text-xs text-gray-400">High</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-dark-card border-dark-lighter">
          <CardHeader>
            <CardTitle>Privacy Risk Distribution</CardTitle>
            <CardDescription>UTXO breakdown by privacy risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-12 w-full rounded-md overflow-hidden">
              {lowRiskUtxos.length > 0 && (
                <div 
                  className="bg-risk-low h-full"
                  style={{ width: `${(lowRiskUtxos.length / walletData.utxos.length) * 100}%` }}
                />
              )}
              {mediumRiskUtxos.length > 0 && (
                <div 
                  className="bg-risk-medium h-full"
                  style={{ width: `${(mediumRiskUtxos.length / walletData.utxos.length) * 100}%` }}
                />
              )}
              {highRiskUtxos.length > 0 && (
                <div 
                  className="bg-risk-high h-full"
                  style={{ width: `${(highRiskUtxos.length / walletData.utxos.length) * 100}%` }}
                />
              )}
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-risk-low mr-2" />
                  <span>Low Risk</span>
                </div>
                <div>
                  <span className="font-medium">{lowRiskUtxos.length} UTXOs</span>
                  <span className="text-gray-400 ml-2">
                    ({((lowRiskUtxos.length / walletData.utxos.length) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-risk-medium mr-2" />
                  <span>Medium Risk</span>
                </div>
                <div>
                  <span className="font-medium">{mediumRiskUtxos.length} UTXOs</span>
                  <span className="text-gray-400 ml-2">
                    ({((mediumRiskUtxos.length / walletData.utxos.length) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-risk-high mr-2" />
                  <span>High Risk</span>
                </div>
                <div>
                  <span className="font-medium">{highRiskUtxos.length} UTXOs</span>
                  <span className="text-gray-400 ml-2">
                    ({((highRiskUtxos.length / walletData.utxos.length) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-card border-dark-lighter">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Tools to manage your UTXOs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/utxo-table">
                <Button variant="secondary" className="w-full">
                  <Table className="mr-2 h-4 w-4" />
                  View UTXOs
                </Button>
              </Link>
              
              <Link to="/risk-simulator">
                <Button variant="secondary" className="w-full">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Risk Simulator
                </Button>
              </Link>
              
              <Link to="/report-export">
                <Button variant="secondary" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </Link>
              
              <Link to="/ai-assistant">
                <Button variant="secondary" className="w-full">
                  <Bot className="mr-2 h-4 w-4" />
                  AI Assistant
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
