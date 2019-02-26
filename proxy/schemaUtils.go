package main

import (
	"fmt"
	graphql "github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
	"graphql-gateway/directives/middlewares"
)

type context struct {
	schema     *ast.Schema
	objects    map[string]*graphql.Object
	interfaces map[string]*graphql.Interface
	unions     map[string]*graphql.Union
	enums      map[string]*graphql.Enum
}

var errMissingResolver = fmt.Errorf("missing resolver")

func convertOutputType(t *ast.Type, c context) graphql.Type {
	switch name := t.Name(); name {
	case "ID":
		return graphql.ID
	case "String":
		return graphql.String
	case "Int":
		return graphql.Int
	case "Float":
		return graphql.Float
	case "Boolean":
		return graphql.Boolean
	case "Date":
		return graphql.DateTime
	default:
		definition := c.schema.Types[name]

		if definition.Kind == ast.Object {
			return convertSchemaObject(definition, c)
		}
		if definition.Kind == ast.Interface {
			return convertSchemaInterface(definition, c)
		}
		if definition.Kind == ast.Union {
			return convertSchemaUnion(definition, c)
		}
		if definition.Kind == ast.Scalar {
			panic("Custom scalar handling not implemented")
		}
		if definition.Kind == ast.Enum {
			return convertSchemaEnum(definition, c)
		}

		panic("Unreachable code")
	}
}

func createResolver(f *ast.FieldDefinition) func(graphql.ResolveParams) (interface{}, error) {
	var resolver middlewares.Resolver = func(graphql.ResolveParams) (interface{}, error) { return nil, errMissingResolver }

	for _, d := range f.Directives {
		if d.Name == "stub" {
			resolver = (&middlewares.Stub{
				Value: d.Arguments.ForName("value").Value.Raw,
			}).Resolve
		}
	}

	resolver = middlewares.OverrideContext.CreateMiddleware(f).Wrap(resolver)
	resolver = middlewares.Log.CreateMiddleware(f).Wrap(resolver)

	return resolver
}

func convertSchemaField(f *ast.FieldDefinition, c context) *graphql.Field {
	return &graphql.Field{

		Description: f.Description,
		Type:        convertOutputType(f.Type, c),
		Resolve:     createResolver(f),
	}
}

func convertSchemaEnum(d *ast.Definition, c context) *graphql.Enum {
	enum, ok := c.enums[d.Name]

	if ok {
		return enum
	}

	values := make(map[string]*graphql.EnumValueConfig)

	for _, v := range d.EnumValues {
		enumValue := new(graphql.EnumValueConfig)
		enumValue.Value = v.Name
		enumValue.Description = v.Description
		values[v.Name] = enumValue
	}

	enum = graphql.NewEnum(graphql.EnumConfig{Name: d.Name, Values: values, Description: d.Description})

	c.enums[d.Name] = enum

	return enum
}

func convertSchemaUnion(d *ast.Definition, c context) *graphql.Union {
	union, ok := c.unions[d.Name]

	if ok {
		return union
	}

	types := []*graphql.Object{}

	for _, t := range d.Types {
		types = append(types, convertSchemaObject(c.schema.Types[t], c))
	}

	union = graphql.NewUnion(graphql.UnionConfig{Name: d.Name, Types: types, Description: d.Description})

	c.unions[d.Name] = union

	return union
}

func convertSchemaInterface(d *ast.Definition, c context) *graphql.Interface {
	object, ok := c.interfaces[d.Name]

	if ok {
		return object
	}

	fieldsThunk := graphql.FieldsThunk(func() graphql.Fields {
		fields := make(map[string]*graphql.Field)
		for _, field := range d.Fields {
			if field.Name[:2] == "__" {
				continue
			}
			fields[field.Name] = convertSchemaField(field, c)
		}
		return fields
	})

	object = graphql.NewInterface(graphql.InterfaceConfig{Name: d.Name, Fields: fieldsThunk, Description: d.Description})

	c.interfaces[d.Name] = object

	return object
}

func convertSchemaObject(d *ast.Definition, c context) *graphql.Object {
	object, ok := c.objects[d.Name]

	if ok {
		return object
	}

	fieldsThunk := graphql.FieldsThunk(func() graphql.Fields {
		fields := make(map[string]*graphql.Field)
		for _, field := range d.Fields {
			if field.Name[:2] == "__" {
				continue
			}
			fields[field.Name] = convertSchemaField(field, c)
		}
		return fields
	})

	object = graphql.NewObject(graphql.ObjectConfig{Name: d.Name, Fields: fieldsThunk, Description: d.Description})

	c.objects[d.Name] = object

	return object
}

// ConvertSchema converts schema definition to a graphql schema
func ConvertSchema(astSchema *ast.Schema) (schemaPtr *graphql.Schema, err error) {
	defer Recovery(&err)

	schema, err := graphql.NewSchema(graphql.SchemaConfig{
		Query: convertSchemaObject(astSchema.Query, context{
			astSchema,
			make(map[string]*graphql.Object),
			make(map[string]*graphql.Interface),
			make(map[string]*graphql.Union),
			make(map[string]*graphql.Enum),
		}),
	})

	schemaPtr = new(graphql.Schema)
	*schemaPtr = schema

	return
}
