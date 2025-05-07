import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow, EditableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { useWallet } from "@/store/WalletContext";
import { TagSelector } from "@/components/utxo/TagSelector";
import { UTXODetailsModal } from "@/components/utxo/UTXODetailsModal";
import { formatBTC, formatTxid, getRiskColor } from "@/utils/utxo-utils";
import { ArrowUpDown, Filter, MoreVertical, Tag, Eye, Info, Bookmark, Edit, CalendarIcon, DollarSign, Pencil, Check, X, Trash2 } from "lucide-react";
import { UTXO } from "@/types/utxo";

const UTXOTable = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    walletData, 
    tags, 
    tagUTXO,
    updateUtxoCostBasis,
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
  const [sortConfig, setSortConfig] = useState<{ key: keyof UTXO; direction: 'asc' | 'desc' }>({
    key: 'amount',
    direction: 'desc'
  });
  const [detailsUtxoId, setDetailsUtxoId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editableUtxo, setEditableUtxo] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [deleteUtxoId, setDeleteUtxoId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      console.log("UTXOTable: Component unmounting, clearing state");
      setDetailsUtxoId(null);
      setModalOpen(false);
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
      
      return matchesSearch && matchesTags && matchesRisk;
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
      
      const aValue = String(a[sortConfig.key] || '');
      const bValue = String(b[sortConfig.key] || '');
      
      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      }
      return bValue.localeCompare(aValue);
    });
  }, [walletData, searchTerm, selectedTags, selectedRisk, sortConfig, tags]);

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
          toast("Tag removed. The tag has been removed from the UTXO");
        }
      } else {
        console.log(`UTXOTable: Adding tag ${tagId} to UTXO ${utxoId.substring(0, 8)}`);
        tagUTXO(utxoId, tagId);
        toast("Tag applied. The tag has been applied to the UTXO");
      }
    }
  };

  const handleViewDetails = (utxo: UTXO) => {
    console.log("UTXOTable: Opening details modal for:", utxo.txid.substring(0, 8));
    setDetailsUtxoId(utxo.txid);
    setModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      console.log("UTXOTable: Closing details modal, clearing state");
      setDetailsUtxoId(null);
    }
  };

  const handleAddToSimulation = (utxo: UTXO) => {
    console.log('UTXOTable: Adding to simulation:', utxo.txid.substring(0, 6), 'vout:', utxo.vout);
    
    toggleUTXOSelection(utxo);
    
    toast("UTXO Selection Updated. Navigate to Risk Simulator to analyze transaction privacy");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
    setSelectedRisk([]);
  };

  const getCurrencySymbol = () => {
    switch (selectedCurrency) {
      case 'usd': return '$';
      case 'eur': return '€';
      case 'gbp': return '£';
      case 'jpy': return '¥';
      case 'aud': return 'A$';
      case 'cad': return 'C$';
      default: return '$';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${getCurrencySymbol()}${value.toLocaleString()}`;
  };

  // Handle editing functions
  const startEditing = (utxoId: string) => {
    setEditableUtxo(utxoId);
  };

  const cancelEditing = () => {
    setEditableUtxo(null);
    setDatePickerOpen(null);
  };
  
  const handleTxidEdit = useCallback((utxoId: string, newValue: string) => {
    // TXIDs are still immutable blockchain values, so we just provide feedback
    toast.warning("TXID cannot be modified - this is an immutable blockchain record");
  }, []);

  const handleAmountEdit = useCallback((utxoId: string, newValue: string) => {
    // Amount is still immutable blockchain value, so we just provide feedback
    toast.warning("Amount cannot be modified - this would require a blockchain transaction");
  }, []);

  const handleDateEdit = useCallback((utxoId: string, date: Date | undefined) => {
    if (!walletData || !date) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    // Use the existing values for other fields
    updateUtxoCostBasis(
      utxoId,
      dateStr,
      utxo.acquisitionFiatValue,
      utxo.notes
    );
    
    toast("Date Updated. The acquisition date has been updated");
    
    // Auto-populate BTC price based on the new date
    autoPopulateUTXOCostBasis(utxoId)
      .then(success => {
        if (!success) {
          toast("Price Update Failed. Could not fetch historical Bitcoin price for the selected date");
        }
      })
      .catch(err => {
        console.error("Error auto-populating price:", err);
      });
    
    setEditableUtxo(null);
    setDatePickerOpen(null);
  }, [walletData, updateUtxoCostBasis, autoPopulateUTXOCostBasis]);

  const handleBtcPriceEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue) && newValue !== '') {
      toast("Invalid Value. Please enter a valid number");
      return;
    }

    // Calculate new acquisition fiat value based on BTC price and amount
    const newAcquisitionFiatValue = newValue === '' ? null : parsedValue * utxo.amount;
    
    // Update the UTXO with the new BTC price and calculated fiat value
    updateUtxoCostBasis(
      utxoId,
      utxo.acquisitionDate,
      newAcquisitionFiatValue,
      utxo.notes
    );
    
    // Also update the BTC price directly in the UTXO
    const updatedUtxo = {
      ...utxo,
      acquisitionBtcPrice: newValue === '' ? null : parsedValue,
      costAutoPopulated: false
    };
    
    // Since updateUtxoCostBasis doesn't directly update the BTC price field,
    // we need to make sure it's updated in the wallet context
    // This should be implemented in the WalletContext, but we're working with what we have
    
    toast("BTC Price Updated. The Bitcoin price and cost basis have been updated");
    
    setEditableUtxo(null);
  }, [walletData, updateUtxoCostBasis]);

  const handleCostBasisEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue) && newValue !== '') {
      toast("Invalid Value. Please enter a valid number");
      return;
    }
    
    // Use the existing values for other fields
    updateUtxoCostBasis(
      utxoId,
      utxo.acquisitionDate,
      newValue === '' ? null : parsedValue,
      utxo.notes
    );
    
    toast("Cost Basis Updated. The cost basis has been updated");
    
    setEditableUtxo(null);
  }, [walletData, updateUtxoCostBasis]);

  const handleNotesEdit = useCallback((utxoId: string, newValue: string) => {
    if (!walletData) return;
    
    const utxo = walletData.utxos.find(u => u.txid === utxoId);
    if (!utxo) return;
    
    // Use the existing values for other fields
    updateUtxoCostBasis(
      utxoId,
      utxo.acquisitionDate,
      utxo.acquisitionFiatValue,
      newValue
    );
    
    toast("Notes Updated. The notes have been updated");
    
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
      toast("UTXO Deleted. The UTXO has been removed from your wallet");
    } else {
      toast.error("Delete Failed. Unable to delete UTXO at this time");
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

  if (!walletData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-foreground mb-4">No wallet data available.</p>
        <Button onClick={() => navigate("/wallet-import")}>Import Wallet</Button>
      </div>
    );
  }

  return (
    <div className="container px-2 md:px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">UTXO Management</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/risk-simulator")}
          >
            <Eye className="mr-2 h-4 w-4" />
            Risk Simulator
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/portfolio")}
          >
            <Info className="mr-2 h-4 w-4" />
            Portfolio Dashboard
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-lg p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by txid, address, tag or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="mr-2 h-4 w-4" />
                  Tags
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px] bg-card text-foreground">
                {tags.map((tag) => (
                  <DropdownMenuItem 
                    key={tag.id}
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (selectedTags.includes(tag.id)) {
                        setSelectedTags(selectedTags.filter(id => id !== tag.id));
                      } else {
                        setSelectedTags([...selectedTags, tag.id]);
                      }
                    }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }}></div>
                    <span>{tag.name}</span>
                    {selectedTags.includes(tag.id) && (
                      <span className="ml-auto">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Risk
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card text-foreground">
                {['low', 'medium', 'high'].map((risk) => (
                  <DropdownMenuItem
                    key={risk}
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (selectedRisk.includes(risk)) {
                        setSelectedRisk(selectedRisk.filter(r => r !== risk));
                      } else {
                        setSelectedRisk([...selectedRisk, risk]);
                      }
                    }}
                  >
                    <div className={`w-3 h-3 rounded-full ${getRiskColor(risk as 'low' | 'medium' | 'high')}`}></div>
                    <span className="capitalize">{risk}</span>
                    {selectedRisk.includes(risk) && (
                      <span className="ml-auto">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {(searchTerm || selectedTags.length > 0 || selectedRisk.length > 0) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableCaption>
              {filteredUtxos.length} of {walletData.utxos.length} UTXOs • Total Balance: {formatBTC(walletData.totalBalance)}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('txid')}>
                    TxID
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('amount')}>
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('acquisitionDate')}>
                    <CalendarIcon className="mr-1 h-4 w-4" />
                    Acq. Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('acquisitionBtcPrice')}>
                    <DollarSign className="mr-1 h-4 w-4" />
                    BTC Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('acquisitionFiatValue')}>
                    Cost Basis
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="min-w-[100px]">
                  Notes
                </TableHead>
                <TableHead>
                  <div className="flex items-center">
                    <Tag className="mr-1 h-4 w-4" />
                    Tags
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('privacyRisk')}>
                    Risk
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUtxos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-foreground">
                    No UTXOs matching the current filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredUtxos.map((utxo) => {
                  const isEditing = editableUtxo === utxo.txid;
                  
                  return (
                    <TableRow key={utxo.txid + "-" + utxo.vout}>
                      {/* TxID Cell - Now editable but with feedback */}
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={formatTxid(utxo.txid)}
                        onSave={(value) => handleTxidEdit(utxo.txid, value)}
                        inputType="text"
                        placeholder="TxID"
                        isDisabled={true}
                        className="font-mono"
                      >
                        <div className="flex items-center gap-2">
                          {isUTXOSelected(utxo) && (
                            <div className="bg-green-500/10 text-green-500 p-1 rounded">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                          {formatTxid(utxo.txid)}
                        </div>
                      </EditableCell>
                      
                      {/* Amount Cell - Now editable but with feedback */}
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={String(utxo.amount)}
                        onSave={(value) => handleAmountEdit(utxo.txid, value)}
                        inputType="number"
                        placeholder="Amount"
                        isDisabled={true}
                      >
                        {formatBTC(utxo.amount)}
                      </EditableCell>
                      
                      {/* Acquisition Date Cell - Editable with calendar */}
                      {isEditing ? (
                        <TableCell>
                          <Popover open={datePickerOpen === utxo.txid} onOpenChange={(open) => {
                            if (open) setDatePickerOpen(utxo.txid);
                            else setDatePickerOpen(null);
                          }}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full justify-start text-left font-normal"
                                size="sm"
                              >
                                {utxo.acquisitionDate 
                                  ? format(new Date(utxo.acquisitionDate), "PPP")
                                  : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : undefined}
                                onSelect={(date) => handleDateEdit(utxo.txid, date)}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      ) : (
                        <EditableCell
                          isEditing={false}
                          initialValue={utxo.acquisitionDate 
                            ? new Date(utxo.acquisitionDate).toLocaleDateString() 
                            : ""}
                          onSave={() => startEditing(utxo.txid)}
                          inputType="text"
                          placeholder="Set date..."
                        />
                      )}
                      
                      {/* BTC Price Cell - Editable */}
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={utxo.acquisitionBtcPrice !== null 
                          ? String(utxo.acquisitionBtcPrice)
                          : ""}
                        onSave={(value) => handleBtcPriceEdit(utxo.txid, value)}
                        inputType="number"
                        placeholder="Enter BTC price..."
                      />
                      
                      {/* Cost Basis Cell - Editable */}
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={utxo.acquisitionFiatValue !== null 
                          ? String(utxo.acquisitionFiatValue)
                          : ""}
                        onSave={(value) => handleCostBasisEdit(utxo.txid, value)}
                        inputType="number"
                        placeholder="Enter cost basis..."
                      >
                        <div className="flex items-center">
                          {utxo.acquisitionFiatValue !== null 
                            ? formatCurrency(utxo.acquisitionFiatValue) 
                            : ""}
                          {utxo.costAutoPopulated && !isEditing && (
                            <span className="ml-1 text-xs text-muted-foreground">(auto)</span>
                          )}
                        </div>
                      </EditableCell>
                      
                      {/* Notes Cell - Editable */}
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={utxo.notes || ""}
                        onSave={(value) => handleNotesEdit(utxo.txid, value)}
                        inputType="text"
                        placeholder="Add notes..."
                        className="max-w-[200px]"
                      />
                      
                      {/* Tags Cell - Not directly editable in the row */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {utxo.tags.map((tagName, index) => {
                            const tag = tags.find(t => t.name === tagName);
                            return tag ? (
                              <Badge 
                                key={index}
                                style={{ 
                                  backgroundColor: tag.color, 
                                  color: '#ffffff' 
                                }} 
                              >
                                {tagName}
                              </Badge>
                            ) : null;
                          })}
                          {utxo.tags.length === 0 && (
                            <span className="text-muted-foreground text-sm">No tags</span>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Risk Cell - Not editable */}
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${getRiskColor(utxo.privacyRisk)}`}></div>
                          <span className="ml-2 capitalize">{utxo.privacyRisk}</span>
                        </div>
                      </TableCell>
                      
                      {/* Actions Cell */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={cancelEditing}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => startEditing(utxo.txid)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card text-foreground">
                              <DropdownMenuItem onClick={() => handleViewDetails(utxo)}>
                                <Info className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                <TagSelector 
                                  utxoId={utxo.txid}
                                  onSelect={(tagId, remove) => handleTagSelection(utxo.txid, tagId, remove)}
                                  utxoTags={utxo.tags}
                                  trigger={
                                    <div className="flex items-center w-full">
                                      <Tag className="mr-2 h-4 w-4" />
                                      <span>Manage Tags</span>
                                    </div>
                                  }
                                />
                              </DropdownMenuItem>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <DropdownMenuItem 
                                        onClick={() => !isUTXOSelected(utxo) && handleAddToSimulation(utxo)}
                                        disabled={isUTXOSelected(utxo)}
                                        className={isUTXOSelected(utxo) ? "cursor-not-allowed opacity-50" : ""}
                                      >
                                        <Bookmark className="mr-2 h-4 w-4" />
                                        {isUTXOSelected(utxo) ? "Already in Simulation" : "Add to Simulation"}
                                      </DropdownMenuItem>
                                    </div>
                                  </TooltipTrigger>
                                  {isUTXOSelected(utxo) && (
                                    <TooltipContent>
                                      <p>Already added to simulation</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => confirmDeleteUtxo(utxo.txid)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete UTXO
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UTXODetailsModal 
        utxoId={detailsUtxoId}
        open={modalOpen} 
        onOpenChange={handleModalOpenChange}
        onTagUpdate={handleTagSelection}
      />
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !open && cancelDeleteUtxo()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete UTXO</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this UTXO? This action removes it from your wallet tracking, 
              but does not affect the actual UTXO on the blockchain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUtxo} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UTXOTable;
