
import React from "react";
import { UTXO } from "@/types/utxo";
import { UTXOTableBody } from "./UTXOTableBody";
import { UTXOViewType } from "@/types/utxo-graph";
import { SimpleTraceabilityGraph } from "./SimpleTraceabilityGraph";

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

  return (
    <div className="w-full">
      {view === 'table' && (
        <div className="w-full overflow-y-auto">
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
        <div className="w-full h-[600px] relative">
          {filteredUtxos.length > 0 ? (
            <SimpleTraceabilityGraph 
              utxos={filteredUtxos} 
              onSelectUtxo={handleVisualSelect} 
              layout="vertical"
              showConnections={true}
              animate={true}
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
