import { GraphData, GraphNode, GraphLink, TreemapGroupingOption, UTXOFiltersState, TreemapTile } from "@/types/utxo-graph";
import { UTXO } from "@/types/utxo";
import { getRiskColor as getUtxoRiskColor } from "@/utils/utxo-utils";

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
      },
      // Calculate weight based on transaction size
      weight: Math.sqrt(totalAmount) * 2,
      // Calculate radius proportional to the total amount (with min/max constraints)
      radius: Math.max(30, Math.min(80, 20 + Math.log10(1 + totalAmount) * 20))
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
            data: { address: utxo.address },
            weight: 1, // Fixed weight for addresses
            radius: 20 // Fixed radius for address nodes
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
            data: { address: utxo.senderAddress },
            weight: 1,
            radius: 20
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
 * Implements the squarified treemap algorithm to optimize aspect ratios
 */
export const createMempoolTreemap = (utxos: UTXO[]): TreemapTile[] => {
  // Sort UTXOs by amount (largest first) to optimize the packing
  const sortedUtxos = [...utxos].sort((a, b) => b.amount - a.amount);
  
  // Calculate total amount for proportional sizing
  const totalAmount = sortedUtxos.reduce((sum, utxo) => sum + utxo.amount, 0);
  
  // Create treemap items
  return sortedUtxos.map(utxo => {
    const relativeSize = utxo.amount / totalAmount;
    // Use a logarithmic scale to prevent extremely large UTXOs from dominating
    // while still maintaining proportionality
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
 * Filter UTXOs based on filter criteria with enhanced fuzzy matching
 */
export const filterUTXOs = (utxos: UTXO[], filters: Partial<UTXOFiltersState>): UTXO[] => {
  return utxos.filter(utxo => {
    // Enhanced search term filter with fuzzy matching
    if (filters.searchTerm && filters.searchTerm.length > 0) {
      const searchTerm = filters.searchTerm.toLowerCase();
      
      // Implement fuzzy matching for better search results
      const matchesTxid = utxo.txid.toLowerCase().includes(searchTerm);
      const matchesAddress = utxo.address.toLowerCase().includes(searchTerm);
      const matchesNotes = utxo.notes ? utxo.notes.toLowerCase().includes(searchTerm) : false;
      const matchesTags = utxo.tags.some(tag => {
        // Simple fuzzy match - checks if search term appears in tag
        // or if tag contains all characters from search term in order
        return tag.toLowerCase().includes(searchTerm) || 
               searchTerm.split('').every(char => tag.toLowerCase().includes(char));
      });
        
      if (!(matchesTxid || matchesAddress || matchesNotes || matchesTags)) {
        return false;
      }
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
  // Enhanced force-directed layout simulation
  const iterations = 200; // Increased iterations for better results
  const repulsionForce = 800; // Stronger repulsion for better spacing
  const attractionForce = 0.15;
  const dampingFactor = 0.9;
  const collisionRadius = 10; // Minimum distance between nodes
  
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
    
    // Apply repulsion between all nodes with collision detection
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
        const nodeARadius = nodeA.radius || Math.sqrt(nodeA.amount || 1) * 5;
        const nodeBRadius = nodeB.radius || Math.sqrt(nodeB.amount || 1) * 5;
        const minDistance = nodeARadius + nodeBRadius + collisionRadius;
        
        // Apply repulsion based on node types and sizes
        let force = repulsionForce / distanceSquared;
        
        // Stronger repulsion for same-type nodes to create clusters by type
        if (nodeA.type === nodeB.type) {
          force *= 1.5;
        }
        
        // Extra repulsion when nodes are too close (collision avoidance)
        if (distance < minDistance) {
          force *= 2.5;
        }
        
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
    
    // Apply attraction along links
    links.forEach(link => {
      // Fix: Handle both string and GraphNode types safely
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      
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
      const idealDistance = 120 + Math.log10(1 + linkValue) * 60;
      const force = attractionForce * (distance - idealDistance) * Math.log10(1 + linkValue);
      
      const fx = force * dx / distance;
      const fy = force * dy / distance;
      
      // Update node forces with source/target weight consideration
      const sourceWeight = sourceNode.weight || 1;
      const targetWeight = targetNode.weight || 1;
      const totalWeight = sourceWeight + targetWeight;
      
      const forceSource = forces.get(sourceNode.id)!;
      forceSource.fx += fx * (sourceWeight / totalWeight);
      forceSource.fy += fy * (sourceWeight / totalWeight);
      
      const forceTarget = forces.get(targetNode.id)!;
      forceTarget.fx -= fx * (targetWeight / totalWeight);
      forceTarget.fy -= fy * (targetWeight / totalWeight);
    });
    
    // Apply forces to nodes with damping
    nodes.forEach(node => {
      if (node.x === undefined || node.y === undefined) return;
      
      // Don't move fixed nodes
      if (node.fx !== undefined || node.fy !== undefined) return;
      
      const force = forces.get(node.id)!;
      
      // Apply damping
      force.fx *= dampingFactor;
      force.fy *= dampingFactor;
      
      // Update position (with more movement for later iterations)
      node.x += force.fx * (1 - i/iterations * 0.5); // Gradually reduce movement
      node.y += force.fy * (1 - i/iterations * 0.5);
    });
  }
  
  // Final pass to ensure nodes are within bounds
  const bounds = calculateGraphBounds(nodes);
  const padding = 50;
  
  // Center the graph if it's too spread out
  const centerX = (bounds.maxX + bounds.minX) / 2;
  const centerY = (bounds.maxY + bounds.minY) / 2;
  
  nodes.forEach(node => {
    if (node.x && node.y) {
      // Center the node relative to the graph center
      node.x = (node.x - centerX) * 0.8 + centerX;
      node.y = (node.y - centerY) * 0.8 + centerY;
    }
  });
  
  return { nodes, links };
};

/**
 * Calculate the bounds of the graph for centering
 */
const calculateGraphBounds = (nodes: GraphNode[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  nodes.forEach(node => {
    if (node.x && node.y) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    }
  });
  
  return { minX, minY, maxX, maxY };
};

/**
 * Calculate optimal size for a node based on its amount
 */
export const calculateNodeSize = (node: GraphNode, minSize = 30, maxSize = 100) => {
  // If node has a defined radius, use that
  if (node.radius) return node.radius;
  
  if (!node.amount) return minSize;
  
  // Use logarithmic scale for better distribution
  const size = minSize + Math.log10(1 + node.amount) * 15;
  return Math.min(maxSize, Math.max(minSize, size));
};

/**
 * Get visualization risk color for consistent styling (renamed to avoid conflict)
 */
export const getVisualizationRiskColor = (risk?: "low" | "medium" | "high") => {
  switch (risk) {
    case "high": return "#ea384c"; // Red
    case "medium": return "#f97316"; // Orange
    case "low": return "#10b981"; // Green
    default: return "#8E9196"; // Gray
  }
};
