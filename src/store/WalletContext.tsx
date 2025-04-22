import { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback } from 'react';
import { WalletData, UTXO, Tag, Transaction, Report } from '../types/utxo';
import { mockWalletData, mockTags } from '../data/mockData';
import { 
  isUTXOInSelection, 
  addUTXOToSelection, 
  removeUTXOFromSelection, 
  toggleUTXOInSelection 
} from '../utils/utxoSelectionUtils';

interface WalletContextType {
  walletData: WalletData | null;
  tags: Tag[];
  selectedUTXOs: UTXO[];
  importWallet: (data: WalletData) => void;
  importFromJson: (jsonString: string) => void;
  addTag: (tag: Tag) => void;
  tagUTXO: (utxoId: string, tagId: string) => void;
  removeTagFromUTXO: (utxoId: string, tagId: string) => void;
  selectUTXO: (utxo: UTXO) => void;
  deselectUTXO: (utxo: UTXO) => void;
  clearSelectedUTXOs: () => void;
  isUTXOSelected: (utxo: UTXO) => boolean;
  toggleUTXOSelection: (utxo: UTXO) => void;
  generateReport: () => Report;
  hasWallet: boolean;
  preselectedForSimulation: boolean;
  setPreselectedForSimulation: (value: boolean) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [tags, setTags] = useState<Tag[]>(mockTags);
  const [selectedUTXOs, setSelectedUTXOs] = useState<UTXO[]>([]);
  const [preselectedForSimulation, setPreselectedForSimulation] = useState<boolean>(false);
  
  const preselectionDoneRef = useRef<boolean>(false);
  
  const importWallet = useCallback((data: WalletData) => {
    setWalletData(data);
    setPreselectedForSimulation(false);
    preselectionDoneRef.current = false;
  }, []);

  useEffect(() => {
    if (walletData && !preselectionDoneRef.current && !preselectedForSimulation) {
      const kycUtxo = walletData.utxos.find(utxo => 
        utxo.tags.includes('Exchange') || utxo.tags.includes('Bull KYC')
      );
      
      const coinjoinUtxo = walletData.utxos.find(utxo => 
        utxo.tags.includes('Coinjoin')
      );
      
      const personalUtxo = walletData.utxos.find(utxo => 
        utxo.tags.includes('Personal') && 
        (!kycUtxo || new Date(utxo.createdAt).getTime() - new Date(kycUtxo.createdAt).getTime() > 30 * 24 * 60 * 60 * 1000)
      );
      
      const preselectUtxos = [];
      if (kycUtxo) preselectUtxos.push(kycUtxo);
      if (coinjoinUtxo) preselectUtxos.push(coinjoinUtxo);
      if (personalUtxo) preselectUtxos.push(personalUtxo);
      
      if (preselectUtxos.length >= 2) {
        setSelectedUTXOs(preselectUtxos);
        setPreselectedForSimulation(true);
        preselectionDoneRef.current = true;
      }
    }
  }, [walletData, preselectedForSimulation]);

  const importFromJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      const utxos: UTXO[] = parsed.utxos.map((utxo: any) => ({
        ...utxo,
        tags: [],
        createdAt: new Date().toISOString(),
        privacyRisk: Math.random() < 0.33 ? 'low' : Math.random() < 0.66 ? 'medium' : 'high'
      }));
      
      const walletData: WalletData = {
        name: parsed.name || 'Imported Wallet',
        totalBalance: utxos.reduce((sum, utxo) => sum + utxo.amount, 0),
        utxos
      };
      
