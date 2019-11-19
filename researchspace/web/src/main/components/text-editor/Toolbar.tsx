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
import { ButtonToolbar, ButtonGroup, Button, MenuItem, Dropdown } from 'react-bootstrap';
import * as Slate from 'slate';
import { Editor } from 'slate-react';

import { Block, MARK, Mark, DEFAULT_BLOCK, TextAlignment, isTextBlock } from './EditorSchema';
import * as styles from './TextEditor.scss';

const BLOCK_TO_ICON: { [block in Block]: string } = {
  [Block.empty]: 'fa-plus',
  [Block.resource]: 'fa-file-code-o',
  [Block.paragraph]: 'fa-paragraph',
  [Block.heading_one]: 'fa-header',
  [Block.heading_two]: 'fa-header',
  [Block.heading_three]: 'fa-header',
  [Block.ordered_list]: 'fa-list-ol',
  [Block.unordered_list]: 'fa-list-ul',
  [Block.list_item]: 'fa-list'
};

const BLOCK_TO_LABEL: { [block in Block]: string } = {
  [Block.empty]: 'Placeholder',
  [Block.resource]: 'Resource',
  [Block.paragraph]: 'Paragraph',
  [Block.heading_one]: 'Heading 1',
  [Block.heading_two]: 'Heading 2',
  [Block.heading_three]: 'Heading 3',
  [Block.ordered_list]: 'Numbered List',
  [Block.unordered_list]: 'Bulleted List',
  [Block.list_item]: 'List Item'
};

const TEXT_ALIGNMENT_TO_ICON: { [alignment in TextAlignment]: string } = {
  [TextAlignment.left]: 'fa-align-left',
  [TextAlignment.right]: 'fa-align-right',
  [TextAlignment.center]: 'fa-align-center',
  [TextAlignment.justify]: 'fa-align-justify',
};


export interface ToolbarProps {
  value: Slate.Value;
  editor: React.RefObject<Editor>;
  anchorBlock: Slate.Block
}

export class Toolbar extends React.Component<ToolbarProps> {

  onMarkClick = (event: React.MouseEvent<Button>, markType: Mark) => {
    event.preventDefault();

    this.props.editor.current.toggleMark(markType);
  }

  markButton = (markType: Mark, icon: string) => {
    const isActive = this.hasMark(markType);
    const className = `fa ${icon}`;
    return <Button active={isActive} onMouseDown={event => this.onMarkClick(event, markType)}>
      <i className={className} aria-hidden={true}></i>
    </Button>;
  }

  hasMark = (markType: Mark): boolean => {
    const { value } = this.props;
    return value.activeMarks.some(mark => mark.type === markType);
  }

  alignTextButton = (alignment: TextAlignment) => {
    const isActive = this.hasAlignment(alignment);
    const className = `fa ${TEXT_ALIGNMENT_TO_ICON[alignment]}`;
    return <Button active={isActive} onMouseDown={event => this.onAlignClick(event, alignment)}>
      <i className={className} aria-hidden={true}></i>
    </Button>;
  }

  onAlignClick = (event: React.MouseEvent<Button>, alignment: TextAlignment) => {
    event.preventDefault();

    const { editor, anchorBlock } = this.props;
    const modifiedBlock = anchorBlock.setIn(['data', 'style', 'alignment'], alignment);
    // assume that default alignment is left
    editor.current.setBlocks(modifiedBlock);
  }

  hasAlignment = (alignment: TextAlignment): boolean => {
    const { anchorBlock } = this.props;
    return anchorBlock.data.getIn(['style', 'alignment']) === alignment;
  }

  render() {
    return (
      <div className={styles.toolbar}>
        <div className={styles.toolbarBlock}>
          <BlockDropdown {...this.props} sidebar={false} />
        </div>

        {isTextBlock(this.props.anchorBlock) ?
          <div className={styles.toolbarBlock}>
            <ButtonToolbar>
              <ButtonGroup>
                {this.markButton(MARK.bold, 'fa-bold')}
                {this.markButton(MARK.italic, 'fa-italic')}
                {this.markButton(MARK.underline, 'fa-underline')}
                {this.markButton(MARK.strikethrough, 'fa-strikethrough')}
              </ButtonGroup>

              <ButtonGroup>
                {this.alignTextButton(TextAlignment.left)}
                {this.alignTextButton(TextAlignment.center)}
                {this.alignTextButton(TextAlignment.right)}
                {this.alignTextButton(TextAlignment.justify)}
              </ButtonGroup>
            </ButtonToolbar>
          </div> : null
        }
      </div>
    );
  }
}


