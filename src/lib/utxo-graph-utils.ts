
import { GraphNode, GraphLink } from "@/types/utxo-graph";
import { UTXO } from "@/types/utxo";
import { getRiskColor } from "@/utils/utxo-utils";

// Create graph data from UTXOs
export const createGraphData = (
  utxos: UTXO[],
  highlightPrivacyIssues: boolean = false
) => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const addedTxs = new Set<string>();
  
  // First pass - add UTXO nodes
  utxos.forEach(utxo => {
    const nodeId = `utxo-${utxo.txid}-${utxo.vout}`;
    const walletName = utxo.walletName || "Default Wallet";
    
    // Assign color based on risk level
    const color = getRiskColor(utxo.privacyRisk);
    
    const node: GraphNode = {
      id: nodeId,
      name: `UTXO ${utxo.txid.substring(0, 6)}...${utxo.vout}`,
      val: 1 + (utxo.amount * 5), // Size based on amount
      color: color,
      type: "utxo",
      data: utxo,
      group: walletName,
      riskLevel: utxo.privacyRisk
    };
    
    nodes.push(node);
    nodeMap.set(nodeId, node);
    
    // Add transaction node if not already added
    if (!addedTxs.has(utxo.txid)) {
      addedTxs.add(utxo.txid);
      const txNodeId = `tx-${utxo.txid}`;
      const txNode: GraphNode = {
        id: txNodeId,
        name: `TX ${utxo.txid.substring(0, 8)}...`,
        val: 1.5, // slightly larger
        color: "#8E9196", // neutral gray
        type: "transaction",
        data: { txid: utxo.txid }
      };
      nodes.push(txNode);
      nodeMap.set(txNodeId, txNode);
    }
    
    // Add addresses as nodes
    if (utxo.receiverAddress) {
      const addrNodeId = `addr-${utxo.receiverAddress}`;
      if (!nodeMap.has(addrNodeId)) {
        const addrNode: GraphNode = {
          id: addrNodeId,
          name: `${utxo.receiverAddress.substring(0, 8)}...`,
          val: 0.8, // smaller
          color: "#E5DEFF", // soft purple
          type: "address",
          data: { address: utxo.receiverAddress }
        };
        nodes.push(addrNode);
        nodeMap.set(addrNodeId, addrNode);
      }
    }
    
    if (utxo.senderAddress) {
      const addrNodeId = `addr-${utxo.senderAddress}`;
      if (!nodeMap.has(addrNodeId)) {
        const addrNode: GraphNode = {
          id: addrNodeId,
          name: `${utxo.senderAddress.substring(0, 8)}...`,
          val: 0.8, // smaller
          color: "#E5DEFF", // soft purple
          type: "address",
          data: { address: utxo.senderAddress }
        };
        nodes.push(addrNode);
        nodeMap.set(addrNodeId, addrNode);
      }
    }
    
    // Connect UTXO to transaction
    const txNodeId = `tx-${utxo.txid}`;
    links.push({
      source: txNodeId,
      target: nodeId,
      value: 1,
      riskLevel: utxo.privacyRisk
    });
    
    // Connect addresses to UTXO
    if (utxo.receiverAddress) {
      const addrNodeId = `addr-${utxo.receiverAddress}`;
      links.push({
        source: nodeId,
        target: addrNodeId,
        value: 1,
        isChangeOutput: utxo.tags.includes("Change"),
        riskLevel: utxo.privacyRisk
      });
    }
    
    if (utxo.senderAddress) {
      const addrNodeId = `addr-${utxo.senderAddress}`;
      links.push({
        source: addrNodeId,
        target: txNodeId,
        value: 1,
        riskLevel: utxo.privacyRisk
      });
    }
  });
  
  // Create simulated links between related UTXOs to show traceable paths
  const processedUtxos = new Set<string>();
  
  utxos.forEach(utxo1 => {
    const utxo1Id = `${utxo1.txid}-${utxo1.vout}`;
    processedUtxos.add(utxo1Id);
    
    utxos.forEach(utxo2 => {
      const utxo2Id = `${utxo2.txid}-${utxo2.vout}`;
      if (processedUtxos.has(utxo2Id)) return; // Skip already processed pairs
      
      // Create links based on shared addresses, shared tags, or other privacy connections
      if (
        utxo1.senderAddress === utxo2.receiverAddress || 
        utxo1.receiverAddress === utxo2.senderAddress ||
        utxo1.address === utxo2.address ||
        (utxo1.senderAddress && utxo1.senderAddress === utxo2.senderAddress) ||
        (utxo1.receiverAddress && utxo1.receiverAddress === utxo2.receiverAddress)
      ) {
        // Address reuse privacy issue
        const highestRisk = utxo1.privacyRisk === "high" || utxo2.privacyRisk === "high" 
          ? "high" 
          : (utxo1.privacyRisk === "medium" || utxo2.privacyRisk === "medium" ? "medium" : "low");
          
        // Only add these links when highlighting privacy issues
        if (highlightPrivacyIssues) {
          links.push({
            source: `tx-${utxo1.txid}`,
            target: `tx-${utxo2.txid}`,
            value: 0.5, // thinner line
            color: "#ea384c", // privacy risk color
            riskLevel: highestRisk
          });
        }
      }
      
      // Check for shared tags
      const sharedTags = utxo1.tags.filter(tag => utxo2.tags.includes(tag));
      if (sharedTags.length > 0) {
        // Tag correlation privacy issue
        // Only add these links when highlighting privacy issues
        if (highlightPrivacyIssues) {
          links.push({
            source: `utxo-${utxo1.txid}-${utxo1.vout}`,
            target: `utxo-${utxo2.txid}-${utxo2.vout}`,
            value: 0.3, // very thin line
            color: "#f97316", // medium risk color
            riskLevel: "medium"
          });
        }
      }
    });
  });
  
  // Colorize links based on privacy risk level
  links.forEach(link => {
    if (link.isChangeOutput) {
      link.color = "#9b87f5"; // purple for change outputs
    } else if (link.riskLevel) {
      switch (link.riskLevel) {
        case "high": link.color = highlightPrivacyIssues ? "#ea384c" : "#ea384c80"; break;
        case "medium": link.color = highlightPrivacyIssues ? "#f97316" : "#f9731680"; break;
        case "low": link.color = "#10b981"; break;
        default: link.color = "#8E9196"; // neutral gray
      }
    }
  });
  
  return { nodes, links };
};

