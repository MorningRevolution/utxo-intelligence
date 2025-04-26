
import { createContext, useContext, useState, ReactNode } from 'react';
import { TaxConfig, TaxJurisdiction } from '@/types/tax';
import { taxJurisdictions } from '@/data/taxConfigs';

interface TaxConfigContextType {
  selectedJurisdiction: TaxJurisdiction | null;
  setSelectedJurisdiction: (jurisdiction: TaxJurisdiction) => void;
}

const TaxConfigContext = createContext<TaxConfigContextType | undefined>(undefined);

export function TaxConfigProvider({ children }: { children: ReactNode }) {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<TaxJurisdiction | null>(null);

  return (
    <TaxConfigContext.Provider value={{ selectedJurisdiction, setSelectedJurisdiction }}>
      {children}
    </TaxConfigContext.Provider>
  );
}

export function useTaxConfig() {
  const context = useContext(TaxConfigContext);
  if (context === undefined) {
    throw new Error('useTaxConfig must be used within a TaxConfigProvider');
  }
  return context;
}
