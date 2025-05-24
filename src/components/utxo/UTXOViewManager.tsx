
import React from "react";
import { UTXO } from "@/types/utxo";
import { UTXOTableBody } from "./UTXOTableBody";
import { UTXOViewType } from "@/types/utxo-graph";
import { SimpleTraceabilityGraph } from "./SimpleTraceabilityGraph";
import { ResponsiveTraceabilityMatrix } from "./ResponsiveTraceabilityMatrix";
import { EnhancedTimelineView } from "./EnhancedTimelineView";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface UTXOViewManagerProps {
  view: UTXOViewType;
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
  selectedVisualUtxo: UTXO | null;
  handleVisualSelect: (utxo: UTXO | null) => void;
}

export const UTXOViewManager: React.FC<UTXOViewManagerProps> = ({
  view,
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
  selectedVisualUtxo,
  handleVisualSelect,
}) => {
  const handleRowClick = (utxo: UTXO) => {
    // Only select for visualization if not currently editing
    if (!editableUtxo) {
      // If already selected, toggle off
      if (selectedVisualUtxo && 
          selectedVisualUtxo.txid === utxo.txid && 
          selectedVisualUtxo.vout === utxo.vout) {
        handleVisualSelect(null);
      } else {
        handleVisualSelect(utxo);
      }
    }
  };

  // View-specific tooltips to explain the visualization
  const getViewTooltip = () => {
    switch(view) {
      case 'visual':
        return "Matrix view shows relationships between transactions and addresses. Hover over nodes for details.";
      case 'timeline':
        return "Timeline view displays transactions chronologically by month. Size represents BTC amount.";
      default:
        return "Table view of all UTXOs. Click a row to select.";
    }
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground mr-2" />
            </TooltipTrigger>
            <TooltipContent>
              {getViewTooltip()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p className="text-sm text-muted-foreground">{filteredUtxos.length} UTXOs shown</p>
      </div>
      
      {view === 'table' && (
        <div className="w-full">
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
            onRowClick={handleRowClick}
          />
        </div>
      )}
      {view === 'visual' && (
        <div className="w-full h-[600px] relative overflow-hidden rounded-lg border">
          {filteredUtxos.length > 0 ? (
            <ResponsiveTraceabilityMatrix
              utxos={filteredUtxos} 
              onSelectUtxo={handleVisualSelect}
              selectedUtxo={selectedVisualUtxo}
              showConnections={true}
              zoomLevel={1}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-md">
              <p className="text-muted-foreground text-lg">No UTXOs to display. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      )}
      {view === 'timeline' && (
        <div className="w-full h-[600px] relative overflow-hidden rounded-lg border">
          {filteredUtxos.length > 0 ? (
            <EnhancedTimelineView
              utxos={filteredUtxos}
              onSelectUtxo={handleVisualSelect}
              selectedUtxo={selectedVisualUtxo}
              showConnections={true}
              zoomLevel={1}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-md">
              <p className="text-muted-foreground text-lg">No UTXOs to display. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