export interface BlockDropdownProps {
  value: Slate.Value;
  editor: React.RefObject<Editor>;
  sidebar: boolean;
  anchorBlock: Slate.Block;
}

export class BlockDropdown extends React.Component<BlockDropdownProps> {

  hasBlock = (type: Block) => {
    return this.props.value.blocks.some(node => node.type === type);
  }

  onBlockButtonClick = (blockType: Block, event: any) => {
    event.preventDefault();

    const { editor, value, anchorBlock } = this.props;

    // we need do handle list blocks separately
    if (blockType === Block.ordered_list || blockType === Block.unordered_list) {
      const isList = this.hasBlock(Block.list_item);
      const isTheSameType = anchorBlock.type === blockType;

      if (isList && isTheSameType) {
        // if current block is list and button of the same time is clicked,
        // we change type of the current block to default one
        editor.current
          .moveToRangeOfNode(anchorBlock)
          .unwrapBlock(blockType)
          .setBlocks(DEFAULT_BLOCK);
      } else if (isList) {
        // if current block is list, but was click button with different kind of list,
        // we change to that list
        editor.current
          .moveToRangeOfNode(anchorBlock)
          .unwrapBlock(anchorBlock.type)
          .wrapBlock(blockType);

      } else {
        // or we just set current block to list
        editor.current.setBlocks(Block.list_item).wrapBlock(blockType);
      }
    } else {
      const isList = this.hasBlock(Block.list_item);
      const isActive = this.hasBlock(blockType);

      if (isList) {
        // if current block is list we first need to unwrap it before changing to the new type
        editor.current
          .moveToRangeOfNode(anchorBlock)
          .unwrapBlock(anchorBlock.type)
          .setBlocks(isActive ? DEFAULT_BLOCK : blockType);
      } else {
        // if it is not list then just toggle the block type
        editor.current.setBlocks(isActive ? DEFAULT_BLOCK : blockType);
      }
    }

    // editor.current.select(value.selection).focus();
  }

  actionButton = (blockType: Block) => {
    const isActive = this.props.anchorBlock?.type === blockType;
    return (
      <MenuItem eventKey={blockType} active={isActive}
        onSelect={this.onBlockButtonClick as any}>

        {this.actionDescription(blockType)}
      </MenuItem>
    );
  }

  actionDescription = (blockType: Block) => {
    return (
      <span className={styles.dropdownMenuItem}>
        {this.actionIcon(blockType)}
        <span>{BLOCK_TO_LABEL[blockType]}</span>
      </span>
    );
  }

  actionIcon(blockType: Block) {
    const iconClassName = `fa ${BLOCK_TO_ICON[blockType]}`;

    // for heading blocks we add heading number to the default icon
    const prefix =
      blockType === Block.heading_one ? '1' :
        blockType === Block.heading_two ? '2' :
          blockType === Block.heading_three ? '3' : '';

    return (
      <span className={styles.dropdownMenuItemIcon}>
        <i className={iconClassName} aria-hidden='true'></i>{prefix}
      </span>
    );
  }


  render() {
    const { sidebar, anchorBlock } = this.props;
    const block = anchorBlock ? anchorBlock.type as Block : Block.empty;

    return (
      <Dropdown id='blocks' pullRight={true}>
        <Dropdown.Toggle>
          {sidebar ? this.actionIcon(block) : this.actionDescription(block)}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {this.actionButton(Block.paragraph)}
          <MenuItem divider />
          {this.actionButton(Block.heading_one)}
          {this.actionButton(Block.heading_two)}
          {this.actionButton(Block.heading_three)}
          <MenuItem divider />
          {this.actionButton(Block.ordered_list)}
          {this.actionButton(Block.unordered_list)}
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}

export interface ResourceTemplateDropdownProps {
  options: any
}


export type ActionDropdownProps =
  { type: 'block', props: BlockDropdownProps } |
  { type: 'resource', props: ResourceTemplateDropdownProps };

export class ActionDropdown extends React.PureComponent<ActionDropdownProps> {
  render() {
    switch (this.props.type) {
      case 'block': return <BlockDropdown {...this.props.props} />;
      case 'resource': return null;
    }
  }
}
