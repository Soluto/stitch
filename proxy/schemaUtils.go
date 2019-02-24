package main

import (
	"fmt"
	graphql "github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
	"graphql-gateway/directives/middlewares"
)

var MISSING_RESOLVER_ERROR error = fmt.Errorf("missing resolver")

func ConvertType(t *ast.Type) graphql.Type {
	switch name := t.Name(); name {
	case "String":
		return graphql.String
	default:
		return nil
	}
}

func CreateResolver(f *ast.FieldDefinition) func(graphql.ResolveParams) (interface{}, error) {
	resolver := func(graphql.ResolveParams) (interface{}, error) { return nil, MISSING_RESOLVER_ERROR }

	for _, d := range f.Directives {
		if d.Name == "stub" {
			resolver = (&middlewares.Stub{
				Value: d.Arguments.ForName("value").Value.Raw,
			}).Wrap(resolver)
		}
	}

	resolver = (&middlewares.OverrideContext{}).Wrap(resolver)
	resolver = (&middlewares.PreProcessingMiddleware(&middlewares.Log{})).Wrap(resolver)

	return resolver
}

func ConvertSchemaField(f *ast.FieldDefinition) *graphql.Field {
	return &graphql.Field{

		Description: f.Description,
		Type:        ConvertType(f.Type),
		Resolve:     CreateResolver(f),
	}
}

func ConvertSchemaObject(d *ast.Definition) *graphql.Object {
	fields := make(map[string]*graphql.Field)
	for _, field := range d.Fields {
		if field.Name[:2] == "__" {
			continue
		}
		fields[field.Name] = ConvertSchemaField(field)
	}
	return graphql.NewObject(graphql.ObjectConfig{Name: d.Name, Fields: graphql.Fields(fields)})
}

func ConvertSchema(schema *ast.Schema) (*graphql.Schema, error) {
	es, err := graphql.NewSchema(graphql.SchemaConfig{
		Query: ConvertSchemaObject(schema.Query),
	})
	return &es, err
}
