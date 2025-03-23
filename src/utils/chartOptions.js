/**
 * Chart Options Utility
 * 
 * This utility generates the ECharts options for the relationship visualization
 * with a circular layout for data platforms and their related source/downstream nodes.
 */

// Calculate symbol size based on the number of tables
const calculateSymbolSize = (value) => {
  if (value <= 0) return 20;
  return Math.min(100, Math.max(20, Math.log(value) * 8));
};

// Get position on a circle
const getCircularPosition = (index, total, radius, centerX, centerY) => {
  const angle = (index / total) * 2 * Math.PI + Math.PI / total;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
};

// Get position in a sector
const getSectorPosition = (index, total, radius, centerX, centerY, startAngle, endAngle) => {
  const angle = startAngle + (index / Math.max(total, 1)) * (endAngle - startAngle);
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
};

// 我们已经有了 calculateSymbolSize 函数，不需要重复声明

// 新的 Venn Network 布局函数
export const getVennNetworkLayout = (sourceEntityList, downstreamEntityList, colorMap = {}) => {
  if (!sourceEntityList || !downstreamEntityList) {
    return { nodes: [], links: [] };
  }
  
  const nodes = [];
  const links = [];
  const regionNodeMap = new Map();
  const dataplatformSet = new Set();
  const nodeMap = new Map();
  
  const containerWidth = 1600;
  const containerHeight = 900;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const dpRadius = Math.min(containerWidth, containerHeight) / 2.5; // 增大 DataPlatform 环的半径，为更多节点提供空间
  
  // 收集所有数据平台
  sourceEntityList.forEach((row) => {
    const dataPlatform = row?.['data_platform'] || 'Unknown';
    dataplatformSet.add(dataPlatform.toLowerCase());
  });

  downstreamEntityList.forEach((row) => {
    const dataPlatform = row?.['data_platform'] || 'Unknown';
    dataplatformSet.add(dataPlatform.toLowerCase());
  });
  
  // 创建 DataPlatform 节点环，按照平台类型分层
  const dataPlatforms = Array.from(dataplatformSet);
  
  // 对数据平台进行分类排序，使相同类型的平台相邻
  dataPlatforms.sort((a, b) => {
    // 将平台名称转换为类型排序值
    const getTypeValue = (name) => {
      if (name.includes('warehouse')) return 1;
      if (name.includes('lake')) return 2;
      if (name.includes('stream')) return 3;
      if (name.includes('big data')) return 4;
      if (name.includes('mesh')) return 5;
      return 6;
    };
    return getTypeValue(a) - getTypeValue(b);
  });
  
  // 计算每个数据平台的连接数量，用于后续调整位置
  const platformConnectionCounts = {};
  sourceEntityList.forEach(entity => {
    const platform = entity.data_platform.toLowerCase();
    platformConnectionCounts[platform] = (platformConnectionCounts[platform] || 0) + 1;
  });
  downstreamEntityList.forEach(entity => {
    const platform = entity.data_platform.toLowerCase();
    platformConnectionCounts[platform] = (platformConnectionCounts[platform] || 0) + 1;
  });
  
  dataPlatforms.forEach((dataPlatform, index) => {
    // 根据平台类型和连接数量调整半径，使不同类型的平台在不同的环上
    const connectionCount = platformConnectionCounts[dataPlatform] || 0;
    const connectionFactor = Math.min(1.2, Math.max(0.9, 0.9 + (connectionCount / 1000)));
    const platformTypeRadius = dpRadius * connectionFactor * (0.9 + (index % 4) * 0.1); // 微调半径实现分层效果
    
    // 均匀分布平台节点，考虑连接数量调整角度
    const angle = (index / dataPlatforms.length) * 2 * Math.PI;
    const x = centerX + platformTypeRadius * Math.cos(angle);
    const y = centerY + platformTypeRadius * Math.sin(angle);
    
    const regionNode = {
      id: dataPlatform,
      name: dataPlatform,
      x: x,
      y: y,
      symbol: 'circle',
      symbolSize: 120,
      type: 'dataplatform',
      itemStyle: {
        color: colorMap[dataPlatform.toLowerCase()] || '#4285F4',
      },
      label: {
        show: true,
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold',
        formatter: dataPlatform,
      },
    };
    
    nodes.push(regionNode);
    nodeMap.set(dataPlatform, regionNode);
    regionNodeMap.set(dataPlatform, regionNode);
  });
  
  // 为每个 DataPlatform 分配扇区
  const sectorMap = new Map();
  dataPlatforms.forEach((dataPlatform, index) => {
    const startAngle = (index / dataPlatforms.length) * 2 * Math.PI;
    const endAngle = ((index + 1) / dataPlatforms.length) * 2 * Math.PI;
    sectorMap.set(dataPlatform, { startAngle, endAngle });
  });
  
  // 按表数量排序实体列表
  const sortedSourceEntityList = [...sourceEntityList].sort((a, b) => 
    (b.source_table_count || 0) - (a.source_table_count || 0)
  );
  
  const sortedDownstreamEntityList = [...downstreamEntityList].sort((a, b) => 
    (b.share_to_downstream_table_count || 0) - (a.share_to_downstream_table_count || 0)
  );
  
  // 为每个 DataPlatform 分组 Source 和 Downstream 实体
  const sourcesByPlatform = new Map();
  const downstreamsByPlatform = new Map();
  
  dataPlatforms.forEach(dp => {
    sourcesByPlatform.set(dp, []);
    downstreamsByPlatform.set(dp, []);
  });
  
  sortedSourceEntityList.forEach(row => {
    const dataPlatform = row?.['data_platform']?.toLowerCase() || 'Unknown';
    const sources = sourcesByPlatform.get(dataPlatform) || [];
    sources.push(row);
    sourcesByPlatform.set(dataPlatform, sources);
  });
  
  sortedDownstreamEntityList.forEach(row => {
    const dataPlatform = row?.['data_platform']?.toLowerCase() || 'Unknown';
    const downstreams = downstreamsByPlatform.get(dataPlatform) || [];
    downstreams.push(row);
    downstreamsByPlatform.set(dataPlatform, downstreams);
  });
  
  // 创建 Source 节点（放在环内）
  dataPlatforms.forEach(dataPlatform => {
    const sources = sourcesByPlatform.get(dataPlatform) || [];
    const dpNode = regionNodeMap.get(dataPlatform);
    const sector = sectorMap.get(dataPlatform);
    
    if (!dpNode || !sector) return;
    
    // 计算 DataPlatform 到中心的向量
    const dpVectorX = dpNode.x - centerX;
    const dpVectorY = dpNode.y - centerY;
    const dpDistance = Math.sqrt(dpVectorX * dpVectorX + dpVectorY * dpVectorY);
    
    // 为每个 source 分配位置（在环内，靠近对应的 DataPlatform）
    sources.forEach((source, index) => {
      const sourceAppName = source?.['source_application_name'] || 'Unknown';
      const sourceTableCount = source?.['source_table_count'] || 0;
      const uniqueKey = sourceAppName.toLowerCase();
      
      // 如果节点已存在，只更新表数量
      if (nodeMap.has(uniqueKey)) {
        const existingNode = nodeMap.get(uniqueKey);
        existingNode.tables += sourceTableCount;
        return;
      }
      
      // 计算源节点位置（内环）
      // 根据表数量分层，表数量越大，越靠近中心
      const tableCountFactor = Math.min(0.8, Math.max(0.3, sourceTableCount / 300));
      
      // 使用多层环形布局，确保层与层之间有足够的间隔
      // 将每个数据平台的源节点分成8层，并确保层间距离充分
      const totalLayers = 8;
      const layerIndex = index % totalLayers;
      
      // 使用指数分布增加层间距离，外层距离更大
      const layerFactor = 0.25 + (layerIndex / totalLayers) * 0.65; // 0.25 到 0.9 的指数分布
      const innerRadius = dpRadius * tableCountFactor * layerFactor;
      
      // 根据层索引计算每层的节点数量，外层节点数量更多
      const nodesPerLayer = 5 + (layerIndex * 3); // 内层5个节点，每层增加3个
      
      // 计算当前层内的节点索引
      const indexInLayer = Math.floor(index / totalLayers) % nodesPerLayer;
      
      // 根据层内索引计算角度偏移，确保节点均匀分布
      const angleOffset = (indexInLayer / nodesPerLayer) * (sector.endAngle - sector.startAngle);
      
      // 添加小的随机偏移，避免完全对齐
      const randomOffset = (Math.random() - 0.5) * 0.05;
      const angle = sector.startAngle + angleOffset + randomOffset;
      
      // 在内环上的位置
      const x = centerX + innerRadius * Math.cos(angle);
      const y = centerY + innerRadius * Math.sin(angle);
      
      const nodeData = {
        id: uniqueKey,
        name: sourceAppName,
        tables: sourceTableCount,
        type: 'source',
        dataPlatform: dataPlatform,
        isMixed: false,
        x: x,
        y: y,
        symbol: 'circle',
        symbolSize: calculateSymbolSize(sourceTableCount),
        itemStyle: {
          color: colorMap['source'] || '#34A853',
        },
        label: {
          show: true,
          position: 'right',
          formatter: sourceAppName,
          fontSize: 12,
          color: '#333',
          distance: 5,
          overflow: 'truncate',
          width: 100
        }
      };
      
      nodes.push(nodeData);
      nodeMap.set(uniqueKey, nodeData);
      
      // 创建从 source 到 dataplatform 的连接
      // 根据表数量调整连接线的宽度和透明度
      const lineWidth = Math.max(1, Math.min(3, Math.log(sourceTableCount + 1) / 2));
      const opacity = Math.max(0.2, Math.min(0.5, 0.3 + (sourceTableCount / 200)));
      
      links.push({
        source: uniqueKey,
        target: dataPlatform,
        value: sourceTableCount,
        lineStyle: {
          color: colorMap['source'] || '#34A853',
          width: lineWidth,
          type: 'solid',
          opacity: opacity,
          curveness: 0.2 + (Math.random() * 0.1), // 添加微小的随机性以减少重叠
        },
      });
    });
  });
  
  // 创建 Downstream 节点（放在环外）
  dataPlatforms.forEach(dataPlatform => {
    const downstreams = downstreamsByPlatform.get(dataPlatform) || [];
    const dpNode = regionNodeMap.get(dataPlatform);
    const sector = sectorMap.get(dataPlatform);
    
    if (!dpNode || !sector) return;
    
    // 为每个 downstream 分配位置（在环外，靠近对应的 DataPlatform）
    downstreams.forEach((downstream, index) => {
      const downstreamAppName = downstream?.['downstream_application_name'] || 'Unknown';
      const downstreamTableCount = downstream?.['share_to_downstream_table_count'] || 0;
      const uniqueKey = downstreamAppName.toLowerCase();
      
      // 如果节点已存在，更新表数量和检查是否为混合类型
      if (nodeMap.has(uniqueKey)) {
        const existingNode = nodeMap.get(uniqueKey);
        existingNode.tables += downstreamTableCount;
        
        // 如果已经是 source 节点，标记为混合类型
        if (existingNode.type === 'source') {
          existingNode.type = 'mixed';
          existingNode.isMixed = true;
          existingNode.itemStyle = {
            ...existingNode.itemStyle,
            color: colorMap['mixed'] || '#AA46BC',
          };
        }
        return;
      }
      
      // 计算下游节点位置（外环）
      // 根据表数量分层，表数量越大，越远离中心
      const tableCountFactor = Math.min(2.2, Math.max(1.2, 1.2 + (downstreamTableCount / 200)));
      
      // 使用多层环形布局，确保层与层之间有足够的间隔
      // 将每个数据平台的下游节点分成9层，并确保层间距离充分
      const dsLayerCount = 9;
      const dsLayerIndex = index % dsLayerCount;
      
      // 使用指数分布增加层间距离，外层距离更大
      const dsLayerFactor = 1.2 + (dsLayerIndex / dsLayerCount) * 1.0; // 1.2 到 2.2 的指数分布
      const outerRadius = dpRadius * tableCountFactor * (dsLayerFactor / 2.2); // 归一化因子
      
      // 根据层索引计算每层的节点数量，外层节点数量更多
      const dsNodesPerLayer = 7 + (dsLayerIndex * 4); // 内层7个节点，每层增加4个
      
      // 计算当前层内的节点索引
      const dsIndexInLayer = Math.floor(index / dsLayerCount) % dsNodesPerLayer;
      
      // 根据层内索引计算角度偏移，确保节点均匀分布
      const dsAngleOffset = (dsIndexInLayer / dsNodesPerLayer) * (sector.endAngle - sector.startAngle);
      
      // 添加小的随机偏移，避免完全对齐
      const dsRandomOffset = (Math.random() - 0.5) * 0.05;
      const angle = sector.startAngle + dsAngleOffset + dsRandomOffset;
      
      // 在外环上的位置
      const x = centerX + outerRadius * Math.cos(angle);
      const y = centerY + outerRadius * Math.sin(angle);
      
      const nodeData = {
        id: uniqueKey,
        name: downstreamAppName,
        tables: downstreamTableCount,
        type: 'downstream',
        dataPlatform: dataPlatform,
        isMixed: false,
        x: x,
        y: y,
        symbol: 'circle',
        symbolSize: calculateSymbolSize(downstreamTableCount),
        itemStyle: {
          color: colorMap['downstream'] || '#EA4335',
        },
        label: {
          show: true,
          position: 'right',
          formatter: downstreamAppName,
          fontSize: 12,
          color: '#333',
          distance: 5,
          overflow: 'truncate',
          width: 100
        }
      };
      
      nodes.push(nodeData);
      nodeMap.set(uniqueKey, nodeData);
      
      // 创建从 dataplatform 到 downstream 的连接
      // 根据表数量调整连接线的宽度和透明度
      const lineWidth = Math.max(1, Math.min(3, Math.log(downstreamTableCount + 1) / 2));
      const opacity = Math.max(0.2, Math.min(0.5, 0.3 + (downstreamTableCount / 200)));
      
      links.push({
        source: dataPlatform,
        target: uniqueKey,
        value: downstreamTableCount,
        lineStyle: {
          color: colorMap['downstream'] || '#EA4335',
          width: lineWidth,
          type: 'solid',
          opacity: opacity,
          curveness: 0.2 + (Math.random() * 0.1), // 添加微小的随机性以减少重叠
        },
      });
    });
  });
  
  // 添加 DataPlatform 之间的连接，优化显示效果
  const dataPlatformConnections = new Map();
  
  // 检查通过 source 连接的数据平台
  sourceEntityList.forEach(entity => {
    const dataPlatform = entity.data_platform.toLowerCase();
    const sourceAppName = entity.source_application_name;
    
    // 查找该 source 是否连接到不同数据平台的 downstream
    downstreamEntityList.forEach(dsEntity => {
      const dsAppName = dsEntity.downstream_application_name;
      const dsPlatform = dsEntity.data_platform.toLowerCase();
      
      // 如果 source 和 downstream 相连且有不同平台，创建平台间连接
      if (sourceAppName === dsAppName && dataPlatform !== dsPlatform) {
        const connectionKey = [dataPlatform, dsPlatform].sort().join('-');
        if (!dataPlatformConnections.has(connectionKey)) {
          dataPlatformConnections.set(connectionKey, {
            source: dataPlatform,
            target: dsPlatform,
            value: 1
          });
        } else {
          const connection = dataPlatformConnections.get(connectionKey);
          connection.value += 1;
        }
      }
    });
  });
  
  // 只添加重要的数据平台间连接，减少视觉混乱
  dataPlatformConnections.forEach((connection, key) => {
    // 只显示连接数量超过阈值的连接
    if (connection.value > 3) {
      const width = Math.min(4, Math.max(1, Math.log(connection.value) / 2));
      const opacity = Math.min(0.6, 0.3 + (connection.value / 100));
      
      links.push({
        source: connection.source,
        target: connection.target,
        value: connection.value,
        lineStyle: {
          color: '#9370DB', // 使用中紫色表示平台间连接
          width: width,
          type: 'dashed',
          opacity: opacity,
          curveness: 0.3 + (Math.random() * 0.1), // 增加曲率变化，使连接线更易区分
        },
        tooltip: {
          formatter: `${connection.value} shared connections`
        }
      });
    }
  });
  
  return { nodes, links };
};

