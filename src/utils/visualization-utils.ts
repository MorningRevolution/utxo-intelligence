import { GraphData, GraphNode, GraphLink, TreemapGroupingOption, UTXOFiltersState } from "@/types/utxo-graph";
import { UTXO } from "@/types/utxo";
import { getRiskColor } from "@/utils/utxo-utils";

/**
 * Creates a traceability graph from UTXOs
 */
export const createTraceabilityGraph = (utxos: UTXO[]): GraphData => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const addedTxs = new Set<string>();
  const addedAddresses = new Set<string>();
  
  // Group UTXOs by transaction first
  const txGroups = new Map<string, UTXO[]>();
  
  utxos.forEach(utxo => {
    if (!txGroups.has(utxo.txid)) {
      txGroups.set(utxo.txid, []);
    }
    txGroups.get(utxo.txid)!.push(utxo);
  });
  
  // Process transactions to build unified TX nodes
  txGroups.forEach((utxosInTx, txid) => {
    // Calculate total amount for this transaction
    const totalAmount = utxosInTx.reduce((sum, u) => sum + (u.amount || 0), 0);
    
    // Create unified transaction node
    const txNodeId = `tx-${txid}`;
    const txNode: GraphNode = {
      id: txNodeId,
      name: `TX ${txid.substring(0, 8)}...`,
      amount: totalAmount,
      type: "transaction",
      data: { 
        txid: txid,
        utxos: utxosInTx,
        tags: Array.from(new Set(utxosInTx.flatMap(u => u.tags)))
      }
    };
    nodes.push(txNode);
    nodeMap.set(txNodeId, txNode);
    
    // Create address nodes and connect them
    utxosInTx.forEach(utxo => {
      // Handle receiver address
      if (utxo.address) {
        const addrNodeId = `addr-${utxo.address}`;
        if (!addedAddresses.has(addrNodeId)) {
          addedAddresses.add(addrNodeId);
          const addrNode: GraphNode = {
            id: addrNodeId,
            name: `${utxo.address.substring(0, 8)}...`,
            amount: 0, // Will be accumulated
            type: "address",
            data: { address: utxo.address }
          };
          nodes.push(addrNode);
          nodeMap.set(addrNodeId, addrNode);
        }
        
        // Add to the address node's amount
        const addrNode = nodeMap.get(`addr-${utxo.address}`);
        if (addrNode) {
          addrNode.amount += (utxo.amount || 0);
        }
        
        // Create link from transaction to address
        links.push({
          source: txNodeId,
          target: addrNodeId,
          value: utxo.amount || 0,
          isChangeOutput: utxo.tags.includes("Change"),
          riskLevel: utxo.privacyRisk
        });
      }
      
      // Handle sender address
      if (utxo.senderAddress) {
        const senderAddrNodeId = `addr-${utxo.senderAddress}`;
        
        if (!addedAddresses.has(senderAddrNodeId)) {
          addedAddresses.add(senderAddrNodeId);
          const senderAddrNode: GraphNode = {
            id: senderAddrNodeId,
            name: `${utxo.senderAddress.substring(0, 8)}...`,
            amount: 0,
            type: "address",
            data: { address: utxo.senderAddress }
          };
          nodes.push(senderAddrNode);
          nodeMap.set(senderAddrNodeId, senderAddrNode);
        }
        
        // Create link from sender address to transaction
        links.push({
          source: senderAddrNodeId,
          target: txNodeId,
          value: utxo.amount || 0,
          riskLevel: utxo.privacyRisk
        });
      }
    });
  });
  
  // Create transaction-to-transaction links based on change outputs or shared addresses
  const processedLinks = new Set<string>();
  
  txGroups.forEach((sourceUtxos, sourceTxid) => {
    txGroups.forEach((targetUtxos, targetTxid) => {
      if (sourceTxid === targetTxid) return;
      
      const linkKey = `${sourceTxid}-${targetTxid}`;
      const reverseLinkKey = `${targetTxid}-${sourceTxid}`;
      
      // Skip if we've already processed this link
      if (processedLinks.has(linkKey) || processedLinks.has(reverseLinkKey)) return;
      
      // Check for shared addresses
      const sourceAddresses = sourceUtxos.map(u => u.address).filter(Boolean) as string[];
      const targetAddresses = targetUtxos.map(u => u.address).filter(Boolean) as string[];
      const sharedAddresses = sourceAddresses.filter(addr => targetAddresses.includes(addr));
      
      // Check for change output connections
      const changeConnection = sourceUtxos.some(u => 
        u.tags.includes("Change") && targetUtxos.some(t => 
          t.senderAddress === u.address || t.receiverAddress === u.address
        )
      );
      
      if (sharedAddresses.length > 0 || changeConnection) {
        // Find highest risk level among involved UTXOs
        const allUtxos = [...sourceUtxos, ...targetUtxos];
        let highestRisk: "low" | "medium" | "high" = "low";
        
        if (allUtxos.some(u => u.privacyRisk === "high")) {
          highestRisk = "high";
        } else if (allUtxos.some(u => u.privacyRisk === "medium")) {
          highestRisk = "medium";
        }
        
        // Create link between transactions
        links.push({
          source: `tx-${sourceTxid}`,
          target: `tx-${targetTxid}`,
          value: Math.min(
            sourceUtxos.reduce((sum, u) => sum + u.amount, 0),
            targetUtxos.reduce((sum, u) => sum + u.amount, 0)
          ),
          isChangeOutput: changeConnection,
          riskLevel: highestRisk
        });
        
        processedLinks.add(linkKey);
      }
    });
  });
  
  return { nodes, links };
};

