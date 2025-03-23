/**
 * Data Generator Utility
 * 
 * This utility generates mock data for the relationship visualization with the following structure:
 * - Node types: DataPlatform, Source, Downstream
 * - Layout: Three-column layout with specific layer assignments
 * - Node attributes: id, type, label, x, y coordinates, and connection counts
 */

// Helper function to calculate node positions
const calculateNodePositions = (nodes, links) => {
  // Use fixed dimensions for consistent layout regardless of window size
  const width = 3000; // Further increased width for better horizontal spacing
  const height = 2400; // Further increased height for better vertical spacing
  
  // Define column positions (x-coordinates) with more space between columns
  const columnPositions = {
    Source: width * 0.15,
    DataPlatform: width * 0.5,
    Downstream: width * 0.85
  };
  
  // Define layer counts - increased for better distribution of the 300+ nodes
  const layerCounts = {
    Source: 25, // Increased to 25 for better vertical distribution
    DataPlatform: 1, // Keep data platforms in a single row
    Downstream: 25, // Increased to 25 for better vertical distribution
    Mixed: 8 // Increased for mixed nodes
  };
  
  // Define sub-columns for better horizontal distribution
  const subColumnCounts = {
    Source: 6, // Increased to 6 sub-columns for better horizontal distribution
    DataPlatform: 1,
    Downstream: 6, // Increased to 6 sub-columns for better horizontal distribution
    Mixed: 3
  };
  
  // Group nodes by type
  const nodesByType = {
    Source: nodes.filter(n => n.type === 'Source' && !n.isMixed),
    DataPlatform: nodes.filter(n => n.type === 'DataPlatform'),
    Downstream: nodes.filter(n => n.type === 'Downstream' && !n.isMixed),
    Mixed: nodes.filter(n => n.isMixed)
  };
  
  // Calculate connection counts for each node
  const connectionCounts = {};
  links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
    connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
  });
  
  // Position nodes by type and layer
  const positionedNodes = [];
  
  // Position each type of node
  Object.keys(nodesByType).forEach(type => {
    const typeNodes = nodesByType[type];
    const nodeCount = typeNodes.length;
    
    // Skip if no nodes of this type
    if (nodeCount === 0) return;
    
    // Determine which column to use
    let columnPosition = columnPositions[type];
    let layerCount = layerCounts[type];
    let subColumnCount = subColumnCounts[type];
    
    // For mixed nodes, position them between Source and DataPlatform
    if (type === 'Mixed') {
      columnPosition = (columnPositions.Source + columnPositions.DataPlatform) / 2;
    }
    
    // Special handling for DataPlatform nodes - arrange in a single vertical column
    if (type === 'DataPlatform') {
      const dpHeight = height * 0.7; // Use 70% of height for DataPlatform nodes
      const spacing = dpHeight / (nodeCount + 1);
      
      typeNodes.forEach((node, index) => {
        positionedNodes.push({
          ...node,
          x: columnPosition,
          y: (index + 1) * spacing + height * 0.15, // Center vertically with 15% padding top and bottom
          connectionCount: connectionCounts[node.id] || 0
        });
      });
      return; // Skip the regular positioning for DataPlatform nodes
    }
    
    // Calculate vertical spacing for other node types with more room between nodes
    const layerHeight = height / (layerCount + 1);
    const subColumnWidth = width * 0.25 / subColumnCount; // Further increased width of each sub-column
    
    // Position nodes in their respective layers and sub-columns
    typeNodes.forEach((node, index) => {
      // Determine which sub-column this node should be in
      const subColumn = Math.floor(index / Math.ceil(nodeCount / subColumnCount));
      
      // Determine which layer this node should be in within its sub-column
      const nodesPerSubColumn = Math.ceil(nodeCount / subColumnCount);
      // Use layer directly based on index modulo layerCount
      const layer = index % layerCount;
      
      // Calculate position based on layer and sub-column with increased spacing
      const xPosition = columnPosition + (subColumn - Math.floor(subColumnCount / 2)) * subColumnWidth * 1.5;
      
      // Stagger adjacent columns by offsetting even-numbered columns vertically
      // This creates a zigzag pattern where adjacent columns are at different heights
      const columnOffset = subColumn % 2 === 0 ? layerHeight / 2 : 0;
      
      // Also stagger nodes within the same column by slightly offsetting based on node index
      // This creates additional vertical separation between nodes in the same column
      const inColumnOffset = (index % 3) * (layerHeight * 0.1);
      const yPosition = (layer + 1) * layerHeight + columnOffset + inColumnOffset;
      
      // Add minimal controlled randomness to maintain the staggered pattern while avoiding perfect alignment
      const jitterX = Math.random() * 20 - 10;
      const jitterY = Math.random() * 20 - 10;
      
      positionedNodes.push({
        ...node,
        x: xPosition + jitterX,
        y: yPosition + jitterY,
        connectionCount: connectionCounts[node.id] || 0
      });
    });
  });
  
  return positionedNodes;
};

