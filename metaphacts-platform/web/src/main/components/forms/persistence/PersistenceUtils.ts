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

import * as SparqlJs from 'sparqljs';

import { SparqlUtil } from 'platform/api/sparql';

/**
 * Util to parse and cast an queryString to an SparqlJs.Update object.
 * Emits an error otherwise.
 *
 * @param {string | undefined} queryString SPARQL update query.
 */
export function parseQueryStringAsUpdateOperation(
  queryString: string | undefined
): SparqlJs.Update {
  if (!queryString) { return undefined; }
  const query = SparqlUtil.parseQuery(queryString);
  if (query.type === 'update') {
    return query;
  } else {
    throw new Error('Specified deletePattern or insertPattern is not an update query.');
  }
}

/**
 * Add WITH clause to UPDATE query to execute it on specific named graph.
 */
export function withNamedGraph(
  query: SparqlJs.Update, targetGraphIri?: string
): SparqlJs.Update {
  if (targetGraphIri) {
    // graph property on update opertian is missing is SparqlJs d.ts file
    query.updates.forEach(u => u['graph'] = targetGraphIri);
  }
  return query;
}
