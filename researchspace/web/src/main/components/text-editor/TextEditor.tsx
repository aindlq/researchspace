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
import Html from 'slate-html-serializer';
import * as React from 'react';
import { Well, Button } from 'react-bootstrap';
import { html_beautify } from 'js-beautify';

import { Rdf } from 'platform/api/rdf';
import * as http from 'platform/api/http';

import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Cancellation, requestAsProperty } from 'platform/api/async';
import { FileManager } from 'platform/api/services/file-manager';

import { Component } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { DropArea } from 'platform/components/dnd/DropArea';
import { Spinner } from 'platform/components/ui/spinner';

import { MARK, Block, schema, TextAlignment } from './EditorSchema';
import { SLATE_RULES } from './Serializer';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import * as styles from './TextEditor.scss';

export interface ResourceTemplateConfig {
  id: string
  // URI of type template could be applied to
  type: string
  // Human-readable description of template
  label: string
  template: string
}

interface TextEditorProps {
  /**
   * Text document IRI to load.
   */
  documentIri?: string;

  /**
   * ID of the <semantic-link iri='http://help.metaphacts.com/resource/Storage'>
   * storage</semantic-link> to load text document content.
   */
  storage: string;

  resourceTemplates: Array<ResourceTemplateConfig>

  /* file upload config */
  /**
   * SPARQL select query to generate a unique IRI for the file to be uploaded.
   * The must have exactly one projection variable *?newId* with the IRI.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * __contextUri__ - see `contextUri` property
   * * __mediaType__ - Medai type: jpg, pdf. By default = 'auto'xw
   * * __fileName__ - Name of the file
   */
  generateIriQuery?: string

  /**
   * SPARQL construct query to generate additional meta-data which will be stored toghether with the file meta-data.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * __contextUri__ - see `contextUri` property
   * * __resourceIri__ - IRI generated with `generateIdQuery`
   * * __mediaType__ - Medai type: jpg, pdf. By default = 'auto'
   * * __fileName__ - Name of the file
   */
  resourceQuery?: string

}

interface TextEditorState {
  value: Slate.Value
  anchorBlock?: Slate.Block
  availableTemplates: { [objectIri: string]: ResourceTemplateConfig }
  loading: boolean
}

export class TextEditor extends Component<TextEditorProps, TextEditorState> {
  private editorRef: React.RefObject<Editor>;
  private readonly cancellation = new Cancellation();
  private templateSelection = this.cancellation.derive();

  static defaultProps: Partial<TextEditorProps> = {
    resourceTemplates: [],
    storage: 'runtime',
    resourceQuery: `
      PREFIX mp: <http://www.metaphacts.com/ontologies/platform#>
      PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
      PREFIX crmdig: <http://www.ics.forth.gr/isl/CRMdig/>
      PREFIX rso: <http://www.researchspace.org/ontology/>

      CONSTRUCT {
        ?__resourceIri__ a crm:E33_Linguistic_Object,
                crmdig:D1_Digital_Object,
                rso:Semantic_Narrative.

        ?__resourceIri__ mp:fileName ?__fileName__.
        ?__resourceIri__ mp:mediaType "text/html".
      } WHERE {}
    `,
    generateIriQuery: `
      SELECT ?resourceIri WHERE {
        BIND(URI(CONCAT(STR(?__contextUri__), "/", ?__fileName__)) as ?resourceIri)
      }
    `
  };

  state = {
    value: Slate.Value.fromJS({}),
    anchorBlock: null as Slate.Block,
    availableTemplates: {},
    loading: true,
  };

  constructor(props: TextEditorProps, context) {
    super(props, context);
    this.editorRef = React.createRef<Editor>();
    this.state.loading = !!props.documentIri;
  }

  onChange = ({ value }: { value: Slate.Value }) => {
    this.setState({ value });
  }

