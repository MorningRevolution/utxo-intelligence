
import { UTXO } from "./utxo";

export interface GraphNode {
  id: string;
  name: string;
  val: number; // size
  color: string;
  type: "utxo" | "transaction" | "address";
  data?: any; // Original data
  group?: string;
  riskLevel?: "low" | "medium" | "high";
  // Required by ForceGraph2D
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  index?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  color?: string;
  isChangeOutput?: boolean;
  riskLevel?: "low" | "medium" | "high";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Define a type for the tooltip content
export interface NodeTooltip {
  title: string;
  content: {
    label: string;
    value: string;
  }[];
}

// Define a type for node selection callbacks
export type NodeSelectionCallback = (nodeId: string, nodeType: "utxo" | "transaction" | "address", data: any) => void;

// Define view types for navigation
export type UTXOViewType = "table" | "visual" | "map";
