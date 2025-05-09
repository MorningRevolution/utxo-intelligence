
import { useCallback } from "react";
import { format } from "date-fns";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useWallet } from "@/store/WalletContext";
import { TagSelector } from "@/components/utxo/TagSelector";
import { formatBTC, formatTxid, getRiskColor } from "@/utils/utxo-utils";
import { ArrowUpDown, MoreVertical, Tag, Bookmark, CalendarIcon, DollarSign, Pencil, Check, X, Trash2, Wallet } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { UTXO } from "@/types/utxo";

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
}

interface EditableCellProps {
  isEditing: boolean;
  initialValue: string;
  onSave: (value: string) => void;
  inputType?: string;
  placeholder?: string;
  isDisabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const EditableCell = ({
  isEditing,
  initialValue,
  onSave,
  inputType = "text",
  placeholder,
  isDisabled = false,
  className,
  children,
}: EditableCellProps) => {
  if (isEditing) {
    return (
      <TableCell className={className}>
        <Input
          type={inputType}
          defaultValue={initialValue}
          onBlur={(e) => onSave(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          className="w-full h-8"
          autoFocus={!isDisabled}
        />
      </TableCell>
    );
  }
  return (
    <TableCell className={className}>
      {children || initialValue}
    </TableCell>
  );
};

export const UTXOTableBody = ({
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
}: UTXOTableBodyProps) => {
  const isMobile = useIsMobile();
  const { 
    tags, 
    selectedCurrency,
    isUTXOSelected,
  } = useWallet();

  const handleTxidEdit = useCallback((utxoId: string, newValue: string) => {
    toast.warning("TXID cannot be modified - this is an immutable blockchain record");
  }, []);

  const handleAmountEdit = useCallback((utxoId: string, newValue: string) => {
    toast.warning("Amount cannot be modified - this would require a blockchain transaction");
  }, []);

  const startEditing = (utxoId: string) => {
    setEditableUtxo(utxoId);
  };

  const cancelEditing = () => {
    setEditableUtxo(null);
    setDatePickerOpen(null);
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

  // Format BTC amounts trimming trailing zeros (up to 8 decimals)
  const formatBitcoinAmount = (amount: number): string => {
    if (amount === 0) return '0';
    
    // Format to 8 decimal places
    const formatted = amount.toFixed(8);
    
    // Remove trailing zeros
    const trimmed = formatted.replace(/\.?0+$/, '');
    
    // If the result ends with a decimal point, remove it
    return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
  };

  // Format BTC price with $ prefix and thousands separators
  const formatBtcPrice = (price: number | null): string => {
    if (price === null) return 'N/A';
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="w-full">
        <Table>
          <TableCaption>
            {filteredUtxos.length} of {walletData.utxos.length} UTXOs • Total Balance: {formatBTC(walletData.totalBalance)}
          </TableCaption>
          <TableHeader>
            <TableRow>
              {visibleColumns.txid && (
                <TableHead className="w-[100px] lg:w-[140px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('txid')}>
                    TxID
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.wallet && (
                <TableHead className="w-[90px] lg:w-[110px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('walletName')}>
                    <Wallet className="mr-1 h-4 w-4" />
                    Wallet
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.senderAddress && (
                <TableHead className="max-w-[120px] lg:max-w-[150px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('senderAddress')}>
                    Sender
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
              )}

              {visibleColumns.receiverAddress && (
                <TableHead className="max-w-[120px] lg:max-w-[150px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('receiverAddress')}>
                    Receiver
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.amount && (
                <TableHead className="w-[80px] lg:w-[100px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('amount')}>
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.date && (
                <TableHead className="w-[110px] lg:w-[130px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('acquisitionDate')}>
                    <CalendarIcon className="mr-1 h-4 w-4" />
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.btcPrice && (
                <TableHead className="w-[100px] lg:w-[120px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('acquisitionBtcPrice')}>
                    <DollarSign className="mr-1 h-4 w-4" />
                    BTC Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.costBasis && (
                <TableHead className="w-[100px] lg:w-[120px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('acquisitionFiatValue')}>
                    Cost Basis
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.notes && (
                <TableHead className="max-w-[120px] lg:max-w-[140px]">
                  Notes
                </TableHead>
              )}
              
              {visibleColumns.tags && (
                <TableHead className="max-w-[120px] lg:max-w-[160px]">
                  <div className="flex items-center">
                    <Tag className="mr-1 h-4 w-4" />
                    Tags
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.risk && (
                <TableHead className="w-[90px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('privacyRisk')}>
                    Risk
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
              )}
              
              {visibleColumns.actions && (
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUtxos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center py-8 text-foreground">
                  No UTXOs matching the current filters
                </TableCell>
              </TableRow>
            ) : (
              filteredUtxos.map((utxo) => {
                const isEditing = editableUtxo === utxo.txid;
                // Determine walletName (for demo purposes)
                const walletName = utxo.walletName || walletData.name;
                
                return (
                  <TableRow key={utxo.txid + "-" + utxo.vout}>
                    {/* TxID Cell - Now editable but with feedback */}
                    {visibleColumns.txid && (
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={formatTxid(utxo.txid)}
                        onSave={(value) => handleTxidEdit(utxo.txid, value)}
                        inputType="text"
                        placeholder="TxID"
                        isDisabled={true}
                        className="font-mono break-all"
                      >
                        <div className="flex items-center gap-2">
                          {isUTXOSelected(utxo) && (
                            <div className="bg-green-500/10 text-green-500 p-1 rounded">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                          <span className="break-all">{formatTxid(utxo.txid)}</span>
                        </div>
                      </EditableCell>
                    )}
                    
                    {/* Wallet Cell - Simplified to only display name */}
                    {visibleColumns.wallet && (
                      <TableCell className="whitespace-nowrap">
                        {walletName}
                      </TableCell>
                    )}
                    
                    {/* Sender Address Cell */}
                    {visibleColumns.senderAddress && (
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={utxo.senderAddress || ""}
                        onSave={(value) => handleSenderAddressEdit(utxo.txid, value)}
                        inputType="text"
                        placeholder="Enter sender address..."
                        className="font-mono text-xs break-all"
                      />
                    )}

                    {/* Receiver Address Cell */}
                    {visibleColumns.receiverAddress && (
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={utxo.receiverAddress || ""}
                        onSave={(value) => handleReceiverAddressEdit(utxo.txid, value)}
                        inputType="text"
                        placeholder="Enter receiver address..."
                        className="font-mono text-xs break-all"
                      />
                    )}
                    
                    {/* Amount Cell - Now editable but with feedback */}
                    {visibleColumns.amount && (
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={String(utxo.amount)}
                        onSave={(value) => handleAmountEdit(utxo.txid, value)}
                        inputType="number"
                        placeholder="Amount"
                        isDisabled={true}
                      >
                        {formatBitcoinAmount(utxo.amount)} BTC
                      </EditableCell>
                    )}
                    
                    {/* Acquisition Date Cell - Editable with calendar */}
                    {visibleColumns.date && (
                      isEditing ? (
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
                            <PopoverContent className="w-auto p-0 z-50" align="start">
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
                      )
                    )}
                    
                    {/* BTC Price Cell - Editable */}
                    {visibleColumns.btcPrice && (
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={utxo.acquisitionBtcPrice !== null 
                          ? String(utxo.acquisitionBtcPrice)
                          : ""}
                        onSave={(value) => handleBtcPriceEdit(utxo.txid, value)}
                        inputType="number"
                        placeholder="Enter BTC price..."
                      >
                        {utxo.acquisitionBtcPrice !== null 
                          ? formatBtcPrice(utxo.acquisitionBtcPrice) 
                          : ""}
                      </EditableCell>
                    )}
                    
                    {/* Cost Basis Cell - Editable */}
                    {visibleColumns.costBasis && (
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
                    )}
                    
                    {/* Notes Cell - Editable */}
                    {visibleColumns.notes && (
                      <EditableCell
                        isEditing={isEditing}
                        initialValue={utxo.notes || ""}
                        onSave={(value) => handleNotesEdit(utxo.txid, value)}
                        inputType="text"
                        placeholder="Add notes..."
                        className="max-w-[120px] lg:max-w-[140px] break-all"
                      />
                    )}
                    
                    {/* Tags Cell - Not directly editable in the row */}
                    {visibleColumns.tags && (
                      <TableCell className="max-w-[120px] lg:max-w-[160px]">
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
                    )}
                    
                    {/* Risk Cell - Not editable */}
                    {visibleColumns.risk && (
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${getRiskColor(utxo.privacyRisk)}`}></div>
                          <span className="ml-2 capitalize">{utxo.privacyRisk}</span>
                        </div>
                      </TableCell>
                    )}
                    
                    {/* Actions Cell - Modified to move Edit functionality to dropdown */}
                    {visibleColumns.actions && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          {isEditing ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={cancelEditing}
                              className="p-1 h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover text-popover-foreground z-50">
                                <DropdownMenuItem onClick={() => startEditing(utxo.txid)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit UTXO
                                </DropdownMenuItem>
                                <div onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}>
                                  <TagSelector 
                                    utxoId={utxo.txid}
                                    onSelect={(tagId, remove) => handleTagSelection(utxo.txid, tagId, remove)}
                                    utxoTags={utxo.tags}
                                    trigger={
                                      <div className="flex items-center w-full px-2 py-1.5 text-sm">
                                        <Tag className="mr-2 h-4 w-4" />
                                        <span>Manage Tags</span>
                                      </div>
                                    }
                                  />
                                </div>
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
                          )}
                        </div>
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

export default UTXOTableBody;