      setWalletData(walletData);
    } catch (error) {
      console.error('Failed to parse wallet JSON:', error);
      throw new Error('Invalid wallet data format');
    }
  };

  const addTag = (tag: Tag) => {
    setTags(prevTags => [...prevTags, tag]);
  };

  const tagUTXO = (utxoId: string, tagId: string) => {
    if (!walletData) return;
    
    const tagName = tags.find(t => t.id === tagId)?.name;
    if (!tagName) return;
    
    const updatedUtxos = walletData.utxos.map(utxo => {
      if (utxo.txid === utxoId) {
        return {
          ...utxo,
          tags: utxo.tags.includes(tagName) ? utxo.tags : [...utxo.tags, tagName]
        };
      }
      return utxo;
    });
    
    setWalletData({
      ...walletData,
      utxos: updatedUtxos
    });
  };

  const removeTagFromUTXO = (utxoId: string, tagId: string) => {
    if (!walletData) return;
    
    const tagName = tags.find(t => t.id === tagId)?.name;
    if (!tagName) return;
    
    const updatedUtxos = walletData.utxos.map(utxo => {
      if (utxo.txid === utxoId) {
        return {
          ...utxo,
          tags: utxo.tags.filter(t => t !== tagName)
        };
      }
      return utxo;
    });
    
    setWalletData({
      ...walletData,
      utxos: updatedUtxos
    });
  };

  const selectUTXO = useCallback((utxo: UTXO) => {
    setSelectedUTXOs(prev => addUTXOToSelection(prev, utxo));
  }, []);

  const deselectUTXO = useCallback((utxo: UTXO) => {
    setSelectedUTXOs(prev => removeUTXOFromSelection(prev, utxo));
  }, []);

  const clearSelectedUTXOs = useCallback(() => {
    console.log('Clearing all selected UTXOs');
    setSelectedUTXOs([]);
  }, []);

  const isUTXOSelected = useCallback((utxo: UTXO): boolean => {
    return isUTXOInSelection(selectedUTXOs, utxo);
  }, [selectedUTXOs]);

  const toggleUTXOSelection = useCallback((utxo: UTXO) => {
    console.log(`Toggling UTXO selection: ${utxo.txid.substring(0, 6)}...`);
    setSelectedUTXOs(prev => {
      const newSelection = toggleUTXOInSelection(prev, utxo);
      console.log("Toggled:", utxo.txid, "Now selected:", newSelection.length);
      return newSelection;
    });
  }, []);

  const generateReport = () => {
    if (!walletData) {
      throw new Error("No wallet data available");
    }
    
    const tagBreakdown: { tagName: string; count: number; totalAmount: number }[] = [];
    
    const uniqueTags = new Set<string>();
    walletData.utxos.forEach(utxo => {
      utxo.tags.forEach(tag => uniqueTags.add(tag));
    });
    
    uniqueTags.forEach(tagName => {
      const utxosWithTag = walletData.utxos.filter(utxo => 
        utxo.tags.includes(tagName)
      );
      
      tagBreakdown.push({
        tagName,
        count: utxosWithTag.length,
        totalAmount: utxosWithTag.reduce((sum, utxo) => sum + utxo.amount, 0)
      });
    });
    
    const riskyUtxos = walletData.utxos.filter(utxo => 
      utxo.privacyRisk === 'high' || utxo.privacyRisk === 'medium'
    );
    
    const highRiskCount = walletData.utxos.filter(u => u.privacyRisk === 'high').length;
    const mediumRiskCount = walletData.utxos.filter(u => u.privacyRisk === 'medium').length;
    const totalUtxos = walletData.utxos.length;
    
    const privacyScore = 100 - (
      ((highRiskCount * 30) + (mediumRiskCount * 10)) / totalUtxos
    );
    
    const recommendations = [
      "Consider using a Coinjoin transaction for your high-risk UTXOs",
      "Avoid address reuse for better privacy",
      "Use separate wallets for different purposes"
    ];
    
    if (riskyUtxos.length > 3) {
      recommendations.push("Your wallet has a significant number of high-risk UTXOs");
    }
    
    if (tagBreakdown.length < 3) {
      recommendations.push("Consider adding more tags to better organize your UTXOs");
    }
    
    return {
      generatedAt: new Date().toISOString(),
      walletName: walletData.name,
      utxoCount: walletData.utxos.length,
      totalBalance: walletData.totalBalance,
      privacyScore: Math.max(0, Math.min(100, privacyScore)),
      tagBreakdown,
      riskyUtxos,
      recommendations
    };
  };

  const contextValue = {
    walletData,
    tags,
    selectedUTXOs,
    importWallet,
    importFromJson,
    addTag,
    tagUTXO,
    removeTagFromUTXO,
    selectUTXO,
    deselectUTXO,
    clearSelectedUTXOs,
    isUTXOSelected,
    toggleUTXOSelection,
    generateReport,
    hasWallet: !!walletData,
    preselectedForSimulation,
    setPreselectedForSimulation
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