// Generate the main graph data
export const getMainGraphData = (sourceEntityList, downstreamEntityList, colorMap = {}) => {
  if (!sourceEntityList || !downstreamEntityList) {
    return { nodes: [], links: [] };
  }
  
  const nodes = [];
  const links = [];
  const regionNodeMap = new Map();
  const dataplatformSet = new Set();
  const nodeMap = new Map();
  
  const containerWidth = 1600;
  const containerHeight = 900;
  const margin = 40;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const radius = Math.min(containerWidth, containerHeight) / 2 - margin * 6;

  // Collect all data platforms
  sourceEntityList.forEach((row) => {
    const dataPlatform = row?.["data_platform"] || "Unknown";
    dataplatformSet.add(dataPlatform.toLowerCase());
  });

  downstreamEntityList.forEach((row) => {
    const dataPlatform = row?.["data_platform"] || "Unknown";
    dataplatformSet.add(dataPlatform.toLowerCase());
  });

  // Sort entities by table count
  const sortedSourceEntityList = [...sourceEntityList].sort((a, b) => 
    (b.source_table_count || 0) - (a.source_table_count || 0)
  );
  
  const sortedDownstreamEntityList = [...downstreamEntityList].sort((a, b) => 
    (b.share_to_downstream_table_count || 0) - (a.share_to_downstream_table_count || 0)
  );

  // Create data platform nodes
  Array.from(dataplatformSet).forEach((dataPlatform, index) => {
    const pos = getCircularPosition(index, dataplatformSet.size, radius * 0.6, centerX, centerY);
    const regionNode = {
      id: dataPlatform,
      name: dataPlatform,
      x: pos.x,
      y: pos.y,
      symbol: "circle",
      symbolSize: 120, // Increased size for DataPlatform nodes
      type: "dataplatform", // Add type for identification
      itemStyle: {
        color: colorMap[dataPlatform.toLowerCase()] || "#4285F4",
      },
      label: {
        show: true,
        fontSize: 20,
        color: "#fff",
        fontWeight: "bold",
        formatter: dataPlatform,
      },
    };
    
    if (!nodeMap.has(dataPlatform)) {
      nodes.push(regionNode);
      nodeMap.set(dataPlatform, regionNode);
    }
    regionNodeMap.set(dataPlatform, regionNode);
  });

  // Create source nodes and links
  sortedSourceEntityList.forEach((row, index) => {
    const sourceAppName = row?.["source_application_name"] || "Unknown";
    const sourceTableCount = row?.["source_table_count"] || 0;
    const dataPlatform = row?.["data_platform"]?.toLowerCase() || "Unknown";
    
    const uniqueKey = sourceAppName.toLowerCase();

    const nodeData = {
      id: uniqueKey,
      name: sourceAppName,
      tables: sourceTableCount,
      type: "source",
      dataPlatform: dataPlatform,
      isMixed: false, // Will be set to true if it's also a downstream
    };

    if (nodeMap.has(uniqueKey)) {
      const existingNode = nodeMap.get(uniqueKey);
      existingNode.tables += sourceTableCount;
    } else {
      const regionNode = regionNodeMap.get(dataPlatform);
      if (regionNode) {
        const angle = Math.atan2(regionNode.y - centerY, regionNode.x - centerX);
        const startAngle = angle - Math.PI / 6;
        const endAngle = angle + Math.PI / 6;
        const sourceLayerRadii = [
          radius * 0.3,
          radius * 0.5,
          radius * 0.7,
        ];
        const layerIndex = index % 3;
        const sourceRadius = sourceLayerRadii[layerIndex];
        const pos = getSectorPosition(
          index, 
          sortedSourceEntityList.length, 
          sourceRadius, 
          centerX, 
          centerY, 
          startAngle, 
          endAngle
        );
        
        nodeData.x = pos.x;
        nodeData.y = pos.y;
        nodeData.symbol = "circle";
        nodeData.symbolSize = calculateSymbolSize(nodeData.tables);
        nodeData.itemStyle = {
          color: colorMap[dataPlatform] || "#91cc75",
        };
        nodeData.label = {
          show: true,
          position: "right",
          formatter: sourceAppName,
          fontSize: 14,
          color: "#333",
          distance: 5,
          overflow: "truncate",
          width: 120
        };
        
        nodes.push(nodeData);
        nodeMap.set(uniqueKey, nodeData);
      }
    }

    // Create link from source to data platform
    links.push({
      source: uniqueKey,
      target: dataPlatform,
      value: sourceTableCount || 0,
      lineStyle: {
        color: colorMap[dataPlatform] || "#91cc75",
        width: Math.max(1, Math.min(5, Math.log(sourceTableCount + 1))),
        type: "solid",
        opacity: 0.5,
        curveness: 0.2,
      },
    });
  });

  // Create downstream nodes and links
  sortedDownstreamEntityList.forEach((row, index) => {
    const downstreamAppName = row?.["downstream_application_name"] || "Unknown";
    const downstreamTableCount = row?.["share_to_downstream_table_count"] || 0;
    const dataPlatform = row?.["data_platform"]?.toLowerCase() || "Unknown";
    
    const uniqueKey = downstreamAppName.toLowerCase();
    
    const nodeData = {
      id: uniqueKey,
      name: downstreamAppName,
      tables: downstreamTableCount,
      type: "downstream",
      dataPlatform: dataPlatform,
      isMixed: false, // Will be set to true if it's also a source
    };

    if (nodeMap.has(uniqueKey)) {
      const existingNode = nodeMap.get(uniqueKey);
      existingNode.tables += downstreamTableCount;
      
      // If this node already exists as a source, mark it as mixed
      if (existingNode.type === "source") {
        existingNode.type = "mixed";
        existingNode.isMixed = true;
        existingNode.itemStyle = {
          ...existingNode.itemStyle,
          color: "#AA46BC", // Purple for mixed nodes
        };
      }
    } else {
      const regionNode = regionNodeMap.get(dataPlatform);
      if (regionNode) {
        const angle = Math.atan2(regionNode.y - centerY, regionNode.x - centerX);
        const startAngle = angle - Math.PI / 6;
        const endAngle = angle + Math.PI / 6;
        const downstreamLayerRadii = [
          radius * 0.3,
          radius * 0.5,
          radius * 0.7,
          radius * 0.9,
          radius * 1.1,
        ];
        const layerIndex = index % 5;
        const downstreamRadius = downstreamLayerRadii[layerIndex];
        const pos = getSectorPosition(
          index, 
          sortedDownstreamEntityList.length, 
          downstreamRadius, 
          centerX, 
          centerY, 
          startAngle, 
          endAngle
        );
        
        nodeData.x = pos.x;
        nodeData.y = pos.y;
        nodeData.symbol = "circle";
        nodeData.symbolSize = calculateSymbolSize(nodeData.tables);
        nodeData.itemStyle = {
          color: colorMap[dataPlatform] || "#ee6666",
        };
        nodeData.label = {
          show: true,
          position: "right",
          formatter: downstreamAppName,
          fontSize: 14,
          color: "#333",
          distance: 5,
          overflow: "truncate",
          width: 120
        };
        
        nodes.push(nodeData);
        nodeMap.set(uniqueKey, nodeData);
      }
    }

    // Create link from data platform to downstream
    links.push({
      source: dataPlatform,
      target: uniqueKey,
      value: downstreamTableCount || 0,
      lineStyle: {
        color: colorMap[dataPlatform] || "#ee6666",
        width: Math.max(1, Math.min(5, Math.log(downstreamTableCount + 1))),
        type: "solid",
        opacity: 0.5,
        curveness: 0.2,
      },
    });
  });

  // Add connections between data platforms
  // This creates links between data platforms that share common sources or downstream applications
  const dataPlatformConnections = new Map();
  
  // Check for connections through sources
  sortedSourceEntityList.forEach(row => {
    const dataPlatform = row?.["data_platform"]?.toLowerCase() || "Unknown";
    const sourceAppName = row?.["source_application_name"] || "Unknown";
    
    // Find if this source connects to any downstream with a different data platform
    sortedDownstreamEntityList.forEach(dsRow => {
      const dsAppName = dsRow?.["downstream_application_name"] || "Unknown";
      const dsPlatform = dsRow?.["data_platform"]?.toLowerCase() || "Unknown";
      
      // If source and downstream are connected and have different platforms, create a platform-to-platform link
      if (sourceAppName === dsAppName && dataPlatform !== dsPlatform) {
        const connectionKey = [dataPlatform, dsPlatform].sort().join('-');
        if (!dataPlatformConnections.has(connectionKey)) {
          dataPlatformConnections.set(connectionKey, {
            source: dataPlatform,
            target: dsPlatform,
            value: 1,
            lineStyle: {
              color: '#999',
              width: 2,
              type: 'dashed',
              opacity: 0.5,
              curveness: 0.3,
            },
          });
        } else {
          const connection = dataPlatformConnections.get(connectionKey);
          connection.value += 1;
          connection.lineStyle.width = Math.min(5, 1 + connection.value / 5);
        }
      }
    });
  });
  
  // Add the data platform connections to links
  dataPlatformConnections.forEach(connection => {
    links.push(connection);
  });
  
  return { nodes, links };
};

