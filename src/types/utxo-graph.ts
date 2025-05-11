
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
