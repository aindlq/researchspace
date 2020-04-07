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

import {createElement} from 'react';
import {render, unmountComponentAtNode} from 'react-dom';

import { ModuleRegistry } from 'platform/api/module-loader';

/**
 * This component render custom html elements.
 * It takes inner html, parses it into the react element and then renders the result inside.
 */
export class TemplateItemComponent extends HTMLElement {
  connectedCallback() {
    // this is ugly hack to workaround issue with react root inside custom web component,
    // see https://github.com/facebook/react/issues/9242
    const shadow = this.attachShadow({ mode: 'open' }) as any;
    const root = document.createElement('div');
    shadow.appendChild(root);

    Object.defineProperty(root, 'ownerDocument', { value: shadow });
    shadow.createElement = (...args: any) => (document as any).createElement(...args);
    shadow.createElementNS = (...args: any) => (document as any).createElementNS(...args);
    shadow.createTextNode = (...args: any) => (document as any).createTextNode(...args);

    ModuleRegistry.parseHtmlToReact(this.innerHTML).then(
      res => {
        render(createElement('div', {}, res), root);
      }
    );
  }

  disconnectedCallback() {
    unmountComponentAtNode(this);
  }
}
