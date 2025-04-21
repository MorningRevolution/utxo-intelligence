import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/store/WalletContext";
import { useRiskSimulation } from "@/hooks/useRiskSimulation";
import { formatBTC, getRiskColor, getRiskTextColor, getRiskBadgeStyle } from "@/utils/utxo-utils";
import { Check, Info, Trash, AlertTriangle, ArrowRight, Eye, RefreshCcw, Shield, Calendar, Tags } from "lucide-react";

const RiskSimulator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { 
    selectedUTXOs, 
    hasWallet,
    clearSelectedUTXOs,
    isUTXOSelected,
    toggleUTXOSelection
  } = useWallet();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  
  const {
    outputs,
    simulationResult,
    riskDetailsOpen,
    totalInputAmount,
    totalOutputAmount,
    estimatedFee,
    changeAmount,
    hasDateDiversityWarning,
    hasMixedTagWarning,
    getUniqueTags,
    handleAddOutput,
    handleRemoveOutput,
    handleOutputChange,
    simulateTransaction,
    resetSimulation,
    setRiskDetailsOpen
  } = useRiskSimulation();

  useEffect(() => {
    return () => {
      setRiskDetailsOpen(false);
      setConfirmModalOpen(false);
      setResetModalOpen(false);
    };
  }, [location.pathname, setRiskDetailsOpen]);

  useEffect(() => {
    if (!hasWallet) {
      navigate("/wallet-import");
      toast({
        title: "No wallet loaded",
        description: "Please import a wallet first",
      });
    }
  }, [hasWallet, navigate, toast]);

  const handleResetSimulation = () => {
    clearSelectedUTXOs();
    resetSimulation();
    toast({
      title: "Simulation Reset",
      description: "All inputs and outputs have been cleared",
    });
    setResetModalOpen(false);
  };

  const handleToggleUTXO = (utxo) => {
    console.log("RiskSimulator: Toggling UTXO", utxo.txid.substring(0, 8));
    toggleUTXOSelection(utxo);
  };

  const handleConfirmTransaction = () => {
    toast({
      title: "Transaction Simulated",
      description: "In a full implementation, this would broadcast the transaction.",
    });
    setConfirmModalOpen(false);
  };

  const handleRiskDetailsClose = () => {
    setRiskDetailsOpen(false);
  };

  const goToUtxoTable = () => {
    navigate("/utxo-table");
  };

  return (
    <div className="container px-2 md:px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Risk Simulator</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToUtxoTable}
          >
            <Eye className="mr-2 h-4 w-4" />
            UTXO Table
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setResetModalOpen(true)}
            disabled={selectedUTXOs.length === 0 && outputs.length === 1 && !outputs[0].address}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transaction Inputs</span>
              <Badge className="ml-2">{selectedUTXOs.length} UTXOs</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedUTXOs.length === 0 ? (
              <div className="text-center py-8">
                <Info className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  No UTXOs selected. Go to the UTXO Table to select inputs.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={goToUtxoTable}
                >
                  Select UTXOs
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {selectedUTXOs.map((utxo) => (
                  <div 
                    key={utxo.txid + "-" + utxo.vout}
                    className="flex items-center justify-between p-2 rounded-md bg-muted"
                  >
                    <div className="flex flex-col">
                      <div className="font-mono text-xs text-muted-foreground">
                        {utxo.txid.substring(0, 8)}...{utxo.txid.substring(utxo.txid.length - 8)}
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${getRiskColor(utxo.privacyRisk)} mr-2`}></div>
                        <span className="text-sm">{formatBTC(utxo.amount)}</span>
                        <span className="ml-2 text-xs text-muted-foreground flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(utxo.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {utxo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {utxo.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs whitespace-nowrap">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {selectedUTXOs.length > 0 && (
              <div className="mt-2">
                {hasMixedTagWarning && (
                  <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 mb-2 text-amber-500 text-xs">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p>Mixing KYC and non-KYC UTXOs may compromise your privacy</p>
                  </div>
                )}
                
                {hasDateDiversityWarning && (
                  <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 mb-2 text-amber-500 text-xs">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p>Large time diversity between UTXOs may reveal spending patterns</p>
                  </div>
                )}
                
                <div className="mt-3 flex items-center gap-1">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tags: </span>
                  <div className="flex flex-wrap gap-1">
                    {getUniqueTags().map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between">
                <span>Total Input:</span>
                <span className="font-medium">{formatBTC(totalInputAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transaction Outputs</span>
              <Badge className="ml-2">{outputs.length} Outputs</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {outputs.map((output, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-md border border-border bg-muted"
                >
                  <div className="flex justify-between mb-2">
                    <Label htmlFor={`address-${index}`} className="text-sm">
                      Output {index + 1}
                    </Label>
                    {outputs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveOutput(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      id={`address-${index}`}
                      placeholder="Address"
                      value={output.address}
                      onChange={(e) => handleOutputChange(index, 'address', e.target.value)}
                      className="text-xs font-mono"
                    />
                    <div className="flex gap-2">
                      <Input
                        id={`amount-${index}`}
                        type="number"
                        step="0.00000001"
                        min="0"
                        placeholder="Amount"
                        value={output.amount || ""}
                        onChange={(e) => handleOutputChange(index, 'amount', e.target.value)}
                      />
                      <span className="flex items-center text-sm font-medium text-muted-foreground">BTC</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleAddOutput}
            >
              Add Output
            </Button>
            
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between">
                <span>Total Output:</span>
                <span>{formatBTC(totalOutputAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Fee:</span>
                <span>{formatBTC(estimatedFee)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Change:</span>
                <span>{formatBTC(changeAmount)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={simulateTransaction}
              disabled={selectedUTXOs.length === 0 || outputs.some(o => !o.address || o.amount <= 0)}
            >
              Simulate Transaction
            </Button>
          </CardFooter>
        </Card>
      </div>

      {simulationResult && (
        <Card className="mt-6 bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                <span>Privacy Analysis Results</span>
              </div>
              <Badge className={`ml-auto px-3 py-1 ${getRiskBadgeStyle(simulationResult.privacyRisk)}`}>
                <span className="capitalize">{simulationResult.privacyRisk}</span> Risk
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Identified Issues:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {simulationResult.reasons.map((reason, index) => (
                  <li key={index} className="text-sm">{reason}</li>
                ))}
                {simulationResult.reasons.length === 0 && (
                  <li className="text-sm">No privacy issues detected.</li>
                )}
              </ul>
            </div>

            <Separator />
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Recommendations:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {simulationResult.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm">{recommendation}</li>
                ))}
              </ul>
              
              {simulationResult.safeAlternative && (
                <div className="mt-3 p-3 rounded-md border border-primary/30 bg-primary/5">
                  <p className="text-sm font-medium text-primary">Suggested Alternative:</p>
                  <p className="text-sm mt-1">{simulationResult.safeAlternative}</p>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="rounded-md border border-border p-4 bg-muted/50">
              <div className="flex items-center mb-2">
                <AlertTriangle 
                  className={`mr-2 h-5 w-5 ${getRiskTextColor(simulationResult.privacyRisk)}`} 
                />
                <h3 className="text-lg font-medium">Privacy Implications</h3>
              </div>
              
              {simulationResult.privacyRisk === 'high' ? (
                <p className="text-sm">This transaction has serious privacy implications and may link your UTXOs in ways that could compromise your privacy.</p>
              ) : simulationResult.privacyRisk === 'medium' ? (
                <p className="text-sm">This transaction has some privacy concerns that could potentially be improved with the suggestions above.</p>
              ) : (
                <p className="text-sm">This transaction appears to maintain good privacy practices. Continue to follow best practices for future transactions.</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button 
              className="w-full" 
              variant={simulationResult.privacyRisk === 'high' ? 'outline' : 'default'} 
              onClick={() => setConfirmModalOpen(true)}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              {simulationResult.privacyRisk === 'high' 
                ? 'Proceed Despite Warnings' 
                : 'Proceed with Transaction'}
            </Button>
          </CardFooter>
        </Card>
      )}

      <AlertDialog 
        open={resetModalOpen} 
        onOpenChange={setResetModalOpen}
      >
        <AlertDialogContent className="bg-card text-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Simulation</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80">
              This will clear all selected UTXOs and outputs. Are you sure you want to reset the simulation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetSimulation}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={confirmModalOpen} 
        onOpenChange={setConfirmModalOpen}
      >
        <AlertDialogContent className="bg-card text-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Transaction</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80">
              {simulationResult?.privacyRisk === 'high' ? (
                <div className="flex items-center text-destructive mb-2">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  <span>This transaction has high privacy risks.</span>
                </div>
              ) : null}
              In a full implementation, this would broadcast the transaction to the Bitcoin network. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransaction}>
              <Check className="mr-2 h-4 w-4" />
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog 
        open={riskDetailsOpen} 
        onOpenChange={setRiskDetailsOpen}
      >
        <DialogContent className="bg-card text-foreground border-border max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className={`mr-2 h-5 w-5 ${getRiskTextColor(simulationResult?.privacyRisk || 'medium')}`} />
              Privacy Risk Assessment
            </DialogTitle>
            <DialogDescription>
              Review the privacy implications of your transaction before proceeding
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-foreground/80">
            <Badge className={`inline-flex my-2 ${getRiskBadgeStyle(simulationResult?.privacyRisk || 'medium')}`}>
              <span className="capitalize">{simulationResult?.privacyRisk}</span> Risk Level
            </Badge>
            
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-1">Issue Summary:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                  {simulationResult?.reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-1">Impact:</h4>
                <p className="text-sm text-foreground/90">
                  {simulationResult?.privacyRisk === 'high' 
                    ? 'This transaction could significantly compromise your privacy by linking your different wallet activities and potentially revealing your identity.' 
                    : 'This transaction has some privacy concerns that could leak information about your wallet structure and usage patterns.'}
                </p>
              </div>
              
              <div className="p-3 rounded-md bg-muted">
                <h4 className="font-medium text-foreground mb-1">Recommendations:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                  {simulationResult?.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
              
              {simulationResult?.safeAlternative && (
                <div className="mt-3 p-3 rounded-md border border-primary/30 bg-primary/5">
                  <h4 className="font-medium text-primary mb-1">Suggested Alternative Approach:</h4>
                  <p className="text-sm text-foreground/90">{simulationResult.safeAlternative}</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button onClick={handleRiskDetailsClose}>
              I understand the risks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RiskSimulator;
