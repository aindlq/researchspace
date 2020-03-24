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

import * as React from 'react';
import { Resizable as ReactResizable, ResizeCallbackData } from 'react-resizable';
import * as _ from 'lodash';

import * as styles from './Resizable.scss';
import { TemplateItemProps } from 'platform/components/ui/template';

export interface ResizableProps {
  size?: {height: number; width: number}
  isFixedSize: boolean
  setFixedSize: (b: boolean) => void
  getScale?: () => number
  onResize: (size: {width: number; height: number}) => void
}

interface State {
  size: {height: number; width: number}
  initialSize: {height: number; width: number}
  isFixedSize: boolean
}

export class Resizable extends React.Component<ResizableProps, State> {

  constructor(props: ResizableProps) {
    super(props);
    this.state = {
      size: props.size,
      initialSize: props.size,
      isFixedSize: props.isFixedSize,
    };
  }

  static getDerivedStateFromProps(props: ResizableProps, state: State): State {
    if (state.isFixedSize) {
      return state;
    } else {
      return {
        size: props.size,
        initialSize: props.size,
        isFixedSize: state.isFixedSize
      };
    }
  }

  render() {
    const { children } = this.props;
    const { size, isFixedSize } = this.state;
    const child = React.Children.only(children) as React.ReactElement<TemplateItemProps> ;
    return (
      <ReactResizable width={size.width} height={size.height}
        onResize={this.onResize}
        className={styles.holder}
        handle={
          <span className={styles.resizableHandle} onDoubleClick={this.onReset}></span>
        }
      >
        {isFixedSize ? React.cloneElement(child, {componentProps: {style: size}}) : child}
      </ReactResizable>
    );
  }

  private onReset = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    this.props.setFixedSize(false);
    this.setState({isFixedSize: false});
  }

  private onResize = (_e: React.SyntheticEvent, {size}: ResizeCallbackData) => {
    const { height, width } = this.state.size;
    const scale = this.props?.getScale() || 1;
    let newSize = size;
    if (scale !== 1) {
      newSize = {
        height: height + (size.height - height) / scale,
        width: width + (size.width - width) / scale,
      };
    }
    this.setState({size: newSize, isFixedSize: true});
    this.props.onResize(newSize);
  }
}

export default Resizable;
