/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import {
  ComponentClass,
} from 'react';

/**
 * That is a special require, custom-components module will be generated by
 * webpack custom componentsLoader that uses component.json file to create
 * set of dynamic 'System.import' for web components.
 */
const components = require('platform-components');

/**
 * Asynchronously load JS file for React based web-component.
 */
export function loadComponent(tagName: string): Promise<ComponentClass<any>> {
  if (hasComponent(tagName)) {
    return components(tagName).then(
      component => {
        const comp = component.default ? component.default : component;
        return comp;
      }
    );
  } else {
    console.warn('component not found for tag ' + tagName);
  }
}

/**
 * Check if there is React component that corresponds to tagName.
 */
export function hasComponent(tagName: string): boolean {
  const loader = components(tagName);
  if (loader) {
    return true;
  } else {
    return false;
  }
}

export interface ComponentClassMetadata {
  __htmlTag?: string;
}
