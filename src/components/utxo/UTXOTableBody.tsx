
import React, { useState } from "react";
import { UTXO } from "@/types/utxo";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { TagSelector } from "./TagSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, Edit2, SaveIcon, Trash2, Play, X, CalendarIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface UTXOTableBodyProps {
  filteredUtxos: UTXO[];
  walletData: any;
  visibleColumns: Record<string, boolean>;
  sortConfig: { key: keyof UTXO; direction: 'asc' | 'desc' };
  handleSort: (key: keyof UTXO) => void;
  editableUtxo: string | null;
  setEditableUtxo: (id: string | null) => void;
  datePickerOpen: string | null;
  setDatePickerOpen: (id: string | null) => void;
  confirmDeleteUtxo: (id: string) => void;
  handleTagSelection: (utxoId: string, tagId: string, remove?: boolean) => void;
  handleAddToSimulation: (utxo: UTXO) => void;
  handleSenderAddressEdit: (utxoId: string, newValue: string) => void;
  handleReceiverAddressEdit: (utxoId: string, newValue: string) => void;
  handleDateEdit: (utxoId: string, date: Date | undefined) => void;
  handleBtcPriceEdit: (utxoId: string, newValue: string) => void;
  handleCostBasisEdit: (utxoId: string, newValue: string) => void;
  handleNotesEdit: (utxoId: string, newValue: string) => void;
  onRowClick?: (utxo: UTXO) => void;
}

