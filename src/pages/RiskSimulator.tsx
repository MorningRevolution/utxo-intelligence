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
  DialogClose
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/store/WalletContext";
import { formatBTC, calculateTransactionPrivacyRisk, getRiskColor, getRiskTextColor, getRiskBadgeStyle } from "@/utils/utxo-utils";
import { UTXO, SimulationResult } from "@/types/utxo";
import { Check, Info, Trash, AlertTriangle, ArrowRight, Eye, RefreshCcw, Shield, Calendar, Tags } from "lucide-react";

const RiskSimulator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { selectedUTXOs, hasWallet, clearSelectedUTXOs, preselectedForSimulation, setPreselectedForSimulation } = useWallet();
  const [outputs, setOutputs] = useState<{ address: string; amount: number }[]>([
    { address: "bc1qu6jf0q7cjmj9pz4ymmwdj6tt4rdh2z9vqzt3xw", amount: 0.1 }
  ]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [riskDetailsOpen, setRiskDetailsOpen] = useState(false);

  useEffect(() => {
    return () => {
      setRiskDetailsOpen(false);
      setConfirmModalOpen(false);
      setResetModalOpen(false);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!hasWallet) {
      navigate("/wallet-import");
      toast({
        title: "No wallet loaded",
        description: "Please import a wallet first",
      });
    }
  }, [hasWallet, navigate, toast]);

  useEffect(() => {
    if (preselectedForSimulation && selectedUTXOs.length >= 2 && outputs[0].address) {
      simulateTransaction();
      setPreselectedForSimulation(false);
    }
  }, [preselectedForSimulation, selectedUTXOs]);

  const simulateTransaction = () => {
    if (!selectedUTXOs.length) return;
    const result = calculateTransactionPrivacyRisk(selectedUTXOs, outputs.map(o => o.address));
    setSimulationResult(result);
    setRiskDetailsOpen(result.privacyRisk === 'high' || result.privacyRisk === 'medium');
  };

  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 text-[#1a1a1a]">Risk Simulator</h1>
      <Button onClick={simulateTransaction}>Simulate</Button>

      <Dialog open={riskDetailsOpen} onOpenChange={setRiskDetailsOpen}>
        <DialogContent className="bg-white text-[#1a1a1a] border max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className={`mr-2 h-5 w-5 ${getRiskTextColor(simulationResult?.privacyRisk || 'medium')}`} />
              Privacy Risk Assessment
            </DialogTitle>
          </DialogHeader>

          <div className="text-[#4a4a4a]">
            <Badge className={`inline-flex my-2 ${getRiskBadgeStyle(simulationResult?.privacyRisk || 'medium')}`}>
              <span className="capitalize">{simulationResult?.privacyRisk}</span> Risk Level
            </Badge>

            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-medium mb-1">Issue Summary:</h4>
                <ul className="list-disc list-inside text-sm">
                  {simulationResult?.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-1">Impact:</h4>
                <p className="text-sm">
                  {simulationResult?.privacyRisk === 'high'
                    ? 'This transaction could significantly compromise your privacy.'
                    : 'This transaction has some privacy concerns.'}
                </p>
              </div>

              {simulationResult?.recommendations?.length > 0 && (
                <div className="p-3 rounded-md bg-muted border">
                  <h4 className="font-medium mb-1">Recommendations:</h4>
                  <ul className="list-disc list-inside text-sm">
                    {simulationResult.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                  </ul>
                </div>
              )}

              {simulationResult?.safeAlternative && (
                <div className="mt-3 p-3 rounded-md border border-primary/30 bg-primary/10">
                  <h4 className="font-medium text-primary mb-1">Suggested Alternative:</h4>
                  <p className="text-sm">{simulationResult.safeAlternative}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button className="bg-primary text-white">I understand the risks</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RiskSimulator;
