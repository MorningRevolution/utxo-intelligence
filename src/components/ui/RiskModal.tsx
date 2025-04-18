import React from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimulationResult } from "@/types/utxo";
import { getRiskBadgeStyle, getRiskTextColor } from "@/utils/utxo-utils";
import { useEffect } from 'react';

interface RiskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  simulationResult: SimulationResult | null;
}

export const RiskModal = ({ isOpen, onOpenChange, simulationResult }: RiskModalProps) => {
  if (!simulationResult) return null;

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-foreground border-border max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className={`mr-2 h-5 w-5 ${getRiskTextColor(simulationResult.privacyRisk)}`} />
            Privacy Risk Assessment
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-foreground/80">
          <Badge className={`inline-flex my-2 ${getRiskBadgeStyle(simulationResult.privacyRisk)}`}>
            <span className="capitalize">{simulationResult.privacyRisk}</span> Risk Level
          </Badge>
          
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-1">Issue Summary:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                {simulationResult.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-1">Impact:</h4>
              <p className="text-sm text-foreground/90">
                {simulationResult.privacyRisk === 'high' 
                  ? 'This transaction could significantly compromise your privacy by linking your different wallet activities and potentially revealing your identity.' 
                  : 'This transaction has some privacy concerns that could leak information about your wallet structure and usage patterns.'}
              </p>
            </div>
            
            <div className="p-3 rounded-md bg-muted">
              <h4 className="font-medium text-foreground mb-1">Recommendations:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                {simulationResult.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
            
            {simulationResult.safeAlternative && (
              <div className="mt-3 p-3 rounded-md border border-primary/30 bg-primary/5">
                <h4 className="font-medium text-primary mb-1">Suggested Alternative Approach:</h4>
                <p className="text-sm text-foreground/90">{simulationResult.safeAlternative}</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button onClick={() => onOpenChange(false)}>
            I understand the risks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
