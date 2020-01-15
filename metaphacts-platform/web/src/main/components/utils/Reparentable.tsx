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

import * as React from 'react';
import * as ReactDOM from 'react-dom';

const store = {};

function getMountNode(uid) {
  if (!store[uid]) {
    const mountNode = document.createElement('div');
    mountNode.style.height = '100%';
    store[uid] = {
      mountNode,
      inUse: true
    };
  } else {
    store[uid].inUse = true;
  }

  return store[uid].mountNode;
}

function removeMountNode(uid) {
  const record = store[uid];

  record.inUse = false;

  setTimeout(() => {
    if (!store[uid].inUse) {
      ReactDOM.unmountComponentAtNode(store[uid].mountNode);
      delete store[uid];
    }
  }, 5000);
}

interface Props {
  uid: string
}

export class Reparentable extends React.Component<Props> {

  private el: HTMLElement;

  componentDidMount() {
    const mountNode = getMountNode(this.props.uid);
    this.el.appendChild(mountNode);

    this.renderChildrenIntoNode(mountNode);
  }

  componentDidUpdate() {
    const mountNode = getMountNode(this.props.uid);
    this.renderChildrenIntoNode(mountNode);
  }

  componentWillUnmount() {
    removeMountNode(this.props.uid);
  }

  renderChildrenIntoNode(node) {
    // We use this instead of `render` because this also handles
    // passing the context
    // for some reason children when used inside dashobard has key that cause
    // re-rendering, so we just drop it with clone. TODO
    const element = React.cloneElement(this.props.children as any, {key: this.props.uid});
    ReactDOM.unstable_renderSubtreeIntoContainer(this, element as any, node);
  }

  render() {
    return <div style={{flex: '1 1 auto', overflowY: 'auto'}} ref={(el) => { this.el = el; }}></div>;
  }
}
