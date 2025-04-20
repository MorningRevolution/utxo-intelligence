
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { UTXO, SimulationResult } from "@/types/utxo";
import { calculateTransactionPrivacyRisk } from "@/utils/utxo-utils";
import { useWallet } from "@/store/WalletContext";

type Output = { address: string; amount: number };

export function useRiskSimulation() {
  const { toast } = useToast();
  const { 
    selectedUTXOs, 
    preselectedForSimulation, 
    setPreselectedForSimulation 
  } = useWallet();
  
  const [outputs, setOutputs] = useState<Output[]>([
    { address: "bc1qu6jf0q7cjmj9pz4ymmwdj6tt4rdh2z9vqzt3xw", amount: 0.1 }
  ]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [riskDetailsOpen, setRiskDetailsOpen] = useState(false);
  
  // Calculated values
  const totalInputAmount = selectedUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
  const totalOutputAmount = outputs.reduce((sum, output) => sum + (output.amount || 0), 0);
  const estimatedFeeRate = 0.0001;
  const estimatedFee = selectedUTXOs.length * estimatedFeeRate;
  const changeAmount = Math.max(0, totalInputAmount - totalOutputAmount - estimatedFee);
  
  // For tag warnings
  const getUniqueTags = useCallback(() => {
    const tags = new Set<string>();
    selectedUTXOs.forEach(utxo => {
      utxo.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [selectedUTXOs]);
  
  const hasDateDiversityWarning = useCallback(() => {
    if (selectedUTXOs.length <= 1) return false;
    
    const dates = selectedUTXOs.map(utxo => new Date(utxo.createdAt).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    
    return (maxDate - minDate) > 90 * 24 * 60 * 60 * 1000;
  }, [selectedUTXOs]);
  
  const hasMixedTagWarning = useCallback(() => {
    const tags = getUniqueTags();
    
    const hasKYC = tags.some(tag => tag === 'Exchange' || tag === 'Bull KYC');
    const hasPersonal = tags.some(tag => ['Personal', 'Gift', 'P2P'].includes(tag));
    
    return hasKYC && hasPersonal;
  }, [getUniqueTags]);
  
  // Output management
  const handleAddOutput = () => {
    setOutputs([...outputs, { address: "", amount: 0 }]);
  };
  
  const handleRemoveOutput = (index: number) => {
    if (outputs.length > 1) {
      setOutputs(outputs.filter((_, i) => i !== index));
    }
  };
  
  const handleOutputChange = (index: number, field: 'address' | 'amount', value: string) => {
    const newOutputs = [...outputs];
    if (field === 'amount') {
      newOutputs[index].amount = parseFloat(value) || 0;
    } else {
      newOutputs[index].address = value;
    }
    setOutputs(newOutputs);
  };
  
  // Simulation functions
  const simulateTransaction = useCallback(() => {
    console.log('Simulating transaction with UTXOs:', selectedUTXOs.length);
    console.log('Current UTXOs in simulation:', selectedUTXOs.map(u => `${u.txid.substring(0, 6)}...${u.vout}`));
    
    if (selectedUTXOs.length === 0) {
      toast({
        variant: "destructive",
        title: "No inputs selected",
        description: "Please select UTXOs to use as inputs from the UTXO Table",
      });
      return;
    }

    if (outputs.some(o => !o.address || o.amount <= 0)) {
      toast({
        variant: "destructive",
        title: "Invalid outputs",
        description: "Please ensure all outputs have addresses and amounts",
      });
      return;
    }

    const currentTotalInputAmount = selectedUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
    const currentEstimatedFee = selectedUTXOs.length * estimatedFeeRate;
    
    if (totalOutputAmount + currentEstimatedFee > currentTotalInputAmount) {
      toast({
        variant: "destructive",
        title: "Insufficient funds",
        description: "The total output amount plus fees exceeds the input amount",
      });
      return;
    }

    const result = calculateTransactionPrivacyRisk(
      selectedUTXOs,
      outputs.map(o => o.address)
    );

    setSimulationResult(result);
    console.log("Simulation result:", result);
    console.log("Selected UTXOs used for simulation:", selectedUTXOs.length);

    if (result.privacyRisk === 'high' || result.privacyRisk === 'medium') {
      setRiskDetailsOpen(true);
    } else {
      toast({
        title: "Low Privacy Risk",
        description: "This transaction appears to maintain good privacy",
      });
    }
  }, [selectedUTXOs, outputs, toast, totalOutputAmount, estimatedFeeRate]);

  // Preselected simulation effect
  useEffect(() => {
    if (preselectedForSimulation && selectedUTXOs.length >= 2 && outputs[0].address) {
      console.log('Running preselected simulation with UTXOs:', selectedUTXOs.length);
      console.log('Selected UTXO IDs:', selectedUTXOs.map(u => `${u.txid.substring(0, 6)}...${u.vout}`));
      
      const result = calculateTransactionPrivacyRisk(
        selectedUTXOs,
        outputs.map(o => o.address)
      );
      
      setSimulationResult(result);
      setPreselectedForSimulation(false);
      
      if (result.privacyRisk === 'low') {
        toast({
          title: "Low Privacy Risk",
          description: "This transaction appears to maintain good privacy",
        });
      }
    }
  }, [preselectedForSimulation, selectedUTXOs, outputs, setPreselectedForSimulation, toast]);
  
  // Reset simulation  
  const resetSimulation = useCallback(() => {
    setOutputs([{ address: "", amount: 0 }]);
    setSimulationResult(null);
    setRiskDetailsOpen(false);
  }, []);

  return {
    // State
    outputs,
    simulationResult,
    riskDetailsOpen,
    
    // Calculations
    totalInputAmount,
    totalOutputAmount,
    estimatedFee,
    changeAmount,
    
    // Risk warnings
    hasDateDiversityWarning: hasDateDiversityWarning(),
    hasMixedTagWarning: hasMixedTagWarning(),
    getUniqueTags,
    
    // Methods
    handleAddOutput,
    handleRemoveOutput,
    handleOutputChange,
    simulateTransaction,
    resetSimulation,
    
    // Risk details modal
    setRiskDetailsOpen,
  };
}
