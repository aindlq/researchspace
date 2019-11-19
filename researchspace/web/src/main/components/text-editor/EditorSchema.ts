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

import * as _ from 'lodash';
import * as Slate from 'slate';

/* Marks */
export const MARK = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strikethrough'
} as const;
export type Mark = keyof typeof MARK;

export const Block = {
  empty: 'empty',
  resource: 'resource',
  paragraph: 'paragraph',
  heading_one: 'heading_one',
  heading_two: 'heading_two',
  heading_three: 'heading_three',
  unordered_list: 'unordered_list',
  ordered_list: 'ordered_list',
  list_item: 'list_item'
} as const;
export type Block = keyof typeof Block;


export const DEFAULT_BLOCK = Block.paragraph;

export const TextAlignment = {
  left: 'left',
  right: 'right',
  center: 'center',
  justify: 'justify'
} as const;
export type TextAlignment = keyof typeof TextAlignment;

export function isTextBlock(block?: Slate.Block): boolean {
  if (block) {
    const { type } = block;
    return type === Block.paragraph ||
      type === Block.heading_one ||
      type === Block.heading_two ||
      type === Block.heading_three;
  } else {
    return false;
  }
}

/// Schema
export const schema = {
  document: {
    nodes: [
      {
        match: _.values(Block).map(block => ({ type: block })),
      },
    ],
  },
  blocks: {
    [Block.resource]: {
      isVoid: true,
    },
    [Block.paragraph]: {
      nodes: [
        {
          match: {
            object: 'text',
            text: (s: string) => s !== '',
          },
        },
      ],
      normalize: (editor: Slate.Editor, error: Slate.SlateError) => {
        switch (error.code) {
          case 'child_text_invalid' as any:
            editor.setNodeByKey(error.node.key, Block.empty)
            return
        }
      }
    },
    [Block.heading_one]: {
      nodes: [{ match: { object: 'text' } }]
    },
    [Block.heading_two]: {
      nodes: [{ match: { object: 'text' } }]
    },
    [Block.heading_three]: {
      nodes: [{ match: { object: 'text' } }]
    },
    [Block.ordered_list]: {
      nodes: [{ match: { type: Block.list_item } }]
    },
    [Block.unordered_list]: {
      nodes: [{ match: { type: Block.list_item } }]
    },
    [Block.empty]: {
      nodes: [
        {
          match: {
            object: 'text',
            text: (s: string) => s === '',
          },
        },
      ],
      normalize: (editor: Slate.Editor, error: Slate.SlateError) => {
        switch (error.code) {
          case 'child_text_invalid' as any:
            editor.setNodeByKey(error.node.key, Block.paragraph)
            return
        }
      }
    },
  },
}
