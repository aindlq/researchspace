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
import * as Kefir from 'kefir';
import { Editor, RenderMarkProps, RenderNodeProps } from 'slate-react';
import * as Slate from 'slate';
import * as React from 'react';
import { Well } from 'react-bootstrap';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Cancellation } from 'platform/api/async';
import { TemplateItem } from 'platform/components/ui/template';
import { DropArea } from 'platform/components/dnd/DropArea';
import { Spinner } from 'platform/components/ui/spinner';

import { MARK, Block, schema, TextAlignment } from './EditorSchema';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import * as styles from './TextEditor.scss';


const initialValue = Slate.Value.fromJSON({
  document: {
    nodes: [
      {
        object: 'block' as 'block',
        type: 'heading_one',
        nodes: [
          {
            object: 'text' as 'text',
            leaves: [{
              object: 'leaf' as 'leaf',
              text: 'Late Hokusai'
            }]
          },
        ]
      },
      {
        object: 'block' as 'block',
        type: 'paragraph',
        nodes: [
          {
            object: 'text',
            leaves: [{
              object: 'leaf' as 'leaf',
              text: "The project combines both scholarly inquiry into a focused set of research questions and the creation of an innovative bilingual online resource for Hokusai research.  Our questions build on the pioneering research of Roger Keyes. The Keyes catalogue raisonné of Hokusai’s prints is now held at the British Museum and is a primary inspiration for the project.  The project will complement their findings on Hokusai’s paintings, drawings, prints, and illustrated books, by situating Hokusai more firmly in his historical and social context, by developing their insights into his technique, and by exploring Hokusai’s thought.  We seek to understand: first, how Hokusai's art was animated by his thought and faith; second, how Hokusai’s mature style synthesized and redefined the diverse artistic vocabularies he had mastered earlier in his career, and how we can combine stylistic and seal analysis to help identify Hokusai’s genuine oeuvre; and finally, how Hokusai’s work was enabled by the networks that linked him to collaborators, pupils, patrons, and the public."
            }]
          },
        ],
      },
      {
        object: 'block' as 'block',
        type: 'paragraph',
        nodes: [
          {
            object: 'text',
            leaves: [{
              object: 'leaf' as 'leaf',
              text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.A line of text in a paragraph.'
            }]
          },
        ],
      },
    ],
  },
});


export interface ResourceTemplateConfig {
  id: string
  // URI of type template could be applied to
  type: string
  // Human-readable description of template
  label: string
  template: string
}

interface TextEditorProps {
  resourceTemplates: Array<ResourceTemplateConfig>
}

interface TextEditorState {
  value: Slate.Value
  anchorBlock?: Slate.Block
  availableTemplates: {[objectIri: string]: ResourceTemplateConfig}
}

export class TextEditor extends React.Component<TextEditorProps, TextEditorState> {
  private editorRef: React.RefObject<Editor>;
  private readonly cancellation = new Cancellation();
  private templateSelection = this.cancellation.derive();

  static defaultProps: TextEditorProps = {
    resourceTemplates: []
  };

  state = {
    value: initialValue,
    anchorBlock: null as Slate.Block,
    availableTemplates: {},
  };

  constructor(props: any) {
    super(props);
    this.editorRef = React.createRef<Editor>();
  }

  onChange = ({ value }: { value: Slate.Value }) => {
    this.setState({ value });
  }

  renderMark = (props: RenderMarkProps, editor: Slate.Editor, next: () => any): any => {
    const { children, mark, attributes } = props;

    switch (mark.type) {
      case MARK.bold: return <strong {...attributes}>{children}</strong>;
      case MARK.italic: return <em {...attributes}>{children}</em>;
      case MARK.underline: return <u {...attributes}>{children}</u>;
      case MARK.strikethrough: return <s {...attributes}>{children}</s>;
      default: return next();
    }
  }

  // + drag and drop
  getTypes = (iri: Rdf.Iri) => {
    return SparqlClient.select(
      `SELECT DISTINCT ?type WHERE { <${iri.value}> a ?type}`
    ).map(
      res => res.results.bindings.map(b => b['type'])
    );
  }