export const UTXOTableBody: React.FC<UTXOTableBodyProps> = ({
  filteredUtxos,
  walletData,
  visibleColumns,
  sortConfig,
  handleSort,
  editableUtxo,
  setEditableUtxo,
  datePickerOpen,
  setDatePickerOpen,
  confirmDeleteUtxo,
  handleTagSelection,
  handleAddToSimulation,
  handleSenderAddressEdit,
  handleReceiverAddressEdit,
  handleDateEdit,
  handleBtcPriceEdit,
  handleCostBasisEdit,
  handleNotesEdit,
  onRowClick,
}) => {
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  
  // Format BTC values with proper precision
  const formatBTC = (amount: number) => {
    if (amount < 0.001) {
      return amount.toFixed(8);
    } else if (amount < 0.1) {
      return amount.toFixed(6);
    } else {
      return amount.toFixed(4);
    }
  };
  
  // Format addresses to display shortened versions
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };
  
  // Get CSS classes for risk level badges
  const getRiskBadgeStyle = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'low':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      default:
        return 'bg-slate-100 text-slate-800 hover:bg-slate-200';
    }
  };
  
  // Format date for display
  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };
  
  // Handle edit click for a field
  const handleEditClick = (utxo: UTXO) => {
    if (editableUtxo === `${utxo.txid}-${utxo.vout}`) {
      setEditableUtxo(null);
    } else {
      setEditableUtxo(`${utxo.txid}-${utxo.vout}`);
      // Initialize edit values with current values
      setEditValues({
        senderAddress: utxo.senderAddress || '',
        address: utxo.address || '',
        btcPrice: utxo.btcPrice?.toString() || '',
        costBasis: utxo.costBasis?.toString() || '',
        notes: utxo.notes || '',
      });
    }
  };
  
  // Handle input change for editable fields
  const handleInputChange = (field: string, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle save action for a specific field
  const handleSave = (utxo: UTXO, field: string) => {
    const utxoId = `${utxo.txid}-${utxo.vout}`;
    const value = editValues[field];
    
    // Input validation based on field type
    if (field === 'btcPrice' || field === 'costBasis') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        toast.error(`Invalid value for ${field}. Please enter a valid number.`);
        return;
      }
    }
    
    switch (field) {
      case 'senderAddress':
        handleSenderAddressEdit(utxoId, value);
        break;
      case 'address':
        handleReceiverAddressEdit(utxoId, value);
        break;
      case 'btcPrice':
        handleBtcPriceEdit(utxoId, value);
        break;
      case 'costBasis':
        handleCostBasisEdit(utxoId, value);
        break;
      case 'notes':
        handleNotesEdit(utxoId, value);
        break;
    }
    
    toast.success(`Updated ${field} for UTXO`);
  };
  
  // Render the sort indicator based on current sort config
  const renderSortIndicator = (key: keyof UTXO) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? 
        <ChevronUp className="h-4 w-4" /> : 
        <ChevronDown className="h-4 w-4" />;
    }
    return null;
  };

  return (
    <div className="w-full relative">
      <ScrollArea className="h-[calc(100vh-300px)] w-full">
        <Table>
          {/* Sticky header */}
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            <TableRow>
              {visibleColumns.txid && (
                <TableHead 
                  className="w-[200px] cursor-pointer"
                  onClick={() => handleSort('txid')}
                >
                  <div className="flex items-center">
                    Transaction ID
                    {renderSortIndicator('txid')}
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.vout && (
                <TableHead 
                  className="w-[60px] cursor-pointer"
                  onClick={() => handleSort('vout')}
                >
                  <div className="flex items-center">
                    Vout
                    {renderSortIndicator('vout')}
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.amount && (
                <TableHead 
                  className="w-[100px] cursor-pointer"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center">
                    BTC Amount
                    {renderSortIndicator('amount')}
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.senderAddress && (
                <TableHead className="w-[150px]">Sender Address</TableHead>
              )}
              
              {visibleColumns.address && (
                <TableHead className="w-[150px]">Receiver Address</TableHead>
              )}
              
              {visibleColumns.acquisitionDate && (
                <TableHead 
                  className="w-[120px] cursor-pointer"
                  onClick={() => handleSort('acquisitionDate')}
                >
                  <div className="flex items-center">
                    Date
                    {renderSortIndicator('acquisitionDate')}
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.btcPrice && (
                <TableHead 
                  className="w-[100px] cursor-pointer"
                  onClick={() => handleSort('btcPrice')}
                >
                  <div className="flex items-center">
                    BTC Price
                    {renderSortIndicator('btcPrice')}
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.costBasis && (
                <TableHead 
                  className="w-[100px] cursor-pointer"
                  onClick={() => handleSort('costBasis')}
                >
                  <div className="flex items-center">
                    Cost Basis
                    {renderSortIndicator('costBasis')}
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.privacyRisk && (
                <TableHead 
                  className="w-[100px] cursor-pointer"
                  onClick={() => handleSort('privacyRisk')}
                >
                  <div className="flex items-center">
                    Privacy Risk
                    {renderSortIndicator('privacyRisk')}
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.walletName && (
                <TableHead 
                  className="w-[120px] cursor-pointer"
                  onClick={() => handleSort('walletName')}
                >
                  <div className="flex items-center">
                    Wallet
                    {renderSortIndicator('walletName')}
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.tags && (
                <TableHead className="w-[150px]">Tags</TableHead>
              )}
              
              {visibleColumns.notes && (
                <TableHead className="min-w-[150px] max-w-[300px]">Notes</TableHead>
              )}
              
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          
          {/* Table body with UTXO data */}
          <TableBody>
            {filteredUtxos.map(utxo => {
              const isEditing = editableUtxo === `${utxo.txid}-${utxo.vout}`;
              return (
                <TableRow 
                  key={`${utxo.txid}-${utxo.vout}`} 
                  className={`${onRowClick ? 'cursor-pointer' : ''} ${isEditing ? 'bg-muted/50' : ''}`}
                  onClick={onRowClick && !isEditing ? () => onRowClick(utxo) : undefined}
                >
                  {visibleColumns.txid && (
                    <TableCell className="font-mono text-xs truncate max-w-[200px]">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{utxo.txid.substring(0, 8)}...</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs break-all max-w-[300px]">{utxo.txid}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  )}
                  
                  {visibleColumns.vout && (
                    <TableCell>{utxo.vout}</TableCell>
                  )}
                  
                  {visibleColumns.amount && (
                    <TableCell className="font-medium">{formatBTC(utxo.amount)}</TableCell>
                  )}
                  
                  {visibleColumns.senderAddress && (
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <Input
                            value={editValues.senderAddress}
                            onChange={(e) => handleInputChange('senderAddress', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Sender address"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => handleSave(utxo, 'senderAddress')}
                          >
                            <SaveIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate inline-block max-w-[120px]">
                                {utxo.senderAddress ? formatAddress(utxo.senderAddress) : '-'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs break-all max-w-[300px]">
                                {utxo.senderAddress || 'No sender address'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  )}
                  
                  {visibleColumns.address && (
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <Input
                            value={editValues.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Receiver address"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => handleSave(utxo, 'address')}
                          >
                            <SaveIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate inline-block max-w-[120px]">
                                {formatAddress(utxo.address)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs break-all max-w-[300px]">{utxo.address}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  )}
                  
                  {visibleColumns.acquisitionDate && (
                    <TableCell>
                      <Popover open={datePickerOpen === `${utxo.txid}-${utxo.vout}`} onOpenChange={(open) => !open && setDatePickerOpen(null)}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className={`w-full h-8 justify-start text-left font-normal ${!utxo.acquisitionDate ? 'text-muted-foreground' : ''}`}
                            onClick={() => setDatePickerOpen(`${utxo.txid}-${utxo.vout}`)}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {utxo.acquisitionDate ? formatDate(utxo.acquisitionDate) : <span>Select date...</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : undefined}
                            onSelect={(date) => {
                              handleDateEdit(`${utxo.txid}-${utxo.vout}`, date);
                              setDatePickerOpen(null);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  )}
                  
                  {visibleColumns.btcPrice && (
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <Input
                            value={editValues.btcPrice}
                            onChange={(e) => handleInputChange('btcPrice', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="BTC price"
                            type="number"
                            step="0.01"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => handleSave(utxo, 'btcPrice')}
                          >
                            <SaveIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span>${utxo.btcPrice?.toFixed(2) || '-'}</span>
                      )}
                    </TableCell>
                  )}
                  
                  {visibleColumns.costBasis && (
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <Input
                            value={editValues.costBasis}
                            onChange={(e) => handleInputChange('costBasis', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Cost basis"
                            type="number"
                            step="0.01"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => handleSave(utxo, 'costBasis')}
                          >
                            <SaveIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span>${utxo.costBasis?.toFixed(2) || '-'}</span>
                      )}
                    </TableCell>
                  )}
                  
                  {visibleColumns.privacyRisk && (
                    <TableCell>
                      <Badge className={getRiskBadgeStyle(utxo.privacyRisk)}>
                        {utxo.privacyRisk}
                      </Badge>
                    </TableCell>
                  )}
                  
                  {visibleColumns.walletName && (
                    <TableCell>
                      {utxo.walletName || '-'}
                    </TableCell>
                  )}
                  
                  {visibleColumns.tags && (
                    <TableCell>
                      <TagSelector
                        selectedTags={utxo.tags}
                        onSelectTag={(tagId) => handleTagSelection(`${utxo.txid}-${utxo.vout}`, tagId)}
                        onRemoveTag={(tagId) => handleTagSelection(`${utxo.txid}-${utxo.vout}`, tagId, true)}
                        availableTags={walletData.tags}
                      />
                    </TableCell>
                  )}
                  
                  {visibleColumns.notes && (
                    <TableCell className="max-w-[300px]">
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <Input
                            value={editValues.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Notes"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => handleSave(utxo, 'notes')}
                          >
                            <SaveIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="truncate">
                          {utxo.notes || '-'}
                        </div>
                      )}
                    </TableCell>
                  )}
                  
                  <TableCell className="text-right">
                    <div className="flex space-x-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(utxo);
                        }}
                        className="h-7 w-7"
                      >
                        {isEditing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDeleteUtxo(`${utxo.txid}-${utxo.vout}`);
                        }}
                        className="h-7 w-7 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToSimulation(utxo);
                        }}
                        className="h-7 w-7 text-blue-600 hover:text-blue-700"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {filteredUtxos.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  <div className="text-muted-foreground">No UTXOs found matching the current filters.</div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};