  renderMark = (props: RenderMarkProps, editor: Slate.Editor, next: () => any): any => {
    const { children, mark, attributes } = props;

    switch (mark.type) {
      case MARK.strong: return <strong {...attributes}>{children}</strong>;
      case MARK.em: return <em {...attributes}>{children}</em>;
      case MARK.u: return <u {...attributes}>{children}</u>;
      case MARK.s: return <s {...attributes}>{children}</s>;
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
    editor.setBlocks({ type: Block.embed, data: { attributes: { src: drop.value } } });
    this.templateSelection = this.cancellation.deriveAndCancel(this.templateSelection);
    this.templateSelection.map(
      this.findTemplatesForResource(drop)
    ).observe({
      value: configs => {
        const { availableTemplates } = this.state;
        availableTemplates[drop.value] = configs;
        const defaultTemplate = _.first(configs);
        this.setState(
          { availableTemplates },
          () => editor.setBlocks({
            type: Block.embed,
            data: {
              attributes: {
                src: drop.value, type: 'researchspace/resource', template: defaultTemplate.id
              }
            }
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

  embedBlock = (props: RenderNodeProps) => {
    const attributes = props.node.data.get('attributes');
    const config =
      _.find(
        this.props.resourceTemplates, t => t.id === attributes.template
      );

    // if there is no config then available templates are still loading
    if (config) {
      return (
        <div {...props.attributes} className={styles.resourceBlock}>
          <TemplateItem template={{
            source: config.template,
            options: { iri: Rdf.iri(attributes.src) }
          }} />
        </div>
      );
    } else {
      return <Well><Spinner /></Well>;
    }
  }

  renderTextBlock = (tag: string, props: RenderNodeProps): any => {
    const attributes = props.node.data.get('attributes', {});
    return React.createElement(tag, { ...props.attributes, ...attributes }, props.children);
  }

  renderBlock = (props: RenderNodeProps, editor: Slate.Editor, next: () => any): any => {
    console.log('rendering block' + props.node.type)
    switch (props.node.type) {
      case Block.title: return this.renderTextBlock('h1', props);
      case Block.empty: return this.emptyBlock(props);
      case Block.embed: return this.embedBlock(props);
      case Block.p: return this.renderTextBlock('p', props);
      case Block.h1: return this.renderTextBlock('h1', props);
      case Block.h2: return this.renderTextBlock('h2', props);
      case Block.h3: return this.renderTextBlock('h3', props);
      case Block.ol: return <ol {...props.attributes}>{props.children}</ol>;
      case Block.ul: return <ul {...props.attributes}>{props.children}</ul>;
      case Block.li: return <li {...props.attributes}>{props.children}</li>;
      default:
        return next();
    }
  }

  private onKeyDown = (event: Event, editor: Slate.Editor, next: () => void) => {
    next();
    /* if (Hotkeys.isSplitBlock(event) && !IS_IOS) {
     *   return hasVoidParent
     *        ? editor.moveToStartOfNextText()
     *        : editor.splitBlock()
     * } */
  }

  componentDidMount() {
    if (this.props.documentIri) {
      const documentIri = Rdf.iri(this.props.documentIri);
      this.cancellation.map(
        this.fetchDocument(documentIri)
      ).observe({
        value: document => {
          const html = new Html({ rules: SLATE_RULES });
          this.setState({value: html.deserialize(document), loading: false});
        },
        error: error => console.error(error)
      });
    }
  }

  componentDidUpdate() {
    // when slate Value is rendered we need to find top most block for sidebar positioning

    const { value, anchorBlock } = this.state;
    let topAnchor = value.anchorBlock;
    if (value.anchorBlock?.type === Block.li) {
      topAnchor = value.document.getFurthestBlock(value.anchorBlock.key);
    }

    if (anchorBlock !== topAnchor) {
      this.setState({ anchorBlock: topAnchor });
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    if (this.state.loading) {
      return <Spinner spinnerDelay={0} />;
    } else {
      return (
        <div className={styles.narrativeHolder}>
          <div className={styles.toolbarHolder}>
            <Toolbar
              {...this.state} editor={this.editorRef} onDocumentSave={this.onDocumentSave}
            />
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
                onKeyDown={this.onKeyDown}
                schema={schema}
                onChange={this.onChange}
              />
            </div>
          </div>
        </div>
      );
    }
  }

  private getFileManager(): FileManager {
    const { repository } = this.context.semanticContext;
    return new FileManager({ repository });
  }

  private fetchDocument(documentIri: Rdf.Iri): Kefir.Property<string> {
    return this.getFileManager().getFileResource(documentIri)
      .flatMap(resource => {
        const fileUrl = FileManager.getFileUrl(resource.fileName, this.props.storage);
        return requestAsProperty(
          http.get(fileUrl)
            .accept('text/html')
        );
      })
      .map(response => response.text)
      .toProperty();
  }

  private onDocumentSave = () => {
    const html = new Html({ rules: SLATE_RULES });
    const content =
      html_beautify(
        html.serialize(this.state.value)
      );

    const blob = new Blob([content]);
    const file = new File([blob], 'sample_narrative.html');

    this.cancellation.map(
      this.getFileManager().uploadFileAsResource({
        file,
        storage: this.props.storage,
        generateIriQuery: this.props.generateIriQuery,
        resourceQuery: this.props.resourceQuery,
        contextUri: 'http://www.researchspace.org/instances/narratives',
      })
    ).observe({
      value: resource => { console.log('saved'); console.log(resource) },
      error: error => { console.log('error'); console.log(error) },
    });
  }
}

export default TextEditor;