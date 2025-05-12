
import { GraphData, GraphNode, GraphLink } from "@/types/utxo-graph";
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
 * Creates treemap data from UTXOs
 */
export const createTreemapData = (utxos: UTXO[]) => {
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
