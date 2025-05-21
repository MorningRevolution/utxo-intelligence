
import React from "react";
import { UTXO } from "@/types/utxo";
import { UTXOTableBody } from "./UTXOTableBody";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UTXOViewType } from "@/types/utxo-graph";

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
  const navigate = useNavigate();

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

  // Show table view only - visual views are on separate pages
  return (
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
  );
};