/**
 * Tree rectangle for squarified treemap algorithm
 */
interface TreeRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Treemap item with layout positioning
 */
export interface TreemapItem {
  id: string;
  name: string;
  value: number;
  color: string;
  data: UTXO;
  rect: TreeRectangle;
}

/**
 * Implementation of the squarified treemap algorithm for better aspect ratios
 * Based on: "Squarified Treemaps" by Mark Bruls, Kees Huizing, and Jarke J. van Wijk
 */
function squarify(children: { id: string; value: number }[], rect: TreeRectangle): TreeRectangle[] {
  // Base case: no children
  if (children.length === 0) return [];
  
  // Find total value
  const total = children.reduce((sum, child) => sum + child.value, 0);
  if (total === 0) return [];
  
  // Normalize values based on available area
  const area = rect.width * rect.height;
  const normalizedChildren = children.map(child => ({
    ...child,
    normalizedValue: (child.value / total) * area
  }));
  
  // Sort children by value (descending)
  const sortedChildren = [...normalizedChildren].sort((a, b) => b.normalizedValue - a.normalizedValue);
  
  const rects: TreeRectangle[] = [];
  let currentX = rect.x;
  let currentY = rect.y;
  let remainingWidth = rect.width;
  let remainingHeight = rect.height;
  
  let row: typeof sortedChildren = [];
  let rowValue = 0;
  
  for (let i = 0; i < sortedChildren.length; i++) {
    const child = sortedChildren[i];
    
    // Initialize a new row if empty
    if (row.length === 0) {
      row.push(child);
      rowValue = child.normalizedValue;
      continue;
    }
    
    // Determine if adding this child improves the aspect ratio
    const isHorizontal = remainingWidth > remainingHeight;
    const currentRowWidth = isHorizontal ? remainingWidth : rowValue / remainingHeight;
    const currentRowHeight = isHorizontal ? rowValue / remainingWidth : remainingHeight;
    
    // Calculate current aspect ratio
    const currentAspectRatio = Math.max(
      (currentRowWidth / currentRowHeight) * row.length,
      (currentRowHeight / currentRowWidth) * row.length
    );
    
    // Calculate new aspect ratio if we add this child
    const newRowValue = rowValue + child.normalizedValue;
    const newRowWidth = isHorizontal ? remainingWidth : newRowValue / remainingHeight;
    const newRowHeight = isHorizontal ? newRowValue / remainingWidth : remainingHeight;
    
    const newAspectRatio = Math.max(
      (newRowWidth / newRowHeight) * (row.length + 1),
      (newRowHeight / newRowWidth) * (row.length + 1)
    );
    
    // If adding the child worsens the aspect ratio, place the current row
    if (row.length > 0 && newAspectRatio > currentAspectRatio) {
      // Place the current row
      const rowTotal = row.reduce((sum, item) => sum + item.normalizedValue, 0);
      
      if (isHorizontal) {
        const rowHeight = rowTotal / remainingWidth;
        let currentRowX = currentX;
        
        for (const item of row) {
          const itemWidth = (item.normalizedValue / rowTotal) * remainingWidth;
          rects.push({
            x: currentRowX,
            y: currentY,
            width: itemWidth,
            height: rowHeight
          });
          currentRowX += itemWidth;
        }
        
        currentY += rowHeight;
        remainingHeight -= rowHeight;
      } else {
        const rowWidth = rowTotal / remainingHeight;
        let currentRowY = currentY;
        
        for (const item of row) {
          const itemHeight = (item.normalizedValue / rowTotal) * remainingHeight;
          rects.push({
            x: currentX,
            y: currentRowY,
            width: rowWidth,
            height: itemHeight
          });
          currentRowY += itemHeight;
        }
        
        currentX += rowWidth;
        remainingWidth -= rowWidth;
      }
      
      // Start a new row with the current child
      row = [child];
      rowValue = child.normalizedValue;
    } else {
      // Adding the child improves or maintains aspect ratio, so add it
      row.push(child);
      rowValue = newRowValue;
    }
  }
  
  // Place any remaining items in the row
  if (row.length > 0) {
    const rowTotal = row.reduce((sum, item) => sum + item.normalizedValue, 0);
    const isHorizontal = remainingWidth > remainingHeight;
    
    if (isHorizontal) {
      const rowHeight = rowTotal / remainingWidth;
      let currentRowX = currentX;
      
      for (const item of row) {
        const itemWidth = (item.normalizedValue / rowTotal) * remainingWidth;
        rects.push({
          x: currentRowX,
          y: currentY,
          width: itemWidth,
          height: rowHeight
        });
        currentRowX += itemWidth;
      }
    } else {
      const rowWidth = rowTotal / remainingHeight;
      let currentRowY = currentY;
      
      for (const item of row) {
        const itemHeight = (item.normalizedValue / rowTotal) * remainingHeight;
        rects.push({
          x: currentX,
          y: currentRowY,
          width: rowWidth,
          height: itemHeight
        });
        currentRowY += itemHeight;
      }
    }
  }
  
  return rects;
}

