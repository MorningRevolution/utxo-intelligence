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

  return (
    <div className="w-full">
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
              <TableHead className="cursor-pointer" onClick={() => handleSort('notes')}>
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
            filteredUtxos.map((utxo) => (
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
                    <div className="flex flex-col">
                      <span className="font-semibold break-all">{formatTxid(utxo.txid, 8)}</span>
                      <span className="text-muted-foreground">vout: {utxo.vout}</span>
                    </div>
                  </TableCell>
                )}
                
                {/* Wallet */}
                {visibleColumns.wallet && (
                  <TableCell>
                    <span className="font-medium">
                      {utxo.walletName || walletData.name}
                    </span>
                  </TableCell>
                )}
                
                {/* Sender Address */}
                {visibleColumns.senderAddress && (
                  <EditableCell
                    isEditing={editableUtxo === utxo.txid}
                    onSave={(value) => handleSenderAddressEdit(utxo.txid, value)}
                    initialValue={utxo.senderAddress || ''}
                    placeholder="Enter sender address"
                    className="font-mono text-xs"
                    isDisabled={false}
                  >
                    <div className="flex flex-col">
                      <span className="break-all">{utxo.senderAddress 
                        ? (utxo.senderAddress.length > 18 
                          ? `${utxo.senderAddress.substring(0, 10)}...${utxo.senderAddress.substring(utxo.senderAddress.length - 5)}` 
                          : utxo.senderAddress) 
                        : 'Not set'}
                      </span>
                      {utxo.senderAddress && utxo.senderAddress.length > 18 && 
                        <span className="text-xs text-muted-foreground mt-1">{utxo.senderAddress}</span>}
                    </div>
                  </EditableCell>
                )}
                
                {/* Receiver Address */}
                {visibleColumns.receiverAddress && (
                  <EditableCell
                    isEditing={editableUtxo === utxo.txid}
                    onSave={(value) => handleReceiverAddressEdit(utxo.txid, value)}
                    initialValue={utxo.receiverAddress || ''}
                    placeholder="Enter receiver address"
                    className="font-mono text-xs"
                    isDisabled={false}
                  >
                    <div className="flex flex-col">
                      <span className="break-all">{utxo.receiverAddress 
                        ? (utxo.receiverAddress.length > 18 
                          ? `${utxo.receiverAddress.substring(0, 10)}...${utxo.receiverAddress.substring(utxo.receiverAddress.length - 5)}` 
                          : utxo.receiverAddress) 
                        : 'Not set'}
                      </span>
                      {utxo.receiverAddress && utxo.receiverAddress.length > 18 && 
                        <span className="text-xs text-muted-foreground mt-1">{utxo.receiverAddress}</span>}
                    </div>
                  </EditableCell>
                )}
                
                {/* Amount */}
                {visibleColumns.amount && (
                  <TableCell className="font-mono text-right">
                    {formatBTC(utxo.amount, { trimZeros: true, minDecimals: 5 })}
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
                  <EditableCell
                    isEditing={editableUtxo === utxo.txid}
                    onSave={(value) => handleBtcPriceEdit(utxo.txid, value)}
                    initialValue={utxo.acquisitionBtcPrice ? utxo.acquisitionBtcPrice.toString() : ''}
                    inputType="number"
                    placeholder="0.00"
                    isDisabled={false}
                  >
                    {utxo.acquisitionBtcPrice 
                      ? formatFiat(utxo.acquisitionBtcPrice) 
                      : <span className="text-muted-foreground">Not set</span>}
                  </EditableCell>
                )}
                
                {/* Cost Basis */}
                {visibleColumns.costBasis && (
                  <EditableCell
                    isEditing={editableUtxo === utxo.txid}
                    onSave={(value) => handleCostBasisEdit(utxo.txid, value)}
                    initialValue={utxo.acquisitionFiatValue ? utxo.acquisitionFiatValue.toString() : ''}
                    inputType="number"
                    placeholder="0.00"
                    isDisabled={false}
                  >
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
                  </EditableCell>
                )}
                
                {/* Notes */}
                {visibleColumns.notes && (
                  <EditableCell
                    isEditing={editableUtxo === utxo.txid}
                    onSave={(value) => handleNotesEdit(utxo.txid, value)}
                    initialValue={utxo.notes || ''}
                    placeholder="Add notes..."
                    isDisabled={false}
                  >
                    <div className="max-w-xs break-words">
                      {utxo.notes || <span className="text-muted-foreground italic">No notes</span>}
                    </div>
                  </EditableCell>
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
                          onClick={() => setEditableUtxo(null)}
                          className="h-8 w-8"
                        >
                          <Save className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditableUtxo(null)}
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
