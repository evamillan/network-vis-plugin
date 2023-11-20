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

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin
} from '../../../src/core/public';
import { VisualizationsSetup } from '../../../src/plugins/visualizations/public';
import { getNetworkVisTypeDefinition } from './network_vis_type';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import {
  setFormatService,
  setNotifications,
  setQueryService,
  setSearchService
} from './services';


/** @internal */
export interface NetworkVisPluginSetupDependencies {
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface NetworkVisPluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export class NetworkVisPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;
  createBaseVisualization: any;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { visualizations }: NetworkVisPluginSetupDependencies
  ) {
    visualizations.createReactVisualization(getNetworkVisTypeDefinition());
  }

  public start(core: CoreStart, { data }: NetworkVisPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setNotifications(core.notifications);
    setQueryService(data.query);
    setSearchService(data.search);
  }
}

export interface SetupDependencies {
  visualizations: VisualizationsSetup;
}