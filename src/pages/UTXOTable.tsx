import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import { Button } from "@/components/ui/button";
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
import { ViewToggle, ViewType } from "@/components/utxo/ViewToggle";
import { AddUTXOModal } from "@/components/portfolio/AddUTXOModal";
import { Bookmark, Network } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { UTXO } from "@/types/utxo";
import { UTXOViewManager } from "@/components/utxo/UTXOViewManager";
import { useUTXOModifiers } from "@/hooks/useUTXOModifiers";

const UTXOTable = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { 
    walletData, 
    hasWallet,
    isUTXOSelected,
    toggleUTXOSelection,
    tags
  } = useWallet();
  
  const {
    handleTagSelection,
    handleSenderAddressEdit,
    handleReceiverAddressEdit,
    handleDateEdit,
    handleBtcPriceEdit,
    handleCostBasisEdit,
    handleNotesEdit,
    deleteUtxoItem
  } = useUTXOModifiers();
  
  // Check for state passed during navigation
  const locationState = location.state as { view?: ViewType; selectedUtxo?: UTXO } | null;
  
  // Add view state with the correct type
  const [currentView, setCurrentView] = useState<ViewType>(locationState?.view || "table");
  const [selectedVisualUtxo, setSelectedVisualUtxo] = useState<UTXO | null>(locationState?.selectedUtxo || null);
  
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
    // ... keep existing code (calculating filtered UTXOs)
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

  const handleAddToSimulation = (utxo: UTXO) => {
    console.log('UTXOTable: Adding to simulation:', utxo.txid.substring(0, 6), 'vout:', utxo.vout);
    
    toggleUTXOSelection(utxo);
    
    toast("UTXO added to simulation");
  };

  // Update handler for visual UTXO selection to handle clear selection
  const handleVisualSelect = (utxo: UTXO | null) => {
    setSelectedVisualUtxo(utxo);
    if (utxo) {
      setCurrentView("visual");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
    setSelectedRisk([]);
    setSelectedWallet("");
  };

  // Handle UTXO deletion
  const confirmDeleteUtxo = (utxoId: string) => {
    setDeleteUtxoId(utxoId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUtxo = () => {
    if (!deleteUtxoId) return;
    
    const success = deleteUtxoItem(deleteUtxoId);
    if (success) {
      // If the deleted UTXO was selected for visualization, clear the selection
      if (selectedVisualUtxo && selectedVisualUtxo.txid === deleteUtxoId) {
        setSelectedVisualUtxo(null);
        setCurrentView("table");
      }
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

  const handleViewChange = (view: ViewType) => {
    if (view === "graph") {
      // Navigate to dedicated graph page instead
      navigate("/utxo-map");
    } else {
      setCurrentView(view);
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
    <div className="container px-4 md:px-8 py-6 overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">UTXO Management</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle 
            view={currentView} 
            onViewChange={handleViewChange}
            showGraphOption={true}
          />
          
          {!isMobile && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/risk-simulator")}
              >
                <Bookmark className="mr-2 h-4 w-4" />
                Risk Simulator
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/utxo-map")}
              >
                <Network className="mr-2 h-4 w-4" />
                UTXO Map
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-lg p-2 md:p-4 mb-8 overflow-x-hidden">
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

        <UTXOViewManager
          view={currentView}
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
          selectedVisualUtxo={selectedVisualUtxo}
          handleVisualSelect={handleVisualSelect}
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
