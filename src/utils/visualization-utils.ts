
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
  
  // Process UTXOs to build graph structure
  utxos.forEach(utxo => {
    // Add UTXO node if not already added
    const utxoNodeId = `utxo-${utxo.txid}-${utxo.vout}`;
    if (!nodeMap.has(utxoNodeId)) {
      const utxoNode: GraphNode = {
        id: utxoNodeId,
        name: `UTXO ${utxo.txid.substring(0, 6)}...${utxo.vout}`,
        amount: utxo.amount || 0,
        type: "utxo",
        data: utxo,
        riskLevel: utxo.privacyRisk
      };
      nodes.push(utxoNode);
      nodeMap.set(utxoNodeId, utxoNode);
    }
    
    // Add transaction node if not already added
    const txNodeId = `tx-${utxo.txid}`;
    if (!addedTxs.has(utxo.txid)) {
      addedTxs.add(utxo.txid);
      // Calculate the transaction amount (sum of all UTXOs with this txid)
      const txAmount = utxos
        .filter(u => u.txid === utxo.txid)
        .reduce((sum, u) => sum + (u.amount || 0), 0);
        
      const txNode: GraphNode = {
        id: txNodeId,
        name: `TX ${utxo.txid.substring(0, 8)}...`,
        amount: txAmount,
        type: "transaction",
        data: { txid: utxo.txid }
      };
      nodes.push(txNode);
      nodeMap.set(txNodeId, txNode);
    }
    
    // Add address nodes
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
    }
    
    // Create links
    // UTXO from transaction
    links.push({
      source: txNodeId,
      target: utxoNodeId,
      value: utxo.amount || 0,
      riskLevel: utxo.privacyRisk
    });
    
    // Address to UTXO (address owns the UTXO)
    if (utxo.address) {
      links.push({
        source: utxoNodeId,
        target: `addr-${utxo.address}`,
        value: utxo.amount || 0,
        isChangeOutput: utxo.tags.includes("Change"),
        riskLevel: utxo.privacyRisk
      });
    }
    
    // Sender address to transaction
    if (utxo.senderAddress) {
      const senderAddrNodeId = `addr-${utxo.senderAddress}`;
      
      // Add sender address node if not already added
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
  
  return { nodes, links };
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
