import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
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
import { toast } from "sonner";
import { useWallet } from "@/store/WalletContext";
import { UTXOFilters } from "@/components/utxo/UTXOFilters";
import { UTXOTableBody } from "@/components/utxo/UTXOTableBody";
import { AddUTXOModal } from "@/components/portfolio/AddUTXOModal";
import { Bookmark } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { UTXO } from "@/types/utxo";

const UTXOTable = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { 
    walletData, 
    tags, 
    tagUTXO,
    updateUtxoCostBasis,
    updateUtxoAddresses,
    autoPopulateUTXOCostBasis,
    deleteUTXO,
    hasWallet,
    isUTXOSelected,
    toggleUTXOSelection,
    selectedCurrency
  } = useWallet();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<string[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof UTXO; direction: 'asc' | 'desc' }>({
    key: 'amount',
    direction: 'desc'
  });
  const [editableUtxo, setEditableUtxo] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [deleteUtxoId, setDeleteUtxoId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [addUTXOModalOpen, setAddUTXOModalOpen] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      console.log("UTXOTable: Component unmounting, clearing state");
      setEditableUtxo(null);
      setDatePickerOpen(null);
      setDeleteUtxoId(null);
      setDeleteDialogOpen(false);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!hasWallet) {
      navigate("/wallet-import");
      toast("No wallet loaded. Please import a wallet first.");
    }
  }, [hasWallet, navigate]);

  const filteredUtxos = useMemo(() => {
    if (!walletData) return [];

    return walletData.utxos.filter(utxo => {
      // For demonstration, we'll pretend some UTXOs belong to "Wallet 2"
      const walletName = utxo.walletName || walletData.name;
      
      const matchesWallet = 
        selectedWallet === "" || 
        walletName === selectedWallet;
      
      const matchesSearch = 
        searchTerm === "" || 
        utxo.txid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utxo.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        utxo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (utxo.notes && utxo.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTags = 
        selectedTags.length === 0 || 
        selectedTags.some(tagId => {
          const tagName = tags.find(t => t.id === tagId)?.name;
          return tagName && utxo.tags.includes(tagName);
        });
      
      const matchesRisk = 
        selectedRisk.length === 0 || 
        selectedRisk.includes(utxo.privacyRisk);
      
      return matchesSearch && matchesTags && matchesRisk && matchesWallet;
    }).sort((a, b) => {
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' 
          ? a.amount - b.amount 
          : b.amount - a.amount;
      }
      
      if (sortConfig.key === 'confirmations') {
        return sortConfig.direction === 'asc'
          ? a.confirmations - b.confirmations
          : b.confirmations - a.confirmations;
      }

      if (sortConfig.key === 'acquisitionBtcPrice') {
        const aPrice = a.acquisitionBtcPrice || 0;
        const bPrice = b.acquisitionBtcPrice || 0;
        return sortConfig.direction === 'asc'
          ? aPrice - bPrice
          : bPrice - aPrice;
      }
      
      if (sortConfig.key === 'acquisitionFiatValue') {
        const aValue = a.acquisitionFiatValue || 0;
        const bValue = b.acquisitionFiatValue || 0;
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      
      // Special case for walletName which doesn't exist in UTXO type
      if (sortConfig.key === 'walletName') {
        const aWallet = a.walletName || walletData.name;
        const bWallet = b.walletName || walletData.name;
        return sortConfig.direction === 'asc'
          ? aWallet.localeCompare(bWallet)
          : bWallet.localeCompare(aWallet);
      }
      
      const aValue = String(a[sortConfig.key] || '');
      const bValue = String(b[sortConfig.key] || '');
      
      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      }
      return bValue.localeCompare(aValue);
    });
  }, [walletData, searchTerm, selectedTags, selectedRisk, selectedWallet, sortConfig, tags]);

  const handleSort = (key: keyof UTXO) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleTagSelection = (utxoId: string, tagId: string, remove?: boolean) => {
    if (tagId && utxoId) {
      if (remove) {
        const utxo = walletData?.utxos.find(u => u.txid === utxoId);
        const tag = tags.find(t => t.id === tagId);
        if (utxo && tag) {
          console.log(`UTXOTable: Removing tag ${tag.name} from UTXO ${utxoId.substring(0, 8)}`);
          tagUTXO(utxoId, null, tag.name);
          toast("Tag removed from UTXO");
        }
      } else {
        console.log(`UTXOTable: Adding tag ${tagId} to UTXO ${utxoId.substring(0, 8)}`);
        tagUTXO(utxoId, tagId);
        toast("Tag applied to UTXO");
      }
    }
  };

  const handleAddToSimulation = (utxo: UTXO) => {
    console.log('UTXOTable: Adding to simulation:', utxo.txid.substring(0, 6), 'vout:', utxo.vout);
    
    toggleUTXOSelection(utxo);
    
    toast("UTXO added to simulation");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
    setSelectedRisk([]);
    setSelectedWallet("");
  };

  // Handle editing functions - Updated for better handling of TxID changes
  const startEditing = (utxoId: string) => {
    setEditableUtxo(utxoId);
  };

  const cancelEditing = () => {
    setEditableUtxo(null);
    setDatePickerOpen(null);
  };
  
  const handleSenderAddressEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    // Only update if changed
    if (utxo.senderAddress !== newValue) {
      // Update the sender address
      if (updateUtxoAddresses && typeof updateUtxoAddresses === 'function') {
        updateUtxoAddresses(utxoId, newValue, utxo.receiverAddress || "");
        toast("Sender address updated");
      }
    }
    
    setEditableUtxo(null);
  }, [walletData, updateUtxoAddresses]);

  const handleReceiverAddressEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    // Only update if changed
    if (utxo.receiverAddress !== newValue) {
      // Update the receiver address
      if (updateUtxoAddresses && typeof updateUtxoAddresses === 'function') {
        updateUtxoAddresses(utxoId, utxo.senderAddress || "", newValue);
        toast("Receiver address updated");
      }
    }
    
    setEditableUtxo(null);
  }, [walletData, updateUtxoAddresses]);

  const handleDateEdit = useCallback((utxoId: string, date: Date | undefined) => {
    if (!walletData || !date) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    // Only update if changed
    if (utxo.acquisitionDate !== dateStr) {
      // Use the existing values for other fields
      updateUtxoCostBasis(
        utxoId,
        dateStr,
        utxo.acquisitionFiatValue,
        utxo.notes
      );
      
      toast("Acquisition date updated");
      
      // Auto-populate BTC price based on the new date
      autoPopulateUTXOCostBasis(utxoId)
        .then(success => {
          if (!success) {
            toast.error("Could not fetch historical Bitcoin price for the selected date");
          }
        })
        .catch(err => {
          console.error("Error auto-populating price:", err);
        });
    }
    
    setEditableUtxo(null);
    setDatePickerOpen(null);
  }, [walletData, updateUtxoCostBasis, autoPopulateUTXOCostBasis]);

  const handleBtcPriceEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue) && newValue !== '') {
      toast.error("Please enter a valid number");
      return;
    }

    // Only update if changed
    if ((utxo.acquisitionBtcPrice !== parsedValue) && 
        !(utxo.acquisitionBtcPrice === null && newValue === '')) {
      
      // Calculate new acquisition fiat value based on BTC price and amount
      const newAcquisitionFiatValue = newValue === '' ? null : parsedValue * utxo.amount;
      
      // Update the UTXO with the new BTC price and calculated fiat value
      updateUtxoCostBasis(
        utxoId,
        utxo.acquisitionDate,
        newAcquisitionFiatValue,
        utxo.notes
      );
      
      toast("BTC price and cost basis updated");
    }
    
    setEditableUtxo(null);
  }, [walletData, updateUtxoCostBasis]);

  const handleCostBasisEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue) && newValue !== '') {
      toast.error("Please enter a valid number");
      return;
    }
    
    // Only update if changed
    const newCostBasis = newValue === '' ? null : parsedValue;
    if (utxo.acquisitionFiatValue !== newCostBasis) {
      // Use the existing values for other fields
      updateUtxoCostBasis(
        utxoId,
        utxo.acquisitionDate,
        newCostBasis,
        utxo.notes
      );
      
      toast("Cost basis updated");
    }
    
    setEditableUtxo(null);
  }, [walletData, updateUtxoCostBasis]);

  const handleNotesEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    // Only update if changed
    if (utxo.notes !== newValue) {
      // Use the existing values for other fields
      updateUtxoCostBasis(
        utxoId,
        utxo.acquisitionDate,
        utxo.acquisitionFiatValue,
        newValue
      );
      
      toast("Notes updated");
    }
    
    setEditableUtxo(null);
  }, [walletData, updateUtxoCostBasis]);

  // Handle UTXO deletion
  const confirmDeleteUtxo = (utxoId: string) => {
    setDeleteUtxoId(utxoId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUtxo = () => {
    if (!deleteUtxoId) return;
    
    // Call the deleteUTXO function from WalletContext
    if (deleteUTXO && typeof deleteUTXO === 'function') {
      deleteUTXO(deleteUtxoId);
      toast("UTXO deleted from wallet");
    } else {
      toast.error("Unable to delete UTXO at this time");
      console.error("deleteUTXO function not available in WalletContext");
    }
    
    // Reset state
    setDeleteUtxoId(null);
    setDeleteDialogOpen(false);
  };

  const cancelDeleteUtxo = () => {
    setDeleteUtxoId(null);
    setDeleteDialogOpen(false);
  };

  const handleAddUTXO = () => {
    setAddUTXOModalOpen(true);
  };

  const handleAddUTXOClose = (success: boolean) => {
    setAddUTXOModalOpen(false);
    if (success) {
      toast("New UTXO added successfully");
    }
  };

  if (!walletData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-foreground mb-4">No wallet data available.</p>
        <Button onClick={() => navigate("/wallet-import")}>Import Wallet</Button>
      </div>
    );
  }

  // Define which columns to show based on screen size
  const getVisibleColumns = () => {
    if (isMobile) {
      return {
        txid: true,
        wallet: true,
        senderAddress: false,
        receiverAddress: false,
        amount: true,
        date: false,
        btcPrice: false,
        costBasis: false,
        notes: false,
        tags: true,
        risk: true,
        actions: true
      };
    }
    return {
      txid: true,
      wallet: true,
      senderAddress: true,
      receiverAddress: true,
      amount: true,
      date: true,
      btcPrice: true,
      costBasis: true,
      notes: true,
      tags: true,
      risk: true,
      actions: true
    };
  };
  
  const visibleColumns = getVisibleColumns();

  return (
    <div className="container px-4 md:px-8 py-6">
      <div className="flex flex-col md:flex-row justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">UTXO Management</h1>
        
        {!isMobile && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/risk-simulator")}
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Risk Simulator
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg shadow-lg p-2 md:p-4 mb-8">
        <UTXOFilters 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          selectedRisk={selectedRisk}
          setSelectedRisk={setSelectedRisk}
          selectedWallet={selectedWallet}
          setSelectedWallet={setSelectedWallet}
          clearFilters={clearFilters}
          onAddUTXO={handleAddUTXO}
        />

        <UTXOTableBody 
          filteredUtxos={filteredUtxos}
          walletData={walletData}
          visibleColumns={visibleColumns}
          sortConfig={sortConfig}
          handleSort={handleSort}
          editableUtxo={editableUtxo}
          setEditableUtxo={setEditableUtxo}
          datePickerOpen={datePickerOpen}
          setDatePickerOpen={setDatePickerOpen}
          confirmDeleteUtxo={confirmDeleteUtxo}
          handleTagSelection={handleTagSelection}
          handleAddToSimulation={handleAddToSimulation}
          handleSenderAddressEdit={handleSenderAddressEdit}
          handleReceiverAddressEdit={handleReceiverAddressEdit}
          handleDateEdit={handleDateEdit}
          handleBtcPriceEdit={handleBtcPriceEdit}
          handleCostBasisEdit={handleCostBasisEdit}
          handleNotesEdit={handleNotesEdit}
        />
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !open && cancelDeleteUtxo()}>
        <AlertDialogContent className="max-w-[90vw] md:max-w-[500px] bg-background z-50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete UTXO</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this UTXO? This action removes it from your wallet tracking, 
              but does not affect the actual UTXO on the blockchain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUtxo} className="w-full sm:w-auto bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add UTXO Modal */}
      <AddUTXOModal 
        open={addUTXOModalOpen} 
        onOpenChange={handleAddUTXOClose}
      />
    </div>
  );
};

export default UTXOTable;