  findTemplatesForResource = (iri: Rdf.Iri) => {
    return this.getTypes(iri).map(
      types => this.props.resourceTemplates.filter(
        c => c.type === 'any' || _.find(types, t => t.value === c.type)
      )
    );
  }

  onResourceDrop = (drop: Rdf.Iri) => {
    const editor = this.editorRef.current;
    editor.setBlocks({ type: Block.resource, data: { resource: drop } });
    this.templateSelection = this.cancellation.deriveAndCancel(this.templateSelection);
    this.templateSelection.map(
      this.findTemplatesForResource(drop)
    ).observe({
      value: configs => {
        const { availableTemplates } = this.state;
        availableTemplates[drop.value] = configs;
        const defaultTemplate = _.first(configs);
        this.setState(
          {availableTemplates},
          () => editor.setBlocks({
            type: Block.resource,
            data: { resource: drop, template:  defaultTemplate.id}
          })
        );
      }
    });
  }

  // - drag and drop

  emptyBlock = (props: RenderNodeProps) => {
    return (
      <div {...props.attributes}>
        <DropArea
          dropMessage='Drop here to add item to the narrative.'
          onDrop={this.onResourceDrop}
        >
          {props.children}
        </DropArea>
      </div>
    );
  }

  resourceBlock = (props: RenderNodeProps) => {
    const config =
      _.find(
        this.props.resourceTemplates, t => t.id === props.node.data.get('template')
      );

    // if there is no config then available templates are still loading
    if (config) {
      return (
        <div {...props.attributes} className={styles.resourceBlock}>
          <TemplateItem template={{
            source: config.template,
            options: { iri: props.node.data.get('resource') }
          }} />
        </div>
      );
    } else {
      return <Well><Spinner /></Well>;
    }
  }

  renderTextBlock = (tag: string, props: RenderNodeProps): any => {
    const alignment = props.node.data.getIn(['style', 'alignment']);
    const style: React.CSSProperties = alignment ? { textAlign: alignment } : {};
    if (alignment === TextAlignment.justify) {
      // we need to have this for "text-align: justify" to work in all browsers.
      // see https://github.com/ianstormtaylor/slate/issues/2359
      style.whiteSpace = 'pre-line';
    }
    return React.createElement(tag, { ...props.attributes, style: style }, props.children);
  }

  renderBlock = (props: RenderNodeProps, editor: Slate.Editor, next: () => any): any => {
    switch (props.node.type) {
      case Block.empty: return this.emptyBlock(props);
      case Block.resource: return this.resourceBlock(props);
      case Block.paragraph: return this.renderTextBlock('p', props);
      case Block.heading_one: return this.renderTextBlock('h1', props);
      case Block.heading_two: return this.renderTextBlock('h2', props);
      case Block.heading_three: return this.renderTextBlock('h3', props);
      case Block.ordered_list: return <ol {...props.attributes}>{props.children}</ol>;
      case Block.unordered_list: return <ul {...props.attributes}>{props.children}</ul>;
      case Block.list_item: return <li {...props.attributes}>{props.children}</li>;
      default:
        return next();
    }
  }

  componentDidUpdate() {
    // when slate Value is rendered we need to find top most block for sidebar positioning

    const { value, anchorBlock } = this.state;
    let topAnchor = value.anchorBlock;
    if (value.anchorBlock?.type === Block.list_item) {
      topAnchor = value.document.getFurthestBlock(value.anchorBlock.key);
    }

    if (anchorBlock !== topAnchor) {
      this.setState({ anchorBlock: topAnchor });
    }
  }

  render() {
    return (
      <div className={styles.narrativeHolder}>
        <div className={styles.toolbarHolder}>
          <Toolbar {...this.state} editor={this.editorRef} />
        </div>
        <div className={styles.sidebarAndEditorHolder}>
          <div className={styles.sidebarContainer}>
            <Sidebar {...this.state} editor={this.editorRef} />
          </div>
          <div className={styles.editorContainer}>
            <Editor
              ref={this.editorRef}
              spellCheck={false}
              value={this.state.value}
              renderMark={this.renderMark}
              renderNode={this.renderBlock}
              schema={schema}
              onChange={this.onChange}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default TextEditor;
