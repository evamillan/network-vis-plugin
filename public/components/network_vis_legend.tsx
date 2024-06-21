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

import React from 'react';
import { ouiPaletteColorBlind } from '@elastic/eui';

export const Legend = ({items, setColorDicc, uiState}) => {
  const defaultPalette = ouiPaletteColorBlind({rotations: 1});
  const saveColors = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.persist()
    const copy = uiState.get('vis.colors', {});
    copy[event.target.id] = event.target.value;
    uiState.set('vis.colors', copy);
    setColorDicc(copy);
  };
  const options = defaultPalette.map((color) => <option key={color}>{color}</option>)
  const listItems = [...items].map(item =>
    <li key={item[0]} className='vis-network-legend-line'>
      <input
        type="color"
        list="color-datalist"
        id={item[0]}
        name={item[0]}
        value={item[1]}
        onChange={saveColors}
      />
      <label htmlFor={item[0]}>
        <div 
          className="vis-network-legend-color"
          style={{backgroundColor: item[1]}}
        />
        {item[0]}
      </label>
      <datalist id="color-datalist">{options}</datalist>
    </li>
  );

  return <ul className='vis-network-legend'>{listItems}</ul>;
};