// Node tooltip content rendering
export const renderNodeTooltip = (node: GraphNode) => {
  if (node.type === "utxo" && node.data) {
    const utxo = node.data as UTXO;
    return {
      title: `UTXO ${utxo.txid.substring(0, 8)}...${utxo.vout}`,
      content: [
        { label: "Amount", value: utxo.amount.toString() },
        { label: "Wallet", value: utxo.walletName || "Default" },
        { label: "Risk", value: utxo.privacyRisk },
        { label: "Tags", value: utxo.tags.join(", ") || "None" }
      ]
    };
  } else if (node.type === "transaction") {
    return {
      title: "Transaction",
      content: [
        { label: "TXID", value: node.data.txid },
        { label: "Click to open in mempool.space", value: "" }
      ]
    };
  } else if (node.type === "address") {
    return {
      title: "Address",
      content: [
        { label: "Address", value: node.data.address },
        { label: "Click to open in mempool.space", value: "" }
      ]
    };
  }
  return null;
};

// Custom node rendering function
export const nodeCanvasObject = (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
  if (!node.x || !node.y) return; // Skip if position is not defined
  
  const label = node.name;
  const fontSize = 12/globalScale;
  const nodeSize = node.val;
  
  // Draw node circle
  ctx.beginPath();
  ctx.fillStyle = node.color;
  ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
  ctx.fill();
  
  // Draw node label if close enough
  if (globalScale > 0.4) {
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(label, node.x, node.y);
    
    // Add badge for UTXO type
    if (node.type === "utxo" && node.data?.tags?.includes("Change") && globalScale > 0.8) {
      const badgeText = "Change";
      const badgeWidth = ctx.measureText(badgeText).width + 4/globalScale;
      
      ctx.fillStyle = '#9b87f5';
      ctx.beginPath();
      ctx.roundRect(
        node.x - badgeWidth/2, 
        node.y + nodeSize + 2/globalScale, 
        badgeWidth, 
        fontSize, 
        3/globalScale
      );
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.fillText(
        badgeText, 
        node.x, 
        node.y + nodeSize + 2/globalScale + fontSize/2
      );
    }
  }
};
