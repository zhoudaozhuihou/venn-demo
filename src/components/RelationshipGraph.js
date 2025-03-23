import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { makeStyles } from '@material-ui/core/styles';
import { Paper, CircularProgress, Box, Button, FormControlLabel, Switch, ButtonGroup } from '@material-ui/core';
import { generateMockData } from '../utils/dataGenerator';
import { getChartOptions, getMainGraphData, getVennNetworkLayout, defaultColorMap } from '../utils/chartOptions';

const useStyles = makeStyles((theme) => ({
  graphContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  echartContainer: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  }
}));

const RelationshipGraph = () => {
  const classes = useStyles();
  const [graphData, setGraphData] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sourceEntityList, setSourceEntityList] = useState([]);
  const [downstreamEntityList, setDownstreamEntityList] = useState([]);
  const [layoutType, setLayoutType] = useState('traditional'); // 'traditional', 'circular', 'venn'
  const [chartError, setChartError] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    // Generate mock data for the graph
    setLoading(true);
    
    // Use setTimeout to prevent UI blocking with large datasets
    setTimeout(() => {
      try {
        console.time('Data generation');
        
        // Generate traditional layout data
        const data = generateMockData();
        
        // Generate mock data for the circular layout with more nodes and complex connections
        const dataPlatforms = ['data warehouse', 'data lake', 'stream processing', 'big data platform', 'data mesh'];
        
        // 创建更多的源节点，有些会连接到多个数据平台
        const mockSourceEntityList = [];
        
        // 创建200多个源节点
        for (let i = 0; i < 250; i++) {
          // 决定这个源节点连接到几个数据平台 (1-3个)
          const platformCount = Math.floor(Math.random() * 3) + 1;
          
          // 为每个连接创建一个实体
          for (let j = 0; j < platformCount; j++) {
            const platformIndex = Math.floor(Math.random() * dataPlatforms.length);
            mockSourceEntityList.push({
              unique_key: `source-${i}-platform-${j}`,
              data_platform: dataPlatforms[platformIndex],
              source_app_bus_org: 'Business Org ' + (i % 5),
              source_app_it_dir: 'IT Dir ' + (i % 3),
              source_application_name: `Source App ${i}`, // 相同名称表示同一个应用连接到多个平台
              source_data_gbgf: 'GBGF-' + (i % 10),
              source_eim_id: `EIM-${1000 + i}`,
              source_table_count: Math.floor(Math.random() * 100) + 1
            });
          }
        }
        
        // 创建下游节点，有些会连接到多个数据平台，有些与源节点同名（既是源也是下游）
        const mockDownstreamEntityList = [];
        
        // 创建300多个下游节点
        for (let i = 0; i < 350; i++) {
          // 决定这个下游节点连接到几个数据平台 (1-3个)
          const platformCount = Math.floor(Math.random() * 3) + 1;
          
          // 有20%的概率，这个节点也是一个源节点（使用相同的名称）
          const isMixed = Math.random() < 0.2;
          const appName = isMixed ? `Source App ${Math.floor(Math.random() * 100)}` : `Downstream App ${i}`;
          
          // 为每个连接创建一个实体
          for (let j = 0; j < platformCount; j++) {
            const platformIndex = Math.floor(Math.random() * dataPlatforms.length);
            mockDownstreamEntityList.push({
              unique_key: `downstream-${i}-platform-${j}`,
              data_platform: dataPlatforms[platformIndex],
              downstream_app_bus_org: 'Business Org ' + (i % 5),
              downstream_app_it_dir: 'IT Dir ' + (i % 3),
              downstream_application_abbr: 'DS-' + i,
              downstream_application_gbgf: 'GBGF-' + (i % 10),
              downstream_application_name: appName,
              downstream_eid_id: `EID-${2000 + i}`,
              share_to_downstream_table_count: Math.floor(Math.random() * 100) + 1
            });
          }
        }
        
        setSourceEntityList(mockSourceEntityList);
        setDownstreamEntityList(mockDownstreamEntityList);
        setGraphData(data);
        
        console.timeEnd('Data generation');
      } catch (error) {
        console.error('Error generating data:', error);
      } finally {
        setLoading(false);
      }
    }, 100);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      try {
        if (chartRef.current && chartRef.current.getEchartsInstance) {
          chartRef.current.getEchartsInstance().resize();
        }
      } catch (error) {
        console.error('Error during resize:', error);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set the layout type
  const setLayout = (type) => {
    setLayoutType(type);
  };

  // Calculate node size based on type and connections
  const getNodeSize = (node) => {
    if (!node) return 10;
    
    if (node.type === 'DataPlatform') {
      return 50; // Increased size for DataPlatform nodes to make them more prominent
    }
    
    // Calculate size based on connections with smaller range for better visibility
    // with large number of nodes
    const minSize = 8;
    const maxSize = 25;
    const connectionCount = node.connectionCount || 1;
    
    // Use logarithmic scaling for better distribution with many nodes
    const logScale = Math.log(connectionCount + 1) / Math.log(1.5);
    return Math.max(minSize, Math.min(maxSize, minSize + logScale * 2));
  };

  // Get color for node based on type
  const getNodeColor = (node) => {
    if (!node || !node.type) return '#999';
    
    const colors = {
      DataPlatform: '#4285F4', // Blue
      Source: '#34A853',       // Green
      Downstream: '#EA4335',   // Pink/Red
      Mixed: '#AA46BC'         // Purple for mixed type (Source + Downstream)
    };
    
    return node.isMixed ? colors.Mixed : colors[node.type] || '#999';
  };

  // Get options for the chart using the utility function
  const getOption = () => {
    try {
      if (!graphData && !sourceEntityList.length) return {};
      
      switch (layoutType) {
        case 'circular':
          // For the circular layout
          const circularData = getMainGraphData(sourceEntityList, downstreamEntityList, defaultColorMap);
          return getChartOptions(circularData, hoveredNode);
        
        case 'venn':
          // For the Venn Network layout
          const vennData = getVennNetworkLayout(sourceEntityList, downstreamEntityList, defaultColorMap);
          return getChartOptions(vennData, hoveredNode);
          
        case 'traditional':
        default:
          // For the traditional layout
          return getChartOptions(graphData, hoveredNode);
      }
    } catch (error) {
      console.error('Error generating chart options:', error);
      return {}; // Return empty options on error
    }
  };

  // Safe event handlers for chart interactions
  const onChartEvents = {
    'mouseover': (params) => {
      try {
        if (params && params.data && params.dataType === 'node' && params.data.id) {
          setHoveredNode(params.data.id);
        }
      } catch (error) {
        console.error('Error in mouseover event:', error);
      }
    },
    'mouseout': () => {
      try {
        setHoveredNode(null);
      } catch (error) {
        console.error('Error in mouseout event:', error);
      }
    },
    'click': (params) => {
      try {
        if (params && params.data && params.dataType === 'node' && params.data.id) {
          // Toggle hover state on click for mobile devices
          setHoveredNode(hoveredNode === params.data.id ? null : params.data.id);
        } else {
          // Clicking on empty space clears the selection
          setHoveredNode(null);
        }
      } catch (error) {
        console.error('Error in click event:', error);
      }
    }
  };
  
  // Initialize chart with safer approach
  const initializeChart = () => {
    if (!chartRef.current) return;
    
    try {
      const chartInstance = chartRef.current.getEchartsInstance();
      if (!chartInstance) return;
      
      // Clear any previous handlers
      chartInstance.off('mouseover');
      chartInstance.off('mouseout');
      chartInstance.off('click');
    } catch (error) {
      console.error('Error clearing chart events:', error);
    }
  };
  
  // 已经使用 setLayout 函数替代了 toggleLayout

  // Ensure chart is properly initialized before rendering
  useEffect(() => {
    // When chart ref and data are available, ensure the chart is properly initialized
    if (chartRef.current && graphData && !loading) {
      try {
        const chartInstance = chartRef.current.getEchartsInstance();
        if (chartInstance) {
          // Use a stable version of the options to avoid infinite re-renders
          const options = {
            tooltip: {
              trigger: 'item',
              formatter: (params) => {
                try {
                  if (params && params.dataType === 'node' && params.data) {
                    const data = params.data;
                    return `
                      <div>
                        <strong>${data.label}</strong><br/>
                        Type: ${data.isMixed ? 'Source & Downstream' : data.type}<br/>
                        Connections: ${data.connectionCount || 0}
                      </div>
                    `;
                  }
                } catch (error) {
                  console.error('Error in tooltip formatter:', error);
                }
                return '';
              }
            },
            animation: true,
            animationDuration: 1000,
            animationEasingUpdate: 'quinticInOut',
            series: [{
              type: 'graph',
              layout: 'none',
              data: graphData.nodes.map(node => ({
                ...node,
                symbolSize: getNodeSize(node),
                itemStyle: {
                  color: getNodeColor(node),
                  borderWidth: hoveredNode === node.id ? 3 : 1,
                  borderColor: hoveredNode === node.id ? '#FFD700' : 'rgba(255, 255, 255, 0.5)',
                  opacity: hoveredNode ? (
                    hoveredNode === node.id || 
                    graphData.links.some(link => 
                      (typeof link.source === 'object' ? link.source.id : link.source) === hoveredNode && 
                      (typeof link.target === 'object' ? link.target.id : link.target) === node.id || 
                      (typeof link.target === 'object' ? link.target.id : link.target) === hoveredNode && 
                      (typeof link.source === 'object' ? link.source.id : link.source) === node.id
                    ) ? 1 : 0.3
                  ) : 1
                },
                label: {
                  show: true,
                  position: 'right',
                  formatter: node.label,
                  fontSize: 12,
                  color: '#333'
                }
              })),
              links: graphData.links.map(link => ({
                ...link,
                lineStyle: {
                  color: 'rgba(128, 128, 128, 0.3)',
                  width: hoveredNode ? (
                    (typeof link.source === 'object' ? link.source.id : link.source) === hoveredNode || 
                    (typeof link.target === 'object' ? link.target.id : link.target) === hoveredNode ? 3 : 1
                  ) : 1,
                  opacity: hoveredNode ? (
                    (typeof link.source === 'object' ? link.source.id : link.source) === hoveredNode || 
                    (typeof link.target === 'object' ? link.target.id : link.target) === hoveredNode ? 1 : 0.1
                  ) : 0.3,
                  curveness: 0.3
                }
              })),
              roam: true,
              draggable: true,
              focusNodeAdjacency: false, // Disable built-in adjacency highlighting to avoid errors
              lineStyle: {
                color: 'source',
                curveness: 0.3
              },
              emphasis: {
                focus: 'adjacency',
                lineStyle: {
                  width: 3
                }
              },
              edgeSymbol: ['none', 'arrow'],
              edgeSymbolSize: 8
            }]
          };
          
          // Clear any previous options first
          chartInstance.clear();
          // Set new options
          chartInstance.setOption(options, true);
          
          // Force a resize to ensure proper rendering
          setTimeout(() => {
            try {
              if (chartInstance) {
                chartInstance.resize();
              }
            } catch (error) {
              console.error('Error in resize:', error);
            }
          }, 200);
        }
      } catch (error) {
        console.error('Error initializing chart:', error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, loading]);

  return (
    <Paper className={classes.graphContainer} elevation={3}>
      <Box position="absolute" top={10} right={10} zIndex={1000}>
        <ButtonGroup variant="contained" color="primary">
          <Button 
            onClick={() => setLayout('traditional')}
            variant={layoutType === 'traditional' ? 'contained' : 'outlined'}
            color={layoutType === 'traditional' ? 'primary' : 'default'}
          >
            Traditional
          </Button>
          <Button 
            onClick={() => setLayout('circular')}
            variant={layoutType === 'circular' ? 'contained' : 'outlined'}
            color={layoutType === 'circular' ? 'primary' : 'default'}
          >
            Circular
          </Button>
          <Button 
            onClick={() => setLayout('venn')}
            variant={layoutType === 'venn' ? 'contained' : 'outlined'}
            color={layoutType === 'venn' ? 'primary' : 'default'}
          >
            Venn Network
          </Button>
        </ButtonGroup>
      </Box>
      
      {loading ? (
        <Box className={classes.loadingContainer}>
          <CircularProgress />
        </Box>
      ) : chartError ? (
        <Box className={classes.loadingContainer}>
          <div>Error: {chartError}</div>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
            style={{ marginTop: 16 }}
          >
            Reload
          </Button>
        </Box>
      ) : (
        <ReactECharts
          ref={chartRef}
          option={getOption()}
          style={{ height: '100%', width: '100%' }}
          onEvents={onChartEvents}
          notMerge={true}
          lazyUpdate={false}
          opts={{ renderer: 'canvas' }}
        />
      )}
    </Paper>
  );
};

export default RelationshipGraph;
