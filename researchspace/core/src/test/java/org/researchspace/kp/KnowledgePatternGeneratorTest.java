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

package org.researchspace.kp;

import static org.mockito.Mockito.doNothing;

import javax.inject.Inject;

import com.metaphacts.junit.AbstractIntegrationTest;
import com.metaphacts.junit.RepositoryRule;

import org.eclipse.rdf4j.model.IRI;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelBuilder;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

public class KnowledgePatternGeneratorTest extends AbstractIntegrationTest {

    @Inject
    public KnowledgePatternGenerator kpGen;

    @Before
    public void setUp() throws Exception {
        IRI graph = SimpleValueFactory.getInstance().createIRI("http://cidoc-crm/graph");
        try (RepositoryConnection con = repositoryRule.getRepository().getConnection()) {
            con.add(KnowledgePatternGeneratorTest.class.getResourceAsStream("Mini_CIDOC_CRM.rdfs"), "", RDFFormat.RDFXML, graph);
        }
    }

    @After
    public void tearDown() throws Exception {
        repositoryRule.delete();
    }


    @Test
    public void testModelBuilder() {
        IRI ontology = SimpleValueFactory.getInstance().createIRI("http://www.cidoc-crm.org/cidoc-crm/");
        kpGen.generateKnowledgePatternsFromOntology(ontology);
    }
}