/**
 * Creates treemap data for individual UTXOs using squarified algorithm
 */
export const createPrivacyTreemap = (utxos: UTXO[], containerWidth: number, containerHeight: number): TreemapItem[] => {
  // Return empty array if no UTXOs
  if (utxos.length === 0) return [];
  
  // Create base items with values
  const baseItems = utxos.map(utxo => ({
    id: `${utxo.txid}-${utxo.vout}`,
    value: utxo.amount || 0.00000001, // Ensure minimum value to avoid zero-sized rectangles
    data: utxo
  }));
  
  // Calculate total value
  const totalValue = baseItems.reduce((sum, item) => sum + item.value, 0);
  
  // Skip layout if total is zero
  if (totalValue === 0) return [];
  
  // Define container rectangle
  const containerRect: TreeRectangle = {
    x: 0,
    y: 0,
    width: containerWidth,
    height: containerHeight
  };
  
  // Get rectangles using squarified algorithm
  const rectangles = squarify(baseItems, containerRect);
  
  // Map back to original UTXOs with added layout data
  return baseItems.map((item, index) => {
    const utxo = item.data;
    
    return {
      id: item.id,
      name: `${utxo.txid.substring(0, 8)}...${utxo.vout}`,
      value: item.value,
      color: utxo.privacyRisk === 'high' ? '#ea384c' : 
             utxo.privacyRisk === 'medium' ? '#f97316' : '#10b981',
      data: utxo,
      rect: rectangles[index] || { x: 0, y: 0, width: 0, height: 0 }
    };
  });
};

/**
 * Creates treemap data based on grouping option
 */
