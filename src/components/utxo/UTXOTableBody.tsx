
import React, { useState } from "react";
import { formatBTC, formatFiat, getRiskBadgeStyle, formatTxid } from "@/utils/utxo-utils";
import { UTXO } from "@/types/utxo";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EditableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X, Trash2, Plus, Calendar } from "lucide-react";
import { useWallet } from "@/store/WalletContext";
import { TagSelector } from "./TagSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

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
  onRowClick
}) => {
  const { tags, isUTXOSelected } = useWallet();
  const [editedValues, setEditedValues] = useState<Record<string, Record<string, any>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});

  const renderSortIndicator = (key: keyof UTXO) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'PP');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Initialize edit values
  const initEditValues = (utxo: UTXO) => {
    if (!editedValues[utxo.txid]) {
      setEditedValues(prev => ({
        ...prev,
        [utxo.txid]: {
          senderAddress: utxo.senderAddress || '',
          receiverAddress: utxo.receiverAddress || '',
          amount: utxo.amount,
          btcPrice: utxo.acquisitionBtcPrice || '',
          costBasis: utxo.acquisitionFiatValue || '',
          notes: utxo.notes || '',
          walletName: utxo.walletName || walletData.name
        }
      }));
    }
  };

  // Handle edit value changes with validation
  const handleEditChange = (utxoId: string, field: string, value: string) => {
    // Validate input based on field type
    let error = '';
    let parsedValue: any = value;
    
    if (field === 'amount') {
      const numVal = parseFloat(value);
      if (isNaN(numVal) || numVal <= 0) {
        error = 'Must be a positive number';
      } else {
        parsedValue = numVal;
      }
    } else if (field === 'btcPrice' || field === 'costBasis') {
      const numVal = parseFloat(value);
      if (value && (isNaN(numVal) || numVal < 0)) {
        error = 'Must be a non-negative number';
      } else {
        parsedValue = numVal;
      }
    }

    // Update values
    setEditedValues(prev => ({
      ...prev,
      [utxoId]: {
        ...prev[utxoId],
        [field]: parsedValue
      }
    }));

    // Update error state
    setValidationErrors(prev => ({
      ...prev,
      [utxoId]: {
        ...prev[utxoId],
        [field]: error
      }
    }));

    return !error; // Return true if valid, false if invalid
  };

  // Save edits if valid
  const saveEdits = (utxo: UTXO) => {
    const utxoErrors = validationErrors[utxo.txid] || {};
    const hasErrors = Object.values(utxoErrors).some(error => !!error);
    
    if (hasErrors) {
      toast.error("Please fix the highlighted errors before saving");
      return;
    }

    const edits = editedValues[utxo.txid];
    if (!edits) return;

    // Process each edit
    if (edits.senderAddress !== utxo.senderAddress) {
      handleSenderAddressEdit(utxo.txid, edits.senderAddress);
    }
    
    if (edits.receiverAddress !== utxo.receiverAddress) {
      handleReceiverAddressEdit(utxo.txid, edits.receiverAddress);
    }

    if (edits.btcPrice !== utxo.acquisitionBtcPrice) {
      handleBtcPriceEdit(utxo.txid, edits.btcPrice?.toString() || '');
    }

    if (edits.costBasis !== utxo.acquisitionFiatValue) {
      handleCostBasisEdit(utxo.txid, edits.costBasis?.toString() || '');
    }

    if (edits.notes !== utxo.notes) {
      handleNotesEdit(utxo.txid, edits.notes);
    }

    // Clear edit state
    setEditableUtxo(null);
  };

  // Cancel edits
  const cancelEdits = () => {
    setEditableUtxo(null);
    setValidationErrors({});
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            <TableRow>
              {visibleColumns.txid && (
                <TableHead 
                  className="w-[180px] cursor-pointer" 
                  onClick={() => handleSort('txid')}
                >
                  TXID:vout {renderSortIndicator('txid')}
                </TableHead>
              )}
              {visibleColumns.wallet && (
                <TableHead 
                  className="w-[100px] cursor-pointer" 
                  onClick={() => handleSort('walletName')}
                >
                  Wallet {renderSortIndicator('walletName')}
                </TableHead>
              )}
              {visibleColumns.senderAddress && (
                <TableHead 
                  className="min-w-[150px] cursor-pointer" 
                  onClick={() => handleSort('senderAddress')}
                >
                  Sender {renderSortIndicator('senderAddress')}
                </TableHead>
              )}
              {visibleColumns.receiverAddress && (
                <TableHead 
                  className="min-w-[150px] cursor-pointer" 
                  onClick={() => handleSort('receiverAddress')}
                >
                  Receiver {renderSortIndicator('receiverAddress')}
                </TableHead>
              )}
              {visibleColumns.amount && (
                <TableHead 
                  className="w-[120px] cursor-pointer" 
                  onClick={() => handleSort('amount')}
                >
                  Amount (BTC) {renderSortIndicator('amount')}
                </TableHead>
              )}
              {visibleColumns.date && (
                <TableHead 
                  className="w-[110px] cursor-pointer" 
                  onClick={() => handleSort('acquisitionDate')}
                >
                  Date {renderSortIndicator('acquisitionDate')}
                </TableHead>
              )}
              {visibleColumns.btcPrice && (
                <TableHead 
                  className="w-[110px] cursor-pointer" 
                  onClick={() => handleSort('acquisitionBtcPrice')}
                >
                  BTC Price {renderSortIndicator('acquisitionBtcPrice')}
                </TableHead>
              )}
              {visibleColumns.costBasis && (
                <TableHead 
                  className="w-[130px] cursor-pointer" 
                  onClick={() => handleSort('acquisitionFiatValue')}
                >
                  Cost Basis {renderSortIndicator('acquisitionFiatValue')}
                </TableHead>
              )}
              {visibleColumns.notes && (
                <TableHead className="cursor-pointer w-[200px] max-w-[300px]" onClick={() => handleSort('notes')}>
                  Notes {renderSortIndicator('notes')}
                </TableHead>
              )}
              {visibleColumns.tags && (
                <TableHead className="w-[120px]">Tags</TableHead>
              )}
              {visibleColumns.risk && (
                <TableHead 
                  className="w-[80px] cursor-pointer" 
                  onClick={() => handleSort('privacyRisk')}
                >
                  Risk {renderSortIndicator('privacyRisk')}
                </TableHead>
              )}
              {visibleColumns.actions && (
                <TableHead className="w-[130px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUtxos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Object.values(visibleColumns).filter(Boolean).length}
                  className="h-24 text-center"
                >
                  No UTXOs found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredUtxos.map((utxo) => {
                // Initialize edit values when starting to edit
                if (editableUtxo === utxo.txid) {
                  initEditValues(utxo);
                }
                
                const utxoEdits = editedValues[utxo.txid] || {};
                const utxoErrors = validationErrors[utxo.txid] || {};
                
                return (
                  <TableRow
                    key={`${utxo.txid}-${utxo.vout}`}
                    className={`
                      border-b hover:bg-muted/50 
                      ${isUTXOSelected(utxo) ? 'bg-primary/10' : ''}
                      ${editableUtxo === utxo.txid ? 'bg-muted/20' : ''}
                    `}
                    onClick={() => onRowClick && onRowClick(utxo)}
                  >
                    {/* TXID:vout */}
                    {visibleColumns.txid && (
                      <TableCell className="font-mono text-xs py-3">
                        {editableUtxo === utxo.txid ? (
                          <div className="font-mono text-xs">
                            <div className="font-semibold break-all">{formatTxid(utxo.txid, 8)}</div>
                            <div className="text-muted-foreground">vout: {utxo.vout}</div>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-semibold break-all">{formatTxid(utxo.txid, 8)}</span>
                            <span className="text-muted-foreground">vout: {utxo.vout}</span>
                          </div>
                        )}
                      </TableCell>
                    )}
                    
                    {/* Wallet */}
                    {visibleColumns.wallet && (
                      <TableCell>
                        {editableUtxo === utxo.txid ? (
                          <Input
                            className="w-full text-sm"
                            value={utxoEdits.walletName || utxo.walletName || walletData.name}
                            onChange={(e) => handleEditChange(utxo.txid, 'walletName', e.target.value)}
                          />
                        ) : (
                          <span className="font-medium">
                            {utxo.walletName || walletData.name}
                          </span>
                        )}
                      </TableCell>
                    )}
                    
                    {/* Sender Address */}
                    {visibleColumns.senderAddress && (
                      <TableCell className="font-mono text-xs max-w-[150px]">
                        {editableUtxo === utxo.txid ? (
                          <Input
                            className="w-full text-xs"
                            value={utxoEdits.senderAddress || ''}
                            onChange={(e) => handleEditChange(utxo.txid, 'senderAddress', e.target.value)}
                            placeholder="Enter sender address"
                          />
                        ) : (
                          <div className="flex flex-col break-all">
                            <span>{utxo.senderAddress 
                              ? (utxo.senderAddress.length > 18 
                                ? `${utxo.senderAddress.substring(0, 10)}...${utxo.senderAddress.substring(utxo.senderAddress.length - 5)}` 
                                : utxo.senderAddress) 
                              : 'Not set'}
                            </span>
                            {utxo.senderAddress && utxo.senderAddress.length > 18 && 
                              <span className="text-xs text-muted-foreground mt-1 truncate" title={utxo.senderAddress}>{utxo.senderAddress}</span>}
                          </div>
                        )}
                      </TableCell>
                    )}
                    
                    {/* Receiver Address */}
                    {visibleColumns.receiverAddress && (
                      <TableCell className="font-mono text-xs max-w-[150px]">
                        {editableUtxo === utxo.txid ? (
                          <Input
                            className="w-full text-xs"
                            value={utxoEdits.receiverAddress || ''}
                            onChange={(e) => handleEditChange(utxo.txid, 'receiverAddress', e.target.value)}
                            placeholder="Enter receiver address"
                          />
                        ) : (
                          <div className="flex flex-col break-all">
                            <span>{utxo.receiverAddress 
                              ? (utxo.receiverAddress.length > 18 
                                ? `${utxo.receiverAddress.substring(0, 10)}...${utxo.receiverAddress.substring(utxo.receiverAddress.length - 5)}` 
                                : utxo.receiverAddress) 
                              : 'Not set'}
                            </span>
                            {utxo.receiverAddress && utxo.receiverAddress.length > 18 && 
                              <span className="text-xs text-muted-foreground mt-1 truncate" title={utxo.receiverAddress}>{utxo.receiverAddress}</span>}
                          </div>
                        )}
                      </TableCell>
                    )}
                    
                    {/* Amount */}
                    {visibleColumns.amount && (
                      <TableCell className="font-mono text-right">
                        {editableUtxo === utxo.txid ? (
                          <div>
                            <Input
                              className="w-full text-right"
                              value={utxoEdits.amount || utxo.amount}
                              onChange={(e) => handleEditChange(utxo.txid, 'amount', e.target.value)}
                              type="number"
                              step="0.00000001"
                              min="0"
                              required
                            />
                            {utxoErrors.amount && (
                              <p className="text-xs text-destructive mt-1">{utxoErrors.amount}</p>
                            )}
                          </div>
                        ) : (
                          formatBTC(utxo.amount, { trimZeros: true, minDecimals: 5 })
                        )}
                      </TableCell>
                    )}
                    
                    {/* Acquisition Date */}
                    {visibleColumns.date && (
                      <TableCell>
                        {editableUtxo === utxo.txid ? (
                          <Popover open={datePickerOpen === utxo.txid} onOpenChange={(open) => !open && setDatePickerOpen(null)}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-left font-normal"
                                onClick={() => setDatePickerOpen(datePickerOpen === utxo.txid ? null : utxo.txid)}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {utxo.acquisitionDate ? formatDate(utxo.acquisitionDate) : 'Select date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
                              <CalendarComponent
                                mode="single"
                                selected={utxo.acquisitionDate ? new Date(utxo.acquisitionDate) : undefined}
                                onSelect={(date) => {
                                  handleDateEdit(utxo.txid, date);
                                  setDatePickerOpen(null);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="flex flex-col">
                            {formatDate(utxo.acquisitionDate)}
                          </div>
                        )}
                      </TableCell>
                    )}
                    
                    {/* BTC Price at Acquisition */}
                    {visibleColumns.btcPrice && (
                      <TableCell>
                        {editableUtxo === utxo.txid ? (
                          <div>
                            <Input
                              className="w-full"
                              value={utxoEdits.btcPrice || ''}
                              onChange={(e) => handleEditChange(utxo.txid, 'btcPrice', e.target.value)}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                            {utxoErrors.btcPrice && (
                              <p className="text-xs text-destructive mt-1">{utxoErrors.btcPrice}</p>
                            )}
                          </div>
                        ) : (
                          utxo.acquisitionBtcPrice 
                            ? formatFiat(utxo.acquisitionBtcPrice) 
                            : <span className="text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                    )}
                    
                    {/* Cost Basis */}
                    {visibleColumns.costBasis && (
                      <TableCell>
                        {editableUtxo === utxo.txid ? (
                          <div>
                            <Input
                              className="w-full"
                              value={utxoEdits.costBasis || ''}
                              onChange={(e) => handleEditChange(utxo.txid, 'costBasis', e.target.value)}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                            {utxoErrors.costBasis && (
                              <p className="text-xs text-destructive mt-1">{utxoErrors.costBasis}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span>
                              {utxo.acquisitionFiatValue 
                                ? formatFiat(utxo.acquisitionFiatValue) 
                                : <span className="text-muted-foreground">Not set</span>}
                            </span>
                            {utxo.costAutoPopulated && (
                              <span className="text-xs text-muted-foreground">Auto calculated</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                    
                    {/* Notes */}
                    {visibleColumns.notes && (
                      <TableCell>
                        {editableUtxo === utxo.txid ? (
                          <Input
                            className="w-full"
                            value={utxoEdits.notes || ''}
                            onChange={(e) => handleEditChange(utxo.txid, 'notes', e.target.value)}
                            placeholder="Add notes..."
                          />
                        ) : (
                          <div className="max-w-[200px] break-words overflow-hidden text-ellipsis">
                            {utxo.notes || <span className="text-muted-foreground italic">No notes</span>}
                          </div>
                        )}
                      </TableCell>
                    )}
                    
                    {/* Tags */}
                    {visibleColumns.tags && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {utxo.tags.length > 0 ? (
                            utxo.tags.map((tag, idx) => (
                              <Badge 
                                key={`${tag}-${idx}`} 
                                variant="outline"
                                className="whitespace-nowrap text-xs"
                              >
                                {tag}
                                {editableUtxo === utxo.txid && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-3 w-3 ml-1 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const tagObj = tags.find(t => t.name === tag);
                                      if (tagObj) {
                                        handleTagSelection(utxo.txid, tagObj.id, true);
                                      }
                                    }}
                                  >
                                    <X className="h-2 w-2" />
                                  </Button>
                                )}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-xs">No tags</span>
                          )}
                          
                          {editableUtxo === utxo.txid && (
                            <TagSelector 
                              utxoId={utxo.txid}
                              utxoTags={utxo.tags}
                              onSelect={(tagId) => handleTagSelection(utxo.txid, tagId)}
                            />
                          )}
                        </div>
                      </TableCell>
                    )}
                    
                    {/* Privacy Risk */}
                    {visibleColumns.risk && (
                      <TableCell>
                        <Badge variant="outline" className={`${getRiskBadgeStyle(utxo.privacyRisk)}`}>
                          {utxo.privacyRisk.toUpperCase()}
                        </Badge>
                      </TableCell>
                    )}
                    
                    {/* Actions */}
                    {visibleColumns.actions && (
                      <TableCell className="text-right space-x-2">
                        {editableUtxo === utxo.txid ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => saveEdits(utxo)}
                              className="h-8 w-8"
                            >
                              <Save className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={cancelEdits}
                              className="h-8 w-8"
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditableUtxo(utxo.txid);
                              }}
                              className="h-8 w-8"
                              title="Edit UTXO"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToSimulation(utxo);
                              }}
                              className="h-8 w-8"
                              title="Add to simulation"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteUtxo(utxo.txid);
                              }}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Delete UTXO"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