// Generate mock data for the visualization
export const generateMockData = () => {
  // Create data platforms (central nodes) - increased to 4
  const dataPlatforms = [
    { id: 'dp1', type: 'DataPlatform', label: 'Data Warehouse' },
    { id: 'dp2', type: 'DataPlatform', label: 'Data Lake' },
    { id: 'dp3', type: 'DataPlatform', label: 'Stream Processing' },
    { id: 'dp4', type: 'DataPlatform', label: 'Big Data Platform' }
  ];
  
  // Generate 150 source systems
  const sources = [];
  const sourceTypes = [
    'CRM', 'ERP', 'POS', 'Web Analytics', 'Mobile App', 'IoT Devices', 'Social Media', 
    'Email', 'Call Center', 'Survey', 'External API', 'Legacy System', 'Database', 
    'File System', 'Messaging Queue', 'Sensor Data', 'Payment Gateway', 'Third-party Service'
  ];
  
  for (let i = 1; i <= 150; i++) {
    const typeIndex = Math.floor(Math.random() * sourceTypes.length);
    sources.push({
      id: `s${i}`,
      type: 'Source',
      label: `${sourceTypes[typeIndex]} ${i}`
    });
  }
  
  // Generate 150 downstream applications
  const downstreams = [];
  const downstreamTypes = [
    'BI Dashboard', 'Analytics', 'Reporting', 'Marketing Platform', 'Recommendation Engine',
    'Fraud Detection', 'Inventory Management', 'Customer Support', 'Forecasting', 
    'Alerting', 'Monitoring', 'Visualization', 'Machine Learning', 'AI Model', 
    'Decision Support', 'Operational Dashboard', 'Mobile App', 'Web Portal'
  ];
  
  for (let i = 1; i <= 150; i++) {
    const typeIndex = Math.floor(Math.random() * downstreamTypes.length);
    downstreams.push({
      id: `d${i}`,
      type: 'Downstream',
      label: `${downstreamTypes[typeIndex]} ${i}`
    });
  }
  
  // Create mixed nodes (both source and downstream)
  const mixedNodes = [];
  const mixedTypes = ['Database', 'API Gateway', 'Transaction System', 'Integration Service', 'Data Service'];
  
  for (let i = 1; i <= 10; i++) {
    const typeIndex = Math.floor(Math.random() * mixedTypes.length);
    mixedNodes.push({
      id: `m${i}`,
      type: 'Source',
      label: `${mixedTypes[typeIndex]} ${i}`,
      isMixed: true
    });
  }
  
  // Combine all nodes
  const allNodes = [...dataPlatforms, ...sources, ...downstreams, ...mixedNodes];
  
  // Create links between nodes
  const links = [];
  
  // Connect sources to data platforms
  sources.forEach((source, index) => {
    // Distribute sources across data platforms
    const dpIndex = index % dataPlatforms.length;
    links.push({ source: source.id, target: dataPlatforms[dpIndex].id });
    
    // Add some additional connections for complexity
    if (index % 5 === 0) {
      const secondDpIndex = (dpIndex + 1) % dataPlatforms.length;
      links.push({ source: source.id, target: dataPlatforms[secondDpIndex].id });
    }
  });
  
  // Connect data platforms to downstream applications
  downstreams.forEach((downstream, index) => {
    // Distribute downstream applications across data platforms
    const dpIndex = index % dataPlatforms.length;
    links.push({ source: dataPlatforms[dpIndex].id, target: downstream.id });
    
    // Add some additional connections for complexity
    if (index % 7 === 0) {
      const secondDpIndex = (dpIndex + 2) % dataPlatforms.length;
      links.push({ source: dataPlatforms[secondDpIndex].id, target: downstream.id });
    }
  });
  
  // Connect mixed nodes
  mixedNodes.forEach((mixedNode, index) => {
    // Connect as source
    const sourceDpIndex = index % dataPlatforms.length;
    links.push({ source: mixedNode.id, target: dataPlatforms[sourceDpIndex].id });
    
    // Connect as downstream
    const targetDpIndex = (index + 1) % dataPlatforms.length;
    links.push({ source: dataPlatforms[targetDpIndex].id, target: mixedNode.id });
  });
  
  // Connect data platforms to each other
  for (let i = 0; i < dataPlatforms.length; i++) {
    const nextIndex = (i + 1) % dataPlatforms.length;
    links.push({ source: dataPlatforms[i].id, target: dataPlatforms[nextIndex].id });
  }
  
  // Convert string IDs to objects for ECharts
  const formattedLinks = links.map(link => ({
    source: link.source,
    target: link.target
  }));
  
  // Calculate positions for all nodes
  const positionedNodes = calculateNodePositions(allNodes, links);
  
  return {
    nodes: positionedNodes,
    links: formattedLinks
  };
};
