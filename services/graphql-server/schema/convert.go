package schema

import (
	"agogos/directives/common"
	"agogos/directives/common/exports"
	"agogos/directives/middlewares"
	"agogos/scalars"
	"agogos/server"
	"agogos/utils"
	"fmt"
	"strings"

	graphql "github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"

	log "github.com/sirupsen/logrus"
)

type schemaContext struct {
	server.ServerContext
	schema     *ast.Schema
	objects    map[string]*graphql.Object
	interfaces map[string]*graphql.Interface
	unions     map[string]*graphql.Union
	enums      map[string]*graphql.Enum
	inputs     map[string]*graphql.InputObject
}

var errMissingResolver = fmt.Errorf("missing resolver")

func convertType(t *ast.Type, c schemaContext) graphql.Type {
	if t.Elem != nil {
		if t.NonNull {
			return graphql.NewNonNull(graphql.NewList(convertType(t.Elem, c)))
		}
		return graphql.NewList(convertType(t.Elem, c))
	} else if t.NonNull {
		return graphql.NewNonNull(convertNamedType(t, c))
	}

	return convertNamedType(t, c)
}

func convertNamedType(t *ast.Type, c schemaContext) graphql.Type {
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
	case "JSON":
		return scalars.JSON
	default:
		definition := c.schema.Types[name]

		if definition.Kind == ast.Object {
			return convertSchemaObject(definition, c)
		}
		if definition.Kind == ast.InputObject {
			return convertSchemaInputObject(definition, c)
		}
		if definition.Kind == ast.Interface {
			return convertSchemaInterface(definition, c)
		}
		if definition.Kind == ast.Union {
			return convertSchemaUnion(definition, c)
		}
		if definition.Kind == ast.Scalar {
			log.Panic("Custom scalar handling not implemented")
		}
		if definition.Kind == ast.Enum {
			return convertSchemaEnum(definition, c)
		}

		log.Panic("Unreachable code")
		return nil
	}
}

func convertFieldArgs(a ast.ArgumentDefinitionList, c schemaContext) (graphql.FieldConfigArgument, error) {
	args := make(map[string]*graphql.ArgumentConfig)

	for _, d := range a {
		defaultValue, err := d.DefaultValue.Value(make(map[string]interface{}))

		if err != nil {
			return nil, err
		}

		args[d.Name] = &graphql.ArgumentConfig{
			DefaultValue: defaultValue,
			Description:  d.Description,
			Type:         convertType(d.Type, c),
		}
	}

	return args, nil
}

func createResolver(f *ast.FieldDefinition, c schemaContext) middlewares.Resolver {
	resolver := fieldIdentityResolver

	for _, d := range f.Directives {
		middlewareDefinition, ok := common.MiddlewareDefinitions[d.Name]

		if !ok {
			continue
		}

		middleware := middlewareDefinition.CreateMiddleware(c, f, d)

		resolver = middleware.Wrap(resolver)
	}

	return exports.WrapperMiddleware.Wrap(resolver)
}

func fieldIdentityResolver(rp graphql.ResolveParams) (interface{}, error) {
	fieldName := rp.Info.FieldName
	return utils.IdentityResolver(fieldName, rp.Source)
}

func convertSchemaField(f *ast.FieldDefinition, c schemaContext) (*graphql.Field, error) {
	args, err := convertFieldArgs(f.Arguments, c)

	if err != nil {
		return nil, err
	}

	return &graphql.Field{
		Description: f.Description,
		Type:        convertType(f.Type, c),
		Resolve:     createResolver(f, c),
		Args:        args,
	}, nil
}

func convertSchemaEnum(d *ast.Definition, c schemaContext) *graphql.Enum {
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

func convertSchemaInputObject(d *ast.Definition, c schemaContext) *graphql.InputObject {
	object, ok := c.inputs[d.Name]

	if ok {
		return object
	}

	fieldsThunk := graphql.InputObjectConfigFieldMapThunk(func() graphql.InputObjectConfigFieldMap {
		fields := make(map[string]*graphql.InputObjectFieldConfig)
		for _, field := range d.Fields {
			if field.Name[:2] == "__" {
				continue
			}

			fields[field.Name] = convertSchemaInputField(field, c)
		}
		return fields
	})

	object = graphql.NewInputObject(graphql.InputObjectConfig{Name: d.Name, Fields: fieldsThunk, Description: d.Description})

	c.inputs[d.Name] = object

	return object
}

func convertSchemaInputField(f *ast.FieldDefinition, c schemaContext) *graphql.InputObjectFieldConfig {
	return &graphql.InputObjectFieldConfig{
		Description: f.Description,
		Type:        convertType(f.Type, c),
	}
}

func convertSchemaUnion(d *ast.Definition, c schemaContext) *graphql.Union {
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

func convertSchemaInterface(d *ast.Definition, c schemaContext) *graphql.Interface {
	object, ok := c.interfaces[d.Name]

	if ok {
		return object
	}

	fieldsThunk := graphql.FieldsThunk(func() graphql.Fields {
		fields := make(map[string]*graphql.Field)
		for _, field := range d.Fields {
			if strings.HasPrefix(field.Name, "__") {
				continue
			}

			schemaField, err := convertSchemaField(field, c)
			if err != nil {
				log.Panic(err)
			}

			fields[field.Name] = schemaField
		}
		return fields
	})

	object = graphql.NewInterface(graphql.InterfaceConfig{Name: d.Name, Fields: fieldsThunk, Description: d.Description})

	c.interfaces[d.Name] = object

	return object
}

func convertSchemaObject(d *ast.Definition, c schemaContext) *graphql.Object {
	if d == nil {
		return nil
	}

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

			schemaField, err := convertSchemaField(field, c)
			if err != nil {
				log.Panic(err)
			}

			fields[field.Name] = schemaField
		}
		return fields
	})

	object = graphql.NewObject(graphql.ObjectConfig{Name: d.Name, Fields: fieldsThunk, Description: d.Description})

	c.objects[d.Name] = object

	return object
}

// ConvertSchema converts schema definition to a graphql schema
func convertSchema(serverContext server.ServerContext, astSchema *ast.Schema) (schemaPtr *graphql.Schema, err error) {
	defer utils.Recovery(&err)

	schemaCtx := schemaContext{
		serverContext,
		astSchema,
		make(map[string]*graphql.Object),
		make(map[string]*graphql.Interface),
		make(map[string]*graphql.Union),
		make(map[string]*graphql.Enum),
		make(map[string]*graphql.InputObject),
	}

	schema, err := graphql.NewSchema(graphql.SchemaConfig{
		Query:    convertSchemaObject(astSchema.Query, schemaCtx),
		Mutation: convertSchemaObject(astSchema.Mutation, schemaCtx),
	})

	schemaPtr = new(graphql.Schema)
	*schemaPtr = schema

	return
}
