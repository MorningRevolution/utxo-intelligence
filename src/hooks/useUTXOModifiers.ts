
import { useCallback } from "react";
import { useWallet } from "@/store/WalletContext";
import { UTXO } from "@/types/utxo";
import { toast } from "sonner";
import { format } from "date-fns";

export function useUTXOModifiers() {
  const { 
    walletData, 
    tags, 
    tagUTXO,
    updateUtxoCostBasis,
    updateUtxoAddresses,
    autoPopulateUTXOCostBasis,
    deleteUTXO,
  } = useWallet();

  const handleTagSelection = useCallback((utxoId: string, tagId: string, remove?: boolean) => {
    if (tagId && utxoId) {
      if (remove) {
        const utxo = walletData?.utxos.find(u => u.txid === utxoId);
        const tag = tags.find(t => t.id === tagId);
        if (utxo && tag) {
          console.log(`UTXOModifiers: Removing tag ${tag.name} from UTXO ${utxoId.substring(0, 8)}`);
          tagUTXO(utxoId, null, tag.name);
          toast("Tag removed from UTXO");
        }
      } else {
        console.log(`UTXOModifiers: Adding tag ${tagId} to UTXO ${utxoId.substring(0, 8)}`);
        tagUTXO(utxoId, tagId);
        toast("Tag applied to UTXO");
      }
    }
  }, [walletData, tags, tagUTXO]);

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
  }, [walletData, updateUtxoCostBasis]);

  const deleteUtxoItem = useCallback((utxoId: string) => {
    if (deleteUTXO && typeof deleteUTXO === 'function') {
      deleteUTXO(utxoId);
      toast("UTXO deleted from wallet");
      return true;
    } else {
      toast.error("Unable to delete UTXO at this time");
      console.error("deleteUTXO function not available in WalletContext");
      return false;
    }
  }, [deleteUTXO]);

  return {
    handleTagSelection,
    handleSenderAddressEdit,
    handleReceiverAddressEdit,
    handleDateEdit,
    handleBtcPriceEdit,
    handleCostBasisEdit,
    handleNotesEdit,
    deleteUtxoItem
  };
}
