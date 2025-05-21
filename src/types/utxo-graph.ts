import { UTXO } from "./utxo";

export interface GraphNode {
  id: string;
  name: string;
  amount: number;
  type: "utxo" | "transaction" | "address";
  data?: any; // Original data
  riskLevel?: "low" | "medium" | "high";
  x?: number; // Position for force-directed layout
  y?: number;
  fx?: number; // Fixed positions (for pinned nodes)
  fy?: number;
  // New fields for improved visualizations
  weight?: number; // For force simulation
  radius?: number; // Calculated size for rendering
  expanded?: boolean; // For expandable nodes
}

export interface GraphLink {
  // Update the types to handle both string and GraphNode references
  source: string | GraphNode;
  target: string | GraphNode;
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

// Define grouping options for treemap
export type TreemapGroupingOption = "risk" | "wallet" | "tag" | "none";

// Define filtering options - modified to match what the error suggests we need
export interface UTXOFiltersState {
  searchTerm: string;
  selectedTags: string[];
  selectedWallets: string[];
  selectedRiskLevels: ("low" | "medium" | "high")[];
  minAmount?: number;
  maxAmount?: number;
}

// New type for treemap tile data
export interface TreemapTile {
  id: string;
  name: string;
  value: number; // BTC amount
  displaySize: number; // Calculated size for display
  color: string;
  data: UTXO; // Original UTXO data
  x?: number; // Position (calculated during layout)
  y?: number;
  width?: number;
  height?: number;
}

// New types for improved visualization controls
export interface VisualizationControls {
  zoom: number;
  position: { x: number; y: number };
  grouping: TreemapGroupingOption;
  expandedNodes: Set<string>;
}

// Timeline-specific types
export interface TimelineData {
  nodes: TimelineNode[];
  links: TimelineLink[];
  timePeriods: TimePeriod[];
}

export interface TimelineNode {
  id: string;
  type: "transaction" | "address";
  date: Date;
  amount: number;
  x: number;
  y: number;
  width: number;
  height: number;
  risk: "low" | "medium" | "high";
  metadata?: any;
}

export interface TimelineLink {
  source: string;
  target: string;
  value: number;
  riskLevel: "low" | "medium" | "high";
  path?: string;
}

export interface TimePeriod {
  start: Date;
  end: Date;
  label: string;
  x: number;
  width: number;
}
