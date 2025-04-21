
import { UTXO } from "../types/utxo";

/**
 * Checks if a UTXO is in the selectedUTXOs array
 */
export const isUTXOInSelection = (
  selectedUTXOs: UTXO[],
  utxo: UTXO
): boolean => {
  return selectedUTXOs.some(
    (u) => u.txid === utxo.txid && u.vout === utxo.vout
  );
};

/**
 * Adds a UTXO to the selectedUTXOs array if not already present
 */
export const addUTXOToSelection = (
  selectedUTXOs: UTXO[],
  utxo: UTXO
): UTXO[] => {
  if (isUTXOInSelection(selectedUTXOs, utxo)) {
    console.log("UTXO already in selection:", utxo.txid.substring(0, 6), "vout:", utxo.vout);
    return selectedUTXOs;
  }

  console.log("Adding UTXO to selection:", utxo.txid.substring(0, 6), "vout:", utxo.vout);
  return [...selectedUTXOs, utxo];
};

/**
 * Removes a UTXO from the selectedUTXOs array if present
 */
export const removeUTXOFromSelection = (
  selectedUTXOs: UTXO[],
  utxo: UTXO
): UTXO[] => {
  console.log("Removing UTXO from selection:", utxo.txid.substring(0, 6), "vout:", utxo.vout);
  return selectedUTXOs.filter(
    (u) => !(u.txid === utxo.txid && u.vout === utxo.vout)
  );
};

/**
 * Toggles a UTXO in the selectedUTXOs array
 */
export const toggleUTXOInSelection = (
  selectedUTXOs: UTXO[],
  utxo: UTXO
): UTXO[] => {
  if (isUTXOInSelection(selectedUTXOs, utxo)) {
    return removeUTXOFromSelection(selectedUTXOs, utxo);
  }
  return addUTXOToSelection(selectedUTXOs, utxo);
};
