import { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback } from 'react';
import { WalletData, UTXO, Tag, Transaction, Report, PortfolioData } from '../types/utxo';
import { mockWalletData, mockTags } from '../data/mockData';
import { 
  isUTXOInSelection, 
  addUTXOToSelection, 
  removeUTXOFromSelection, 
  toggleUTXOInSelection 
} from '../utils/utxoSelectionUtils';
import { getCurrentBitcoinPrice, getBitcoinHistoricalPrice } from '../services/coingeckoService';

interface WalletContextType {
  walletData: WalletData | null;
  tags: Tag[];
  selectedUTXOs: UTXO[];
  importWallet: (data: WalletData) => void;
  importFromJson: (jsonString: string) => void;
  addTag: (tag: Tag) => void;
  tagUTXO: (utxoId: string, tagId: string | null, tagNameToRemove?: string | null) => void;
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
  updateUtxoCostBasis: (utxoId: string, acquisitionDate: string | null, acquisitionFiatValue: number | null, notes: string | null) => void;
  autoPopulateUTXOCostBasis: (utxoId: string) => Promise<boolean>;
  getPortfolioData: () => Promise<PortfolioData | null>;
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

  const tagUTXO = (utxoId: string, tagId: string | null, tagNameToRemove?: string | null) => {
    if (!walletData) return;
    
    if (!tagId && !tagNameToRemove) {
      console.log('No tag operation specified - both tagId and tagNameToRemove are null');
      return;
    }
    
    const updatedUtxos = walletData.utxos.map(utxo => {
      if (utxo.txid === utxoId) {
        let newTags = [...utxo.tags];
        
        if (tagNameToRemove) {
          console.log(`Removing tag "${tagNameToRemove}" from UTXO ${utxoId.substring(0, 8)}`);
          newTags = newTags.filter(tag => tag !== tagNameToRemove);
        }
        
        if (tagId) {
          const tagToAdd = tags.find(t => t.id === tagId);
          if (tagToAdd && !newTags.includes(tagToAdd.name)) {
            console.log(`Adding tag "${tagToAdd.name}" to UTXO ${utxoId.substring(0, 8)}`);
            newTags.push(tagToAdd.name);
          }
        }
        
        return {
          ...utxo,
          tags: newTags
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
    
    console.log(`WalletContext: Removing tag ${tagName} from UTXO ${utxoId.substring(0, 6)}`);
    
    const utxoBeforeUpdate = walletData.utxos.find(utxo => utxo.txid === utxoId);
    console.log(`UTXO before tag removal: ${utxoBeforeUpdate?.txid.substring(0, 6)}, Tags: ${utxoBeforeUpdate?.tags.join(', ')}`);
    
    const updatedUtxos = walletData.utxos.map(utxo => {
      if (utxo.txid === utxoId) {
        return {
          ...utxo,
          tags: utxo.tags.filter(t => t !== tagName)
        };
      }
      return utxo;
    });
    
    const updatedUtxo = updatedUtxos.find(utxo => utxo.txid === utxoId);
    console.log(`UTXO after tag removal: ${updatedUtxo?.txid.substring(0, 6)}, Tags: ${updatedUtxo?.tags.join(', ')}`);
    
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

  const updateUtxoCostBasis = (
    utxoId: string, 
    acquisitionDate: string | null, 
    acquisitionFiatValue: number | null,
    notes: string | null
  ) => {
    if (!walletData) return;
    
    const updatedUtxos = walletData.utxos.map(utxo => {
      if (utxo.txid === utxoId) {
        return {
          ...utxo,
          acquisitionDate,
          acquisitionFiatValue,
          costAutoPopulated: false,
          notes: notes !== undefined ? notes : utxo.notes
        };
      }
      return utxo;
    });
    
    setWalletData({
      ...walletData,
      utxos: updatedUtxos
    });
  };
  
  const autoPopulateUTXOCostBasis = async (utxoId: string): Promise<boolean> => {
    if (!walletData) return false;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo || !utxo.createdAt) return false;
    
    try {
      const acquisitionDate = utxo.acquisitionDate || utxo.createdAt;
      
      const historicalPrice = await getBitcoinHistoricalPrice(acquisitionDate);
      
      if (!historicalPrice) return false;
      
      const fiatValue = historicalPrice * utxo.amount;
      
      updateUtxoCostBasis(
        utxoId,
        acquisitionDate,
        fiatValue,
        utxo.notes
      );
      
      return true;
    } catch (error) {
      console.error("Failed to auto-populate cost basis:", error);
      return false;
    }
  };
  
  const getPortfolioData = async (): Promise<PortfolioData | null> => {
    if (!walletData) return null;
    
    try {
      const currentPrice = await getCurrentBitcoinPrice() || 20000;
      
      const totalBalance = walletData.totalBalance;
      const currentValue = totalBalance * currentPrice;
      
      let totalCost = 0;
      let utxosWithCost = 0;
      
      walletData.utxos.forEach(utxo => {
        if (utxo.acquisitionFiatValue !== null) {
          totalCost += utxo.acquisitionFiatValue;
          utxosWithCost++;
        }
      });
      
      if (utxosWithCost < walletData.utxos.length && utxosWithCost > 0) {
        const avgCostPerBTC = totalCost / walletData.utxos
          .filter(u => u.acquisitionFiatValue !== null)
          .reduce((sum, u) => sum + u.amount, 0);
        
        const missingCost = walletData.utxos
          .filter(u => u.acquisitionFiatValue === null)
          .reduce((sum, u) => sum + (u.amount * avgCostPerBTC), 0);
        
        totalCost += missingCost;
      }
      
      const unrealizedGain = currentValue - totalCost;
      const unrealizedGainPercentage = totalCost > 0 ? (unrealizedGain / totalCost) : 0;
      
      const tagCounts: Record<string, { amount: number, count: number }> = {};
      
      walletData.utxos.forEach(utxo => {
        if (utxo.tags.length === 0) {
          const tagName = 'Untagged';
          tagCounts[tagName] = tagCounts[tagName] || { amount: 0, count: 0 };
          tagCounts[tagName].amount += utxo.amount;
          tagCounts[tagName].count += 1;
        } else {
          utxo.tags.forEach(tag => {
            tagCounts[tag] = tagCounts[tag] || { amount: 0, count: 0 };
            tagCounts[tag].amount += utxo.amount / utxo.tags.length;
            tagCounts[tag].count += 1;
          });
        }
      });
      
      const tagAllocation = Object.entries(tagCounts).map(([tag, { amount }]) => ({
        tag,
        amount,
        percentage: amount / totalBalance,
        fiatValue: amount * currentPrice
      }));
      
      const dates = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });
      
      const growthFactor = 1.01;
      let previousBalance = totalBalance * 0.8;
      
      const balanceHistory = dates.map((date, index) => {
        previousBalance = previousBalance * (1 + (Math.random() * 0.04 - 0.02));
        if (index > 20) previousBalance = previousBalance * growthFactor;
        
        if (index === dates.length - 1) {
          previousBalance = totalBalance;
        }
        
        const fiatMultiplier = 1 + ((index - dates.length + 1) / 100);
        const dayPrice = currentPrice * fiatMultiplier;
        const fiatValue = previousBalance * dayPrice;
        const fiatGain = fiatValue - (previousBalance * currentPrice * 0.8);
        
        return {
          date,
          balance: previousBalance,
          fiatValue,
          fiatGain
        };
      });
      
      return {
        currentValue,
        totalCost,
        unrealizedGain,
        unrealizedGainPercentage,
        tagAllocation,
        balanceHistory
      };
    } catch (error) {
      console.error("Failed to generate portfolio data:", error);
      return null;
    }
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
    setPreselectedForSimulation,
    updateUtxoCostBasis,
    autoPopulateUTXOCostBasis,
    getPortfolioData
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
