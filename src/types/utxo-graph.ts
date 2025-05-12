
import { UTXO } from "./utxo";

export interface GraphNode {
  id: string;
  name: string;
  amount: number;
  type: "utxo" | "transaction" | "address";
  data?: any; // Original data
  riskLevel?: "low" | "medium" | "high";
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
  isChangeOutput?: boolean;
  riskLevel?: "low" | "medium" | "high";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Define view types for navigation
export type UTXOViewType = "table" | "visual" | "map" | "traceability" | "treemap";

// Define a type for node selection callbacks
export type NodeSelectionCallback = (nodeId: string, nodeType: "utxo" | "transaction" | "address", data: any) => void;
