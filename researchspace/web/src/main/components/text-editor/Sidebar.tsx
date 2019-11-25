/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

import { Editor, findDOMNode } from 'slate-react';
import * as Slate from 'slate';

import * as React from 'react';

import { BlockDropdown } from './Toolbar';
import * as styles from './TextEditor.scss';

export interface SidebarProps {
  value: Slate.Value
  editor: React.RefObject<Editor>;
  anchorBlock: Slate.Block
}

export class Sidebar extends React.Component<SidebarProps, any> {
  render() {
    const { anchorBlock } = this.props;
    if (anchorBlock) {
      // some strange bug with typescript, so we need to convert immutable list to js array
      // also problem in slate-react definition with findDOMNode
      const node = findDOMNode(anchorBlock) as HTMLElement;
      const sidebarStyle = {
        height: node.offsetHeight,
        transform: `translateY(${node.offsetTop}px)`,
      };

      return (
        <div className={styles.sidebar} style={sidebarStyle}>
          <BlockDropdown {...this.props} sidebar={true} />
        </div>
      );
    } else {
      return null;
    }
  }
}
