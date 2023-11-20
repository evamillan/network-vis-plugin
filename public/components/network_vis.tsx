/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bitergia requires contributions made to this file be 
 * licensed under the Apache-2.0 license or a compatible
 * open source license.
 *
 * Any modifications Copyright Bitergia.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect, useRef, useState } from 'react';
import randomColor from 'randomcolor';
import { euiPaletteColorBlind } from '@elastic/eui';
import { Network } from "vis-network";
import { getNotifications } from './../services';
import { Legend } from './network_vis_legend';

export const NetworkVis = ({ vis, visData, visParams}) => {
  const { toasts } = getNotifications();
  const container = useRef<HTMLDivElement>(null);
  const [colorDicc, setColorDicc] = useState(vis.uiState.get('vis.colors', {}));
  const defaultPalette = euiPaletteColorBlind({rotations: 2});
  const usedColors: String[] = [];
  const buckets = visData.rows;
  const options = {
    physics: {
      barnesHut: {
        gravitationalConstant: visParams.gravitationalConstant,
        springConstant: visParams.springConstant,
      },
    },
    edges: {
      arrows: {
        [visParams.posArrow]: {
          enabled: visParams.displayArrow,
          scaleFactor: visParams.scaleArrow,
          type: visParams.shapeArrow,
        }
      },
      arrowStrikethrough: false,
      smooth: {
        type: visParams.smoothType,
      },
      scaling: {
        min: visParams.minEdgeSize,
        max: visParams.maxEdgeSize,
      },
    },
    nodes: {
      physics: visParams.nodePhysics,
      scaling: {
        min: visParams.minNodeSize,
        max: visParams.maxNodeSize,
      },
    },
    interaction: {
      hover: true,
      tooltipDelay: 50,
    },
    manipulation: {
      enabled: true,
    },
    layout: {
      improvedLayout: true
    },
  };

  let firstFirstBucketId;
  let firstSecondBucketId;
  let secondBucketId;
  let colorBucketId;
  let nodeSizeId;
  let edgeSizeId;
  // constiables for agg ids, ex. id: "3" from one of the aggs (currently in vis.aggs)
  let edgeSizeAggId;
  // constiables for tooltip text
  let primaryNodeTermName;
  let secondaryNodeTermName;
  let edgeSizeTermName;
  let nodeSizeTermName;

  let nodes: any[] = []
  let edges: any[] = []

  useEffect(() => {
    container.current &&
    new Network(container.current, { nodes, edges }, options);
  }, [container, nodes, edges])

  useEffect(() => {
    vis.uiState.set('vis.colors', colorDicc);
  }, [colorDicc])

  function getTooltipTitle(termName, termValue, sizeTerm = null, sizeValue = null) {
    let tooltipTitle = termName + ': ' + termValue;
    if (sizeTerm !== null) {
      tooltipTitle += '<br/>' + sizeTerm + ': ' + sizeValue;
    }
    return tooltipTitle;
  }

  const getColumnIdByAggId = (aggId) => {
    return visData.columns?.find((col) => {
      return col.id.split('-')[2] === aggId;
    }).id;
  };

  function getColumnNameFromColumnId(columnId) {
    return visData.columns?.find(colObj => colObj.id === columnId).name;
  }

  function getData() {
    visData.aggs.aggs.forEach(agg => {
      if (agg.schema === 'first') {
        // firstSecondBucketId is the secondary node in a node-node
        // it also has a schema name of 'first', so set it if the first node is already set
        //
        // The metric used to return both primary and secondary nodes will always contain a colon,
        // since it will take the form of "metric: order", for example, "DestIP: Descending"
        // This might look confusing in a tooltip, so only the term name is used here
        if (firstFirstBucketId) {
          firstSecondBucketId = getColumnIdByAggId(agg.id);
          secondaryNodeTermName = getColumnNameFromColumnId(firstSecondBucketId).split(':')[0];
        } else {
          firstFirstBucketId = getColumnIdByAggId(agg.id);
          primaryNodeTermName = getColumnNameFromColumnId(firstFirstBucketId).split(':')[0];
        }
      } else if (agg.schema === 'second') {
        secondBucketId = getColumnIdByAggId(agg.id);
      } else if (agg.schema === 'colornode') {
        colorBucketId = getColumnIdByAggId(agg.id);
      } else if (agg.schema === 'size_node') {
        nodeSizeId = getColumnIdByAggId(agg.id);
        nodeSizeTermName = getColumnNameFromColumnId(nodeSizeId);
      } else if (agg.schema === 'size_edge') {
        edgeSizeAggId = agg.id;
      }
    });
  
    // Getting edge size id here to ensure all other buckets were located in the aggs already (future-proofing
    // in case the order of the aggs being returned changes)
    if (edgeSizeAggId) {
      if (firstFirstBucketId && (firstSecondBucketId || secondBucketId)) {
        edgeSizeId = 'col-5-' + edgeSizeAggId;
        edgeSizeTermName = getColumnNameFromColumnId(edgeSizeId);
      }
    }

    // Single NODE or NODE-NODE Type
    if ((firstFirstBucketId || firstSecondBucketId) && !secondBucketId) {
      /// DATA PARSED AND BUILDING NODES
      const dataParsed: any[] = [];
      // Iterate the buckets
      let i = 0;
      let dataNodes = buckets.map(function(bucket) {
        const result = $.grep(dataParsed, function(e) {
          return e.keyFirstNode === bucket[firstFirstBucketId];
        });
  
        // first time we've parsed a node with this id
        if (result.length === 0) {
          dataParsed[i] = {};
  
          dataParsed[i].keyFirstNode = bucket[firstFirstBucketId];
  
          let value = bucket[nodeSizeId];
  
          if (visParams.maxCutMetricSizeNode) {
            value = Math.min(visParams.maxCutMetricSizeNode, value);
          }
  
          // Don't show nodes under the value
          if (visParams.minCutMetricSizeNode > value) {
            dataParsed.splice(i, 1);
            return;
          }
  
          dataParsed[i].valorSizeNode = value;
          dataParsed[i].nodeColorValue = 'default';
          dataParsed[i].nodeColorKey = 'default';
          if (!dataParsed[i].relationWithSecondNode) {
            dataParsed[i].relationWithSecondNode = [];
          }
  
          // Iterate rows and choose the edge size
          if (firstSecondBucketId) {
            let sizeEdgeVal = 0.1;
  
            if (edgeSizeId) {
              sizeEdgeVal = bucket[edgeSizeId];
  
              if (visParams.maxCutMetricSizeEdge) {
                sizeEdgeVal = Math.min(visParams.maxCutMetricSizeEdge, sizeEdgeVal);
              }
            }
  
            const relation = {
              keySecondNode: bucket[firstSecondBucketId],
              countMetric: bucket[nodeSizeId],
              widthOfEdge: sizeEdgeVal,
            };
            dataParsed[i].relationWithSecondNode.push(relation);
          }
  
          if (colorBucketId) {
            if (colorDicc[bucket[colorBucketId]]) {
              dataParsed[i].nodeColorKey = bucket[colorBucketId];
              dataParsed[i].nodeColorValue = colorDicc[bucket[colorBucketId]];
              usedColors.push(colorDicc[bucket[colorBucketId]]);
            } else {
              const confirmColor =
                defaultPalette.find(
                  (color) =>
                    Object.values(colorDicc).indexOf(color) === -1 &&
                    usedColors.indexOf(color) === -1
                ) || randomColor();
              colorDicc[bucket[colorBucketId]] = confirmColor;
              dataParsed[i].nodeColorKey = bucket[colorBucketId];
              dataParsed[i].nodeColorValue = colorDicc[bucket[colorBucketId]];
              usedColors.push(confirmColor);
            }
          }
  
          let colorNodeFinal = visParams.firstNodeColor;
          // Assign color and the content of the popup
          if (dataParsed[i].nodeColorValue !== 'default') {
            colorNodeFinal = dataParsed[i].nodeColorValue;
          }
  
          i++;
  
          // Return the node totally built
          const nodeReturn = {
            id: i,
            key: bucket[firstFirstBucketId],
            color: colorNodeFinal,
            shape: visParams.shapeFirstNode,
            value: value,
            font: {
              color: visParams.labelColor,
            },
          };
  
          // If activated, show the labels
          if (visParams.showLabels) {
            nodeReturn.label = bucket[firstFirstBucketId];
          }
  
          // If activated, show the popups
          if (visParams.showPopup) {
            nodeReturn.title = getTooltipTitle(
              primaryNodeTermName,
              bucket[firstFirstBucketId],
              nodeSizeTermName,
              nodeReturn.value
            );
          }
  
          return nodeReturn;
        } else if (result.length === 1) {
          // we already have this node id in dataNodes, so update with new info
          const dataParsedNodeExist = result[0];
          //Iterate rows and choose the edge size
          if (firstSecondBucketId) {
            let sizeEdgeVal = 0.1;
            if (edgeSizeId) {
              sizeEdgeVal = bucket[edgeSizeId];
            }
  
            const relation = {
              keySecondNode: bucket[firstSecondBucketId],
              countMetric: bucket[nodeSizeId],
              widthOfEdge: sizeEdgeVal,
            };
            dataParsedNodeExist.relationWithSecondNode.push(relation);
          }
          return undefined;
        }
      });
  
      // Clean "undefined" out of the array
      dataNodes = dataNodes.filter(Boolean);
  
      // BUILDING EDGES AND SECONDARY NODES
      const dataEdges: any[] = [];
      for (let n = 0; n < dataParsed.length; n++) {
        // Find in the array the node with the keyFirstNode
        const result: any[] = $.grep(dataNodes, function(e) {
          return e.key === dataParsed[n].keyFirstNode;
        });
        if (result.length === 0) {
          console.log('Network Plugin Error: Node not found');
        } else if (result.length === 1) {
          // Found the node, access to its id
          if (firstSecondBucketId) {
            for (let r = 0; r < dataParsed[n].relationWithSecondNode.length; r++) {
              // Find in the relations the second node to relate
              const nodeOfSecondType = $.grep(dataNodes, function(e) {
                return e.key === dataParsed[n].relationWithSecondNode[r].keySecondNode;
              });
  
              if (nodeOfSecondType.length === 0) {
                // This is the first time this secondary node has been processed
                i++;
                const secondaryNode = {
                  id: i,
                  key: dataParsed[n].relationWithSecondNode[r].keySecondNode,
                  label: dataParsed[n].relationWithSecondNode[r].keySecondNode,
                  color: visParams.secondNodeColor,
                  font: {
                    color: visParams.labelColor,
                  },
                  shape: visParams.shapeSecondNode,
                };
                if (visParams.showPopup) {
                  secondaryNode.title = getTooltipTitle(
                    secondaryNodeTermName,
                    dataParsed[n].relationWithSecondNode[r].keySecondNode
                  );
                }
                // Add a new secondary node
                dataNodes.push(secondaryNode);
  
                // Create a new edge between a primary and secondary node
                const edge = {
                  from: result[0].id,
                  to: dataNodes[dataNodes.length - 1].id,
                  value: dataParsed[n].relationWithSecondNode[r].widthOfEdge,
                };
                if (visParams.showPopup && edgeSizeId) {
                  edge.title = getTooltipTitle(
                    edgeSizeTermName,
                    dataParsed[n].relationWithSecondNode[r].widthOfEdge
                  );
                }
                dataEdges.push(edge);
              } else if (nodeOfSecondType.length === 1) {
                // The secondary node being processed already exists,
                //    only a new edge needs to be created
                const enlace = {
                  from: result[0].id,
                  to: nodeOfSecondType[0].id,
                  value: dataParsed[n].relationWithSecondNode[r].widthOfEdge,
                };
                if (visParams.showPopup && edgeSizeId) {
                  enlace.title = getTooltipTitle(
                    edgeSizeTermName,
                    dataParsed[n].relationWithSecondNode[r].widthOfEdge
                  );
                }
                dataEdges.push(enlace);
              } else {
                console.log('Network Plugin Error: Multiple nodes with same id found');
              }
            }
          }
        } else {
          console.log('Network Plugin Error: Multiple nodes with same id found');
        }
      }
  
      nodes = dataNodes;
      edges = dataEdges;
  
      if (dataEdges.length > 200) {
        Object.assign(options.layout, { improvedLayout: false })
      }

      console.log('Network Plugin: Create network now');
  
      // NODE-RELATION Type
    } else if (secondBucketId && !firstSecondBucketId) {
      if (colorBucketId) {
        // Check if "Node Color" is the last selection
        if (colorBucketId <= secondBucketId) {
          toasts.addDanger('Node Color must be the last selection');
          return;
        }
      }
  
      // DATA PARSED AND BUILDING NODES
      const dataParsed: any[] = [];
      // Iterate the buckets
      let i = 0;
      let dataNodes = buckets.map(function(bucket) {
        const result = $.grep(dataParsed, function(e) {
          return e.keyNode === bucket[firstFirstBucketId];
        });
        // first time we've parsed a node with this id
        if (result.length === 0) {
          dataParsed[i] = {};
          dataParsed[i].keyNode = bucket[firstFirstBucketId];
  
          let value = bucket[nodeSizeId];
  
          if (vis.params.maxCutMetricSizeNode) {
            value = Math.min(vis.params.maxCutMetricSizeNode, value);
          }
  
          // Don't show nodes under the value
          if (visParams.minCutMetricSizeNode > value) {
            dataParsed.splice(i, 1);
            return;
          }
  
          dataParsed[i].valorSizeNode = value;
          dataParsed[i].nodeColorValue = 'default';
          dataParsed[i].nodeColorKey = 'default';
          dataParsed[i].relationWithSecondField = [];
  
          // Add relation edges
          let sizeEdgeVal = 0.1;
          if (edgeSizeId) {
            sizeEdgeVal = bucket[edgeSizeId];
  
            if (vis.params.maxCutMetricSizeEdge) {
              sizeEdgeVal = Math.min(vis.params.maxCutMetricSizeEdge, sizeEdgeVal);
            }
          }
  
          // Get the color of the node, save in the dictionary
          if (colorBucketId) {
            if (colorDicc[bucket[colorBucketId]]) {
              dataParsed[i].nodeColorKey = bucket[colorBucketId];
              dataParsed[i].nodeColorValue = colorDicc[bucket[colorBucketId]];
              usedColors.push(colorDicc[bucket[colorBucketId]]);
            } else {
              const confirmColor =
                defaultPalette.find(
                  (color) =>
                    Object.values(colorDicc).indexOf(color) === -1 &&
                    usedColors.indexOf(color) === -1
                  ) || randomColor();
              colorDicc[bucket[colorBucketId]] = confirmColor;
              dataParsed[i].nodeColorKey = bucket[colorBucketId];
              dataParsed[i].nodeColorValue = colorDicc[bucket[colorBucketId]];
              usedColors.push(confirmColor);
            }
          }
  
          const relation = {
            keyRelation: bucket[secondBucketId],
            countMetric: bucket[nodeSizeId],
            widthOfEdge: sizeEdgeVal,
          };
          dataParsed[i].relationWithSecondField.push(relation);
  
          let colorNodeFinal = visParams.firstNodeColor;
          if (dataParsed[i].nodeColorValue !== 'default') {
            colorNodeFinal = dataParsed[i].nodeColorValue;
          }
  
          i++;
  
          // Return the node totally built
          const nodeReturn = {
            id: i,
            key: bucket[firstFirstBucketId],
            color: colorNodeFinal,
            shape: visParams.shapeFirstNode,
            value: value,
            font: {
              color: visParams.labelColor,
            },
          };
  
          // If activated, show the labels
          if (visParams.showLabels) {
            nodeReturn.label = bucket[firstFirstBucketId];
          }
  
          // If activated, show the popups
          if (visParams.showPopup) {
            nodeReturn.title = getTooltipTitle(
              primaryNodeTermName,
              bucket[firstFirstBucketId],
              nodeSizeTermName,
              nodeReturn.value
            );
          }
                
        return nodeReturn;
      } else if (result.length === 1) {
        // we already have this node id in dataNodes, so update with new info
        const dataParsedNodeExist = result[0];
        let sizeEdgeVal = 0.1;
        if (edgeSizeId) {
          sizeEdgeVal = bucket[edgeSizeId];
        }
  
        const relation = {
          keyRelation: bucket[secondBucketId],
          countMetric: bucket[nodeSizeId],
          widthOfEdge: sizeEdgeVal,
        };
        dataParsedNodeExist.relationWithSecondField.push(relation);
        return undefined;
      }
    });
  
    // BUILDING EDGES
    // Clean "undefinded" in the array
    dataNodes = dataNodes.filter(Boolean);
    const dataEdges: any[] = [];
  
    // Iterate parsed nodes
    for (let n = 0; n < dataParsed.length; n++) {
      // Obtain id of the node
      const NodoFrom: any[] = $.grep(dataNodes, function(e) {
        return e.key === dataParsed[n].keyNode;
      });
      if (NodoFrom.length === 0) {
        console.log('Network Plugin Error: Node not found');
      } else if (NodoFrom.length === 1) {
        const idFrom = NodoFrom[0].id;
        // Iterate relations that have with the second field selected
        for (let p = 0; p < dataParsed[n].relationWithSecondField.length; p++) {
          // Iterate again the nodes
          for (let z = 0; z < dataParsed.length; z++) {
            // Check that we don't compare the same node
            if (dataParsed[n] !== dataParsed[z]) {
              const NodoTo: any[] = $.grep(dataNodes, function(e) {
                return e.key === dataParsed[z].keyNode;
              });
              if (NodoTo.length === 0) {
                console.log('Network Plugin Error: Node not found');
              } else if (NodoTo.length === 1) {
                const idTo = NodoTo[0].id;
                // Have relation?
                const sameRelation: any[] = $.grep(dataParsed[z].relationWithSecondField, function(e) {
                  return (
                    e.keyRelation === dataParsed[n].relationWithSecondField[p].keyRelation
                  );
                });
                if (sameRelation.length === 1) {
                  // Nodes have a relation, creating the edge
                  const edgeExist = $.grep(dataEdges, function(e) {
                    return (
                      (e.to === idFrom && e.from === idTo) ||
                      (e.to === idTo && e.from === idFrom)
                    );
                  });
                  if (edgeExist.length === 0) {
                    // The size of the edge is the total of the common
                    const sizeEdgeTotal =
                      sameRelation[0].widthOfEdge +
                      dataParsed[n].relationWithSecondField[p].widthOfEdge;
                    const edge = {
                      from: idFrom,
                      to: idTo,
                      value: sizeEdgeTotal,
                    };
                    dataEdges.push(edge);
                  }
                }
              } else {
                console.log('Network Plugin Error: Multiples nodes with same id found');
              }
            }
          }
        }
      } else {
        console.log('Network Plugin Error: Multiples nodes with same id found');
      }
    }
      nodes = dataNodes;
      edges = dataEdges;
      Object.assign(options, {
        physics: {
          barnesHut: {
            gravitationalConstant: visParams.gravitationalConstant,
            springConstant: visParams.springConstant,
            springLength: 500,
          },
        },
        interaction: {
          hideEdgesOnDrag: true,
          hover: true,
          tooltipDelay: 100,
        },
        layout: {
          improvedLayout: false,
        },
      })
      console.log('Network Plugin: Create network now');
    } else if (secondBucketId && firstSecondBucketId) {
      toasts.addDanger('You can only choose Node-Node or Node-Relation');
    }
  }

  getData()

  return (
    <>
      <div ref={container} style={{ height: '100%', width: '100%' }} />
      {colorBucketId && visParams.showColorLegend ?
        <Legend
          colorDicc={colorDicc}
          setColorDicc={setColorDicc}
          usedColors={usedColors}
          uiState={vis.uiState}
        /> : null
      }
    </>
  )
}