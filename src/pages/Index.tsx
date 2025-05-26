
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Coins, Users, CircleDollarSign, Info, Lock, HandCoins, Heart, Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Emotional Appeal */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            You spent Bitcoin today —<br />
            <span className="text-primary mt-2 block">Did you reveal your identity?</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            Every Bitcoin transaction tells a story. Without proper management,
            these stories can reveal who you are, what you spend on, and how much you own.
            Take back control of your financial privacy.
          </p>
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="animate-pulse"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      <Separator className="my-12" />
      
      {/* What are Bitcoin "Digital Bills" - Simplified Educational Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Understanding Bitcoin "Digital Bills"</h2>
          
          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">How Bitcoin Works (Simply Explained)</h3>
                <p className="mb-4 text-muted-foreground">
                  Think of Bitcoin like digital cash in your wallet. But instead of having one big balance,
                  you have individual "digital bills" of different amounts.
                </p>
                <p className="mb-4 text-muted-foreground">
                  When you spend Bitcoin, you don't just take a portion from your balance – you hand over 
                  specific "digital bills" and might get "change" back, just like at a store.
                </p>
                <p className="mb-4 text-muted-foreground">
                  These digital bills are called UTXOs (Unspent Transaction Outputs), but you can just 
                  think of them as your collection of Bitcoin bills.
                </p>
              </div>
              
              <div className="bg-background p-6 rounded-lg border border-border relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full"></div>
                <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full"></div>
                
                <h4 className="font-medium mb-4">Your Digital Bill Contains:</h4>
                <div className="space-y-3">
                  <div className="p-2 bg-muted rounded-md flex items-center">
                    <CircleDollarSign className="h-5 w-5 text-primary mr-3" />
                    <span>How much Bitcoin it's worth</span>
                  </div>
                  <div className="p-2 bg-muted rounded-md flex items-center">
                    <Lock className="h-5 w-5 text-primary mr-3" />
                    <span>Which wallet can spend it</span>
                  </div>
                  <div className="p-2 bg-muted rounded-md flex items-center">
                    <Info className="h-5 w-5 text-primary mr-3" />
                    <span>When you received it</span>
                  </div>
                  <div className="p-2 bg-muted rounded-md flex items-center">
                    <Handshake className="h-5 w-5 text-primary mr-3" />
                    <span>Where it came from</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted p-6 rounded-lg border border-border">
              <div className="flex items-start">
                <Shield className="text-primary mr-4 h-6 w-6 shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium mb-2">Why This Matters For Your Privacy</h4>
                  <p className="text-sm text-muted-foreground">
                    Managing your digital bills carefully helps keep your financial life private. 
                    Without proper management, someone could trace your spending history and personal details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Separator className="my-12" />

      {/* NEW SECTION: How UTXOs Can Reveal Your Identity */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">How UTXOs Can Reveal Your Identity</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Example 1: Address Reuse */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border bg-muted/50 flex items-center justify-between">
                <h3 className="font-semibold text-lg">Address Reuse</h3>
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <CircleDollarSign className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 h-32 bg-muted rounded-lg flex items-center justify-center p-4">
                  <div className="relative">
                    {/* Simple diagram showing multiple payments to same address */}
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2 mx-auto">
                      <span className="font-mono text-xs">Addr1</span>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                      <div className="w-10 h-10 bg-amber-500/20 rounded flex items-center justify-center">
                        <span className="text-xs">Pay1</span>
                      </div>
                      <div className="w-10 h-10 bg-amber-500/20 rounded flex items-center justify-center">
                        <span className="text-xs">Pay2</span>
                      </div>
                      <div className="w-10 h-10 bg-amber-500/20 rounded flex items-center justify-center">
                        <span className="text-xs">Pay3</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <div className="border-b-2 border-dashed border-destructive w-full"></div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  When you receive multiple payments to the same address and later spend them together, you reveal that all those past payments went to the same person (you).
                </p>
                <div className="mt-4 p-2 bg-destructive/10 rounded-lg">
                  <p className="text-xs text-destructive font-medium">
                    Risk: Links all your different financial activities to one identity
                  </p>
                </div>
              </div>
            </div>
            
            {/* Example 2: Mixed Sources */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border bg-muted/50 flex items-center justify-between">
                <h3 className="font-semibold text-lg">Mixed Sources</h3>
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <HandCoins className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 h-32 bg-muted rounded-lg flex items-center justify-center p-4">
                  <div className="relative">
                    {/* Simple diagram showing mixing incompatible UTXOs */}
                    <div className="flex justify-center gap-4 mb-4">
                      <div className="p-1 bg-blue-500/20 rounded text-xs">
                        Salary
                      </div>
                      <div className="p-1 bg-amber-500/20 rounded text-xs">
                        Market
                      </div>
                    </div>
                    <div className="w-full h-8 flex items-center justify-center">
                      <div className="border-t-2 border-l-2 border-r-2 border-dashed border-destructive w-16 h-6"></div>
                    </div>
                    <div className="w-16 h-10 bg-destructive/20 rounded mx-auto flex items-center justify-center">
                      <span className="text-xs">Spend</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Combining UTXOs with different origins (like salary and marketplace sales) in one transaction links your identity across contexts that should remain separate.
                </p>
                <div className="mt-4 p-2 bg-destructive/10 rounded-lg">
                  <p className="text-xs text-destructive font-medium">
                    Risk: Connects your sensitive activities with your real identity
                  </p>
                </div>
              </div>
            </div>
            
            {/* Example 3: Change Output Tracking */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border bg-muted/50 flex items-center justify-between">
                <h3 className="font-semibold text-lg">Change Output Tracking</h3>
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <Coins className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 h-32 bg-muted rounded-lg flex items-center justify-center p-4">
                  <div className="relative">
                    {/* Simple diagram showing change output revealing full balance */}
                    <div className="w-16 h-10 bg-green-500/20 rounded mx-auto flex items-center justify-center mb-4">
                      <span className="text-xs">10 BTC</span>
                    </div>
                    <div className="flex justify-center gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-6 border-r border-dashed border-destructive"></div>
                        <div className="w-14 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                          <span className="text-xs">0.1 BTC</span>
                        </div>
                        <div className="text-xs mt-1">Payment</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="h-6 border-l border-dashed border-destructive"></div>
                        <div className="w-14 h-8 bg-amber-500/20 rounded flex items-center justify-center">
                          <span className="text-xs">9.9 BTC</span>
                        </div>
                        <div className="text-xs mt-1">Change</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  When making a small payment, most of your coins return as "change". Spending this change later connects your full wallet balance to your identity.
                </p>
                <div className="mt-4 p-2 bg-destructive/10 rounded-lg">
                  <p className="text-xs text-destructive font-medium">
                    Risk: Reveals your total wealth to merchants or services
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Separator className="my-12" />

      {/* Privacy Explained - Simplified Educational Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">How Your Bitcoin Privacy Works</h2>
          
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="grid md:grid-cols-3 divide-x divide-border">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">1</span>
                  </div>
                  <h3 className="text-lg font-medium">When You Receive Bitcoin</h3>
                </div>
                <p className="text-muted-foreground">
                  Each time you get Bitcoin, you add a new "digital bill" to your collection.
                  These bills keep a record of where they came from.
                </p>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">2</span>
                  </div>
                  <h3 className="text-lg font-medium">When You Spend Bitcoin</h3>
                </div>
                <p className="text-muted-foreground">
                  You choose which "digital bills" to spend. If you're not careful about which ones you use together,
                  you might accidentally connect different parts of your financial life.
                </p>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">3</span>
                  </div>
                  <h3 className="text-lg font-medium">What Others Can See</h3>
                </div>
                <p className="text-muted-foreground">
                  Bitcoin transactions are public. Without proper management, someone could connect the dots
                  between your different transactions and potentially identify you.
                </p>
              </div>
            </div>
            
            <div className="p-6 bg-muted/50 border-t border-border">
              <div className="flex items-start">
                <Shield className="text-amber-500 mr-4 h-6 w-6 shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium mb-2">The Privacy Risk Made Simple</h4>
                  <p className="text-muted-foreground mb-4">
                    Without proper digital bill management, you might:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>Accidentally reveal all your transactions to someone who knows just one of your addresses</li>
                    <li>Connect your real identity to your Bitcoin holdings</li>
                    <li>Create patterns that could make you a target</li>
                    <li>Lose the privacy benefits that Bitcoin can provide</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Separator className="my-12" />
      
      {/* Benefits Section - Simplified */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12">How We Help You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Privacy Card - Enhanced */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>Keep Your Privacy</CardTitle>
              <CardDescription>Control who knows what</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                See and fix privacy risks in your transaction history. Avoid accidentally connecting
                different parts of your financial life.
              </p>
            </CardContent>
          </Card>
          
          {/* Tax Efficiency Card - Simplified */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CircleDollarSign className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>Smart Tax Management</CardTitle>
              <CardDescription>Optimize your tax situation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Choose specific digital bills to spend for better tax outcomes. Keep accurate records
                for easier tax reporting.
              </p>
            </CardContent>
          </Card>
          
          {/* Multi-wallet Card - Enhanced */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Handshake className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>All Wallets, One View</CardTitle>
              <CardDescription>Everything in one place</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage digital bills across all your wallets from one simple dashboard.
                No more switching between different apps.
              </p>
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
              <CardTitle>Track Your Portfolio</CardTitle>
              <CardDescription>Know your numbers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                See when you bought, what you paid, and how your investment is doing —
                all in one simple view.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Separator className="my-12" />

      {/* About Us Section - Modified to include link to X and privacy examples */}
      <div className="container mx-auto px-4 py-12 mb-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">About This Project</h2>
          
          <div className="bg-card border-border rounded-lg p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center mb-4">
                  <Heart className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Built By The Community</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  This is an open-source project created by Bitcoiners who care about privacy and financial freedom. 
                  We're committed to making Bitcoin privacy tools accessible to everyone.
                </p>
                <div className="flex items-center mb-4">
                  <Users className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Connect With Us</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  <a href="https://x.com/morningrevo" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Connect with Morning Revolution on X</a>
                </p>
              </div>
              
              <div className="bg-primary/5 p-6 rounded-lg">
                <h4 className="font-medium mb-4 text-center">Why Bitcoin Privacy Matters</h4>
                <p className="text-muted-foreground mb-6">
                  Privacy is not about having something to hide. It's about having something to protect: your financial sovereignty, your personal safety, and your future freedom.
                </p>
                <div className="flex justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/utxo-map")}
                    className="bg-background"
                  >
                    Explore UTXO Visualization <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Financial Sovereignty Section - Simplified */}
      <div className="container mx-auto px-4 py-12 mb-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Take Back Control of Your Bitcoin</h2>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-8">
            <div className="prose max-w-none text-center">
              <p className="text-lg">
                Bitcoin gives you the power to be your own bank. Our tools help you use that power wisely,
                protecting your privacy and financial freedom.
              </p>
              
              <div className="mt-10 flex justify-center">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                >
                  Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
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