// Generate chart options
export const getChartOptions = (data, hoveredNode = null) => {
  if (!data || !data.nodes || !data.links) {
    return {};
  }

  try {
    // Process nodes with hover effects
    const processedNodes = data.nodes.map(node => ({
      ...node,
      itemStyle: {
        ...node.itemStyle,
        borderWidth: hoveredNode === node.id ? 3 : 1,
        borderColor: hoveredNode === node.id ? '#FFD700' : 'rgba(255, 255, 255, 0.5)',
        opacity: hoveredNode ? (
          hoveredNode === node.id || 
          data.links.some(link => {
            try {
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              return ((sourceId === hoveredNode) && (targetId === node.id)) || 
                     ((targetId === hoveredNode) && (sourceId === node.id));
            } catch (error) {
              console.error('Error in node opacity calculation:', error);
              return false;
            }
          }) ? 1 : 0.3
        ) : 1
      }
    }));

    // Process links with hover effects
    const processedLinks = data.links.map(link => {
      try {
        const sourceId = typeof link.source === 'object' ? (link.source ? link.source.id : null) : link.source;
        const targetId = typeof link.target === 'object' ? (link.target ? link.target.id : null) : link.target;
        
        return {
          ...link,
          lineStyle: {
            ...link.lineStyle,
            opacity: hoveredNode ? (
              ((sourceId === hoveredNode) || (targetId === hoveredNode)) ? 0.8 : 0.1
            ) : link.lineStyle.opacity || 0.5,
            width: hoveredNode ? (
              ((sourceId === hoveredNode) || (targetId === hoveredNode)) ? 
                link.lineStyle.width * 1.5 : link.lineStyle.width
            ) : link.lineStyle.width
          }
        };
      } catch (error) {
        console.error('Error in link styling:', error, link);
        return link;
      }
    });

    // Return chart options
    return {
      tooltip: {
        trigger: 'item',
        enterable: false, // 防止鼠标进入tooltip导致事件冲突
        confine: true, // 确保tooltip不会超出容器边界
        appendToBody: true, // 将tooltip添加到body，避免层级问题
        formatter: (params) => {
          try {
            // 增加更多的安全检查
            if (!params) return '';
            if (!params.data) return '';
            if (params.componentType !== 'series') return '';
            if (params.seriesType !== 'graph') return '';
            
            const data = params.data;
            
            // 处理节点类型的tooltip
            if (params.dataType === 'node') {
              if (!data.type) {
                return `<div><strong>${data.name || 'Unknown'}</strong></div>`;
              }
              
              switch (data.type) {
                case 'source':
                  return `
                    <div>
                      <strong>${data.name || 'Unknown'}</strong><br/>
                      Type: Source<br/>
                      Data Platform: ${data.dataPlatform || 'Unknown'}<br/>
                      Tables: ${data.tables || 0}
                    </div>
                  `;
                  
                case 'downstream':
                  return `
                    <div>
                      <strong>${data.name || 'Unknown'}</strong><br/>
                      Type: Downstream<br/>
                      Data Platform: ${data.dataPlatform || 'Unknown'}<br/>
                      Tables: ${data.tables || 0}
                    </div>
                  `;
                  
                case 'mixed':
                  return `
                    <div>
                      <strong>${data.name || 'Unknown'}</strong><br/>
                      Type: Source & Downstream<br/>
                      Data Platform: ${data.dataPlatform || 'Unknown'}<br/>
                      Tables: ${data.tables || 0}
                    </div>
                  `;
                  
                case 'dataplatform':
                  return `
                    <div>
                      <strong>${data.name || 'Unknown'}</strong><br/>
                      Type: Data Platform<br/>
                      Tables: ${data.tables || 0}
                    </div>
                  `;
                  
                default:
                  return `
                    <div>
                      <strong>${data.name || 'Unknown'}</strong><br/>
                      Type: ${data.type || 'Unknown'}
                    </div>
                  `;
              }
            }
            
            // 处理边的tooltip
            if (params.dataType === 'edge') {
              return `
                <div>
                  <strong>Connection</strong><br/>
                  Tables: ${data.value || 0}
                </div>
              `;
            }
            
            return '';
          } catch (error) {
            console.error('Error in tooltip formatter:', error);
            return '';
          }
        }
      },
      animation: true,
      animationDuration: 1000,
      animationEasingUpdate: 'quinticInOut',
      series: [{
        type: 'graph',
        layout: 'none', // Use custom layout
        data: processedNodes,
        links: processedLinks,
        roam: true,
        zoom: 0.8,
        scaleLimit: { min: 0.3, max: 5 },
        draggable: true,
        focusNodeAdjacency: false, // Disable built-in adjacency highlighting
        force: {
          repulsion: 100,
          edgeLength: 50,
          gravity: 0.1,
          layoutAnimation: false
        },
        lineStyle: {
          curveness: 0.2,
          opacity: 0.5
        },
        // Performance optimizations
        progressive: 500,
        progressiveThreshold: 1000,
        large: true,
        largeThreshold: 300,
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 2,
            opacity: 0.8
          }
        },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 6
      }]
    };
  } catch (error) {
    console.error('Error generating chart options:', error);
    return {};
  }
};

// Default color map for different data platforms
export const defaultColorMap = {
  'data warehouse': '#5470c6',
  'data lake': '#91cc75',
  'stream processing': '#fac858',
  'big data platform': '#ee6666',
  'unknown': '#73c0de',
  // Node type colors
  'source': '#34A853',      // Green
  'downstream': '#EA4335',  // Red
  'mixed': '#AA46BC',       // Purple
  'dataplatform': '#4285F4' // Blue
};
