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


import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.GET;

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.github.jknack.handlebars.Options;
import com.metaphacts.cache.LabelCache;
import com.metaphacts.data.json.JsonUtil;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.services.fields.FieldDefinition;
import com.metaphacts.services.fields.FieldDefinitionManager;
import com.metaphacts.services.fields.FieldsBasedSearch;
import com.metaphacts.templates.TemplateContext;

/**
 * @author Artem Kozlov <artem@rem.sh>
 */
@Singleton
@Path("kp")
public class KnowledgePatternsEndpoint {

    @Inject
    private KnowledgePatternGenerator pg;

    @Inject
    private KnowledgeMapConfigGenerator cg;

    @Inject
    private FieldDefinitionManager fieldDefinitionManager;

    @Inject
    private RepositoryManager repositoryManager;

    @Inject
    private LabelCache labelCache;

    
    @GET
    public Response test() {
        return Response.ok("it works").build();
    }

    @POST
    @Path("/generateKps")
    public Response generateKps(@QueryParam("ontologyIri") IRI ontologyIri) {
        pg.generateKnowledgePatternsFromOntology(ontologyIri);
        return Response.ok().build();
    }

    @GET
    @Path("/generateKmConfig")
    public Response generateKmConfig() {
    	cg.generateKmConfig();
        return Response.ok().build();
    }

    @GET
    @Path("/getAllKps")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllKps() {
    	 Map<IRI, FieldDefinition> fields = fieldDefinitionManager.queryAllFieldDefinitions();

        Map<String, Object> jsonDefinitions = new HashMap<String, Object>();
        for (Map.Entry<IRI, FieldDefinition> entry : fields.entrySet()) {
            FieldDefinition field = entry.getValue();
            Map<String, Object> json = fieldDefinitionManager.jsonFromField(field);
            json.put("id", entry.getKey().stringValue());
            String fieldLabel = this.getFieldDefinitionLabel(field.getIri().stringValue());
            json.put("label", fieldLabel);
            jsonDefinitions.put(field.getIri().stringValue(), json);
        }
    	
    	return Response.ok().entity(jsonDefinitions).build();
    }
    
    private String getFieldDefinitionLabel(String fieldIriValue) {
        ValueFactory vf = SimpleValueFactory.getInstance();
        IRI fieldIri = vf.createIRI(fieldIriValue);

        Optional<Literal> label = labelCache.getLabel(
            fieldIri, repositoryManager.getAssetRepository(), null
        );
        return LabelCache.resolveLabelWithFallback(label, fieldIri);
    }

}
