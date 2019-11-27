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
import { findDOMNode } from 'react-dom';
import * as Slate from 'slate';
import { RenderNodeProps } from 'slate-react';
import { Overlay, Popover, FormControl, ButtonGroup, Button } from 'react-bootstrap';

import { Inline } from './EditorSchema';

import * as styles from './TextEditor.scss';

export interface ExternalLinkProps extends RenderNodeProps {
  editor: Slate.Editor
}

interface ExternalLinkState {
  href: string
  edit: boolean
}

export class ExternalLink extends React.Component<ExternalLinkProps, ExternalLinkState> {

  private aRef: React.RefObject<HTMLAnchorElement>;
  private inputRef: React.RefObject<FormControl>;
  private popoverRef: React.RefObject<HTMLDivElement>;

  constructor(props: ExternalLinkProps) {
    super(props);
    this.aRef = React.createRef<HTMLAnchorElement>();
    this.inputRef = React.createRef<FormControl>();
    this.popoverRef = React.createRef<HTMLDivElement>();

    const href = props.node.data.get('attributes', {}).href || '';
    this.state = {
      href: href,
      edit: href === '' ? true : false
    };
  }

  onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
  }

  onHrefSaved = (event: React.MouseEvent<Button>) => {
    event.preventDefault();

    const node =
      this.props.node.setIn(
        ['data', 'attributes'], { href: this.state.href }
      ) as Slate.Inline;
    this.props.editor
      .moveToStartOfNode(node)
      .setInlines(node);
    this.setState({ edit: false });
  }

  onUnlink = (event: React.MouseEvent<Button>) => {
    event.preventDefault();

    const { editor, node } = this.props;
    editor
      .moveToRangeOfNode(node)
      .focus()
      .unwrapInline(Inline.externalLink);
  }

  onOverlayShown = () => {
    if (this.state.edit) {
      const input = findDOMNode(this.inputRef.current) as HTMLInputElement;
      input.focus();
    }
  }

  onEdit = () => this.setState({ edit: true });

  getPopoverTarget = () => findDOMNode(this.aRef.current);

  render() {
    const { attributes, children, editor, node } = this.props;

    const isLinkSelected =
      editor.value.selection.isCollapsed &&
      editor.value.inlines.contains(node as Slate.Inline);

    const dataAttributes = node.data.get('attributes', {});
    const isNoHref = !dataAttributes.href;
    const isShowPopover = isLinkSelected || isNoHref;

    if (this.popoverRef.current) {
      console.log('is active: ' + this.popoverRef.current.contains(document.activeElement));
    }

    return (
      <span style={{ position: 'relative' }}>
        <Overlay container={document.body} target={this.getPopoverTarget}
          placement='top' show={isShowPopover} onEntered={this.onOverlayShown}
        >
          <Popover id='external-link-popover' placement='top' contentEditable={false}>
            <div className={styles.linkPopover} ref={this.popoverRef}>
              {
                this.state.edit
                  ?
                  <FormControl type='text' value={this.state.href}
                    ref={this.inputRef}
                    placeholder='enter link'
                    onChange={e => this.setState({ href: (e.target as any).value })}
                  />
                  :
                  <div className={styles.externalLinkHolder}>
                    <a {...dataAttributes}>
                      {node.text}
                    </a>
                  </div>
              }
              <ButtonGroup>
                {
                  this.state.edit
                    ?
                    <Button onMouseDown={this.onHrefSaved} disabled={this.state.href === ''}>
                      <i className='fa fa-floppy-o' aria-hidden='true'></i>
                    </Button>
                    :
                    <Button onMouseDown={this.onEdit}>
                      <i className='fa fa-pencil' aria-hidden='true'></i>
                    </Button>
                }
                <Button onMouseDown={this.onUnlink}>
                  <i className='fa fa-chain-broken' aria-hidden='true'></i>
                </Button>
              </ButtonGroup>
            </div>
          </Popover>
        </Overlay>
        <a {...attributes} {...dataAttributes}
          className={styles.externalLink} ref={this.aRef} onClick={this.onClick}
        >
          {children}
        </a>
      </span>
    );
  }
}
