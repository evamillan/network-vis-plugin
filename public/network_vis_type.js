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

import { i18n } from '@osd/i18n';
import { AggGroupNames } from '../../../src/plugins/data/public';
import { Schemas } from '../../../src/plugins/vis_default_editor/public';
import { NetworkVis } from './components/network_vis';
import { networkVisRequestHandler } from './data_load/network_vis_request_handler';
import { networkOptions } from './components/network_vis_options_lazy';
import { VIS_EVENT_TO_TRIGGER } from '../../../src/plugins/visualizations/public';
import './index.scss'
import image from './images/icon-network.svg';

export function getNetworkVisTypeDefinition() {
  return {
    name: 'kbn_network',
    title: i18n.translate('visTypeNetwork.visTitle', {
      defaultMessage: 'Network'
    }),
    icon: image,
    description: i18n.translate('visTypeNetwork.visDescription', {
      defaultMessage: 'Network plugin for visualizing data as networks'
    }),
    getSupportedTriggers: () => {
      return [VIS_EVENT_TO_TRIGGER.filter];
    },
    visConfig: {
      component: NetworkVis,
      defaults: {
        showLabels: true,
        showPopup: true,
        showColorLegend: true,
        nodePhysics: true,
        firstNodeColor: '#6F86D7',
        secondNodeColor: '#DAA05D',
        shapeFirstNode: 'dot',
        shapeSecondNode: 'box',
        displayArrow: false,
        posArrow: 'to',
        shapeArrow: 'arrow',
        smoothType: 'continuous',
        scaleArrow: 1,
        maxCutMetricSizeNode: 5000,
        minCutMetricSizeNode: 0,
        maxCutMetricSizeEdge: 5000,
        maxNodeSize: 80,
        minNodeSize: 8,
        maxEdgeSize: 20,
        minEdgeSize: 0.1,
        springConstant: 0.001,
        gravitationalConstant: -35000,
        labelColor: '#000000',
      },
    },
    editorConfig: {
      optionsTemplate: networkOptions,
      schemas: new Schemas([
        {
          group: AggGroupNames.Metrics,
          name: 'size_node',
          title: 'Node Size',
          aggFilter: ['!geo_centroid', '!geo_bounds'],
          aggSettings: {
            top_hits: {
              allowStrings: false
            }
          },
          mustBeFirst: 'true',
          min: 1,
          max: 1,
          defaults: [{ type: 'count', schema: 'size_node' }]
        },
        {
          group: AggGroupNames.Metrics,
          name: 'size_edge',
          title: 'Edge Size',
          aggFilter: ['!geo_centroid', '!geo_bounds'],
          aggSettings: {
            top_hits: {
              allowStrings: false
            }
          },
          max: 1,
          defaults: [{ type: 'count', schema: 'size_edge' }]
        },
        {
          group: AggGroupNames.Buckets,
          name: 'first',
          title: "Node",
          mustBeFirst: 'true',
          min: 1,
          max: 2,
          aggFilter: ['terms']
        },
        {
          group: AggGroupNames.Buckets,
          name: 'second',
          title: "Relation",
          max: 1,
          aggFilter: ['terms']
        },
        {
          group: AggGroupNames.Buckets,
          name: 'colornode',
          title: "Node Color",
          max: 1,
          aggFilter: ['terms']
        }
      ])
    },
    requestHandler: networkVisRequestHandler,
    hierarchicalData: (vis) => {
      return true;
    }
  };
}
