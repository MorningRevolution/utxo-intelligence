import { UTXO } from "./utxo";

export interface GraphNode {
  id: string;
  name: string;
  amount: number;
  type: "utxo" | "transaction" | "address";
  data?: any; // Original data
  riskLevel?: "low" | "medium" | "high";
  x?: number; // Position for layout
  y?: number;
  fx?: number; // Fixed positions (for pinned nodes)
  fy?: number;
  // New fields for improved visualizations
  weight?: number; // For sizing
  radius?: number; // Calculated size for rendering
  expanded?: boolean; // For expandable nodes
  date?: Date; // For timeline visualization
  month?: string; // For monthly grouping
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  isChangeOutput?: boolean;
  riskLevel?: "low" | "medium" | "high";
  path?: string; // SVG path for curved edges
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Define view types for navigation
export type UTXOViewType = "table" | "visual" | "map" | "timeline" | "treemap";

// Define a type for node selection callbacks
export type NodeSelectionCallback = (nodeId: string, nodeType: "utxo" | "transaction" | "address", data: any) => void;

// Define grouping options for treemap
export type TreemapGroupingOption = "risk" | "wallet" | "tag" | "none";

// Define filtering options
export interface UTXOFiltersState {
  searchTerm: string;
  selectedTags: string[];
  selectedWallets: string[];
  selectedRiskLevels: ("low" | "medium" | "high")[];
  minAmount?: number;
  maxAmount?: number;
  startDate?: Date;
  endDate?: Date;
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
  showAddresses: boolean;
  showLabels: boolean;
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
  utxos?: UTXO[]; // For grouping UTXOs under a transaction
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

// New interface for transaction timeline view
export interface TransactionTimelineNode {
  id: string;
  date: Date;
  amount: number; 
  utxos: UTXO[];
  addresses: string[];
  tags: string[];
  riskLevel: "low" | "medium" | "high";
  x: number;
  y: number;
  width: number; 
  height: number;
}

export interface MonthGroup {
  startDate: Date;
  endDate: Date;
  label: string;
  x: number;
  width: number;
}

export interface TransactionConnection {
  source: string;
  target: string;
  amount: number;
  path: string;
  riskLevel: "low" | "medium" | "high";
}

// Add new types for the matrix visualization
export interface MatrixNode {
  id: string;
  type: 'input' | 'transaction' | 'output';
  data: { 
    txid: string; 
    utxos: UTXO[] 
  };
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MatrixConnection {
  source: string;
  target: string;
  value: number;
  path: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// Add missing props interfaces for the visualization components
export interface ResponsiveTraceabilityMatrixProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  selectedUtxo?: UTXO | null;
  showConnections?: boolean;
  zoomLevel?: number;
}

export interface EnhancedTimelineViewProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  selectedUtxo?: UTXO | null;
  showConnections?: boolean;
  zoomLevel?: number;
}

export interface PrivacyTreemapProps {
  utxos: UTXO[];
  onSelectUtxo?: (utxo: UTXO | null) => void;
  zoomLevel?: number;
}