export const createTreemapData = (utxos: UTXO[], groupingOption: TreemapGroupingOption = "risk") => {
  if (groupingOption === "none") {
    // Individual UTXO tiles with no grouping
    return utxos.map(utxo => ({
      id: `${utxo.txid}-${utxo.vout}`,
      name: `${utxo.txid.substring(0, 8)}...${utxo.vout}`,
      value: utxo.amount || 0,
      color: utxo.privacyRisk === 'high' ? '#ea384c' : 
             utxo.privacyRisk === 'medium' ? '#f97316' : '#10b981',
      data: utxo
    }));
  } 
  else if (groupingOption === "risk") {
    // Group UTXOs by privacy risk
    const riskGroups = {
      low: { 
        name: 'Low Risk', 
        amount: 0, 
        count: 0,
        utxos: [] as UTXO[]
      },
      medium: { 
        name: 'Medium Risk', 
        amount: 0, 
        count: 0,
        utxos: [] as UTXO[]
      },
      high: { 
        name: 'High Risk', 
        amount: 0, 
        count: 0,
        utxos: [] as UTXO[]
      }
    };
    
    // Calculate totals for each risk group
    utxos.forEach(utxo => {
      if (!utxo.privacyRisk) return;
      
      riskGroups[utxo.privacyRisk].amount += (utxo.amount || 0);
      riskGroups[utxo.privacyRisk].count += 1;
      riskGroups[utxo.privacyRisk].utxos.push(utxo);
    });
    
    // Convert to array format for treemap
    return [
      {
        name: 'Low Risk',
        value: riskGroups.low.amount,
        count: riskGroups.low.count,
        color: '#10b981', // green
        utxos: riskGroups.low.utxos
      },
      {
        name: 'Medium Risk',
        value: riskGroups.medium.amount,
        count: riskGroups.medium.count,
        color: '#f97316', // orange
        utxos: riskGroups.medium.utxos
      },
      {
        name: 'High Risk',
        value: riskGroups.high.amount,
        count: riskGroups.high.count,
        color: '#ea384c', // red
        utxos: riskGroups.high.utxos
      }
    ];
  }
  else if (groupingOption === "wallet") {
    // Group UTXOs by wallet
    const walletGroups = new Map<string, {
      name: string;
      amount: number;
      count: number;
      utxos: UTXO[];
      color: string;
    }>();
    
    // Calculate totals for each wallet
    utxos.forEach(utxo => {
      const walletName = utxo.walletName || 'Unknown';
      
      if (!walletGroups.has(walletName)) {
        walletGroups.set(walletName, {
          name: walletName,
          amount: 0,
          count: 0,
          utxos: [],
          // Generate a color based on wallet name hash
          color: `hsl(${Math.abs(walletName.split('').reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0)) % 360}, 70%, 50%)`
        });
      }
      
      const group = walletGroups.get(walletName)!;
      group.amount += (utxo.amount || 0);
      group.count += 1;
      group.utxos.push(utxo);
    });
    
    // Convert to array format for treemap
    return Array.from(walletGroups.values());
  }
  else if (groupingOption === "tag") {
    // Group UTXOs by tags (a UTXO can appear in multiple groups if it has multiple tags)
    const tagGroups = new Map<string, {
      name: string;
      amount: number;
      count: number;
      utxos: UTXO[];
      color: string;
    }>();
    
    // Add "Untagged" group
    tagGroups.set("Untagged", {
      name: "Untagged",
      amount: 0,
      count: 0,
      utxos: [],
      color: "#8E9196" // gray
    });
    
    // Calculate totals for each tag
    utxos.forEach(utxo => {
      if (utxo.tags.length === 0) {
        // Add to untagged group
        const group = tagGroups.get("Untagged")!;
        group.amount += (utxo.amount || 0);
        group.count += 1;
        group.utxos.push(utxo);
      } else {
        // Add to each tag group
        utxo.tags.forEach(tag => {
          if (!tagGroups.has(tag)) {
            tagGroups.set(tag, {
              name: tag,
              amount: 0,
              count: 0,
              utxos: [],
              // Generate a color based on tag hash
              color: `hsl(${Math.abs(tag.split('').reduce((a, b) => {
                a = (a << 5) - a + b.charCodeAt(0);
                return a & a;
              }, 0)) % 360}, 70%, 50%)`
            });
          }
          
          const group = tagGroups.get(tag)!;
          group.amount += (utxo.amount || 0);
          group.count += 1;
          group.utxos.push(utxo);
        });
      }
    });
    
    // Convert to array format for treemap
    return Array.from(tagGroups.values());
  }
  
  // Default case - return individual UTXOs
  return utxos.map(utxo => ({
    id: `${utxo.txid}-${utxo.vout}`,
    name: `${utxo.txid.substring(0, 8)}...${utxo.vout}`,
    value: utxo.amount || 0,
    color: utxo.privacyRisk === 'high' ? '#ea384c' : 
           utxo.privacyRisk === 'medium' ? '#f97316' : '#10b981',
    data: utxo
  }));
};

/**
 * Format BTC amount with appropriate precision and handle undefined/null values
 */
export const safeFormatBTC = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "₿0.00000000";
  }
  return `₿${amount.toFixed(8)}`;
};

/**
 * Filter UTXOs based on filter criteria
 */
export const filterUTXOs = (utxos: UTXO[], filters: Partial<UTXOFiltersState>): UTXO[] => {
  return utxos.filter(utxo => {
    // Search term filter
    if (filters.searchTerm && filters.searchTerm.length > 0) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const matchesSearch = 
        utxo.txid.toLowerCase().includes(searchTerm) ||
        utxo.address.toLowerCase().includes(searchTerm) ||
        (utxo.notes && utxo.notes.toLowerCase().includes(searchTerm)) ||
        utxo.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
      if (!matchesSearch) return false;
    }
    
    // Tag filter
    if (filters.selectedTags && filters.selectedTags.length > 0) {
      if (!filters.selectedTags.some(tag => utxo.tags.includes(tag))) {
        return false;
      }
    }
    
    // Wallet filter
    if (filters.selectedWallets && filters.selectedWallets.length > 0) {
      if (!filters.selectedWallets.includes(utxo.walletName || 'Unknown')) {
        return false;
      }
    }
    
    // Risk level filter
    if (filters.selectedRiskLevels && filters.selectedRiskLevels.length > 0) {
      if (!filters.selectedRiskLevels.includes(utxo.privacyRisk)) {
        return false;
      }
    }
    
    // Amount range filter
    if (filters.minAmount !== undefined && utxo.amount < filters.minAmount) {
      return false;
    }
    
    if (filters.maxAmount !== undefined && utxo.amount > filters.maxAmount) {
      return false;
    }
    
    return true;
  });
};
