
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
 * Creates treemap data for Mempool-style layout (proportionally sized tiles)
 */
export const createMempoolTreemap = (utxos: UTXO[]) => {
  // Sort UTXOs by amount (largest first) to optimize the packing
  const sortedUtxos = [...utxos].sort((a, b) => b.amount - a.amount);
  
  // Calculate total amount for proportional sizing
  const totalAmount = sortedUtxos.reduce((sum, utxo) => sum + utxo.amount, 0);
  
  // Create treemap items
  return sortedUtxos.map(utxo => {
    const relativeSize = utxo.amount / totalAmount;
    // Use a log scale to prevent extremely large UTXOs from dominating
    const adjustedSize = Math.max(0.5, Math.log10(1 + relativeSize * 10) * 10);
    
    return {
      id: `${utxo.txid}-${utxo.vout}`,
      name: `${utxo.txid.substring(0, 8)}...${utxo.vout}`,
      value: utxo.amount,
      // Calculate display size as % of total (with min size)
      displaySize: adjustedSize,
      color: utxo.privacyRisk === 'high' ? '#ea384c' : 
             utxo.privacyRisk === 'medium' ? '#f97316' : '#10b981',
      data: utxo
    };
  });
};

/**
 * Creates treemap data for individual UTXOs (not grouped)
 */
export const createPrivacyTreemap = (utxos: UTXO[]) => {
  // Use the new mempool-style layout
  return createMempoolTreemap(utxos);
};

/**
 * Creates treemap data based on grouping option
 */
export const createTreemapData = (utxos: UTXO[], groupingOption: TreemapGroupingOption = "risk") => {
  if (groupingOption === "none") {
    // Individual UTXO tiles with mempool-style layout
    return createMempoolTreemap(utxos);
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
  
  // Default case - return individual UTXOs with new mempool-style layout
  return createMempoolTreemap(utxos);
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

/**
 * Calculate optimal layout positions for graph nodes to minimize overlap
 */
export const optimizeGraphLayout = (nodes: GraphNode[], links: GraphLink[]) => {
  // Simple force-directed layout simulation
  const iterations = 100;
  const repulsionForce = 500;
  const attractionForce = 0.1;
  const dampingFactor = 0.95;
  
  // Initialize node positions if not already set
  nodes.forEach(node => {
    if (node.x === undefined || node.y === undefined) {
      node.x = Math.random() * 1000;
      node.y = Math.random() * 600;
    }
  });
  
  // Create a map for faster node lookup
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));
  
  // Run simulation
  for (let i = 0; i < iterations; i++) {
    // Reset forces
    const forces = new Map<string, { fx: number; fy: number }>();
    nodes.forEach(node => {
      forces.set(node.id, { fx: 0, fy: 0 });
    });
    
    // Apply repulsion between all nodes
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const nodeA = nodes[a];
        const nodeB = nodes[b];
        
        if (nodeA.x === undefined || nodeA.y === undefined || nodeB.x === undefined || nodeB.y === undefined) continue;
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);
        
        // Prevent division by zero
        if (distance < 1) continue;
        
        // Larger nodes should push others away more strongly
        const nodeASize = Math.sqrt(nodeA.amount || 1) * 5;
        const nodeBSize = Math.sqrt(nodeB.amount || 1) * 5;
        const minDistance = nodeASize + nodeBSize + 100;
        
        // Apply repulsion only if nodes are too close
        if (distance < minDistance) {
          const force = repulsionForce / distanceSquared;
          const fx = force * dx / distance;
          const fy = force * dy / distance;
          
          // Update node forces
          const forceA = forces.get(nodeA.id)!;
          forceA.fx -= fx;
          forceA.fy -= fy;
          
          const forceB = forces.get(nodeB.id)!;
          forceB.fx += fx;
          forceB.fy += fy;
        }
      }
    }
    
    // Apply attraction along links
    links.forEach(link => {
      const sourceNode = nodeMap.get(typeof link.source === 'string' ? link.source : link.source.id);
      const targetNode = nodeMap.get(typeof link.target === 'string' ? link.target : link.target.id);
      
      if (!sourceNode || !targetNode || sourceNode.x === undefined || sourceNode.y === undefined || 
          targetNode.x === undefined || targetNode.y === undefined) {
        return;
      }
      
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Prevent division by zero
      if (distance < 1) return;
      
      // Link value influences attraction strength
      const linkValue = link.value || 1;
      const idealDistance = 100 + Math.log10(linkValue || 1) * 50;
      const force = attractionForce * (distance - idealDistance) * Math.log10(1 + linkValue);
      
      const fx = force * dx / distance;
      const fy = force * dy / distance;
      
      // Update node forces
      const forceSource = forces.get(sourceNode.id)!;
      forceSource.fx += fx;
      forceSource.fy += fy;
      
      const forceTarget = forces.get(targetNode.id)!;
      forceTarget.fx -= fx;
      forceTarget.fy -= fy;
    });
    
    // Apply forces to nodes with damping
    nodes.forEach(node => {
      if (node.x === undefined || node.y === undefined) return;
      
      const force = forces.get(node.id)!;
      
      // Apply damping
      force.fx *= dampingFactor;
      force.fy *= dampingFactor;
      
      // Update position
      node.x += force.fx;
      node.y += force.fy;
    });
  }
  
  return { nodes, links };
};

/**
 * Calculate optimal size for a node based on its amount
 */
export const calculateNodeSize = (node: GraphNode, minSize = 30, maxSize = 100) => {
  if (!node.amount) return minSize;
  
  // Use logarithmic scale for better distribution
  const size = minSize + Math.log10(1 + node.amount) * 15;
  return Math.min(maxSize, Math.max(minSize, size));
};
