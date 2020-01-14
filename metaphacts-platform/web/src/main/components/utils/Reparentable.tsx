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
