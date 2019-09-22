package ast2sdl

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/graphql-go/graphql"
	"github.com/graphql-go/graphql/language/ast"
	"github.com/sirupsen/logrus"
)

// GqlRequestConfig - type to store all data for gql request
type GqlRequestConfig struct {
	Query          string
	VariableValues map[string]interface{}
}

type sdlQuery struct {
	builder         *strings.Builder
	fragmentClause  fragmentClause
	variablesClause variablesClause
}

// BuildSDLQuery - generates SDL query and variables from graphql.ResolveParams object
func BuildSDLQuery(queryName string, rp graphql.ResolveParams, args string) GqlRequestConfig {
	query := sdlQuery{
		builder:         &strings.Builder{},
		fragmentClause:  makeFragmentClause(),
		variablesClause: makeVariablesClause(),
	}

	query.builder.WriteString("{\n")
	query.builder.WriteString(queryName)
	query.builder.WriteString(" ")

	if args != "" {
		query.builder.WriteString(fmt.Sprintf("(%s)", args))
	}

	for _, field := range rp.Info.FieldASTs {
		writeFieldsClause(&query, field, rp)
	}
	query.builder.WriteString("}\n")

	writeFragmentsClause(&query, rp)

	return GqlRequestConfig{
		Query:          fmt.Sprintf("query%s%s", query.variablesClause.String(), query.builder.String()),
		VariableValues: query.variablesClause.Values(rp),
	}

}

// writeFieldsClause - recursive method that walks over fields and fields of fields and builds query
func writeFieldsClause(query *sdlQuery, definition ast.Selection, rp graphql.ResolveParams) {
	selectionSet := definition.GetSelectionSet()

	if selectionSet == nil || len(selectionSet.Selections) == 0 {
		query.builder.WriteString("\n")
		return
	}

	if field, ok := definition.(*ast.Field); ok {
		writeArgumentsClause(query, field, rp)
	}

	query.builder.WriteString("{\n")
	for _, selection := range selectionSet.Selections {
		// TODO: filter out fields with own resolvers

		switch selection.(type) {
		case *ast.Field:
			subField := selection.(*ast.Field)
			if subField.Alias != nil {
				query.builder.WriteString(subField.Alias.Value)
				query.builder.WriteString(": ")
			}

			query.builder.WriteString(subField.Name.Value)
			writeFieldsClause(query, subField, rp)

		case *ast.FragmentSpread:
			fragmentSpread := selection.(*ast.FragmentSpread)
			query.builder.WriteString(fmt.Sprintf("...%s\n", fragmentSpread.Name.Value))
			query.fragmentClause.PushFragmentIfNotExists(fragmentSpread.Name.Value)

		default:
			logrus.WithField("selectionType", reflect.TypeOf(selection)).Panic("Unknown selection type")
		}
	}
	query.builder.WriteString("}\n")
}

// buildArgumentsClause - builds arguments clause for fields with arguments
func writeArgumentsClause(query *sdlQuery, field *ast.Field, rp graphql.ResolveParams) {
	if field.Arguments != nil && len(field.Arguments) > 0 {
		query.builder.WriteString("(")

		for _, arg := range field.Arguments {
			var argumentValue string
			switch arg.Value.GetKind() {
			case "StringValue":
				argumentValue = fmt.Sprintf("\"%s\"", arg.Value.GetValue())
			case "Variable":
				query.variablesClause.Add(arg.Name.Value, rp)
				argumentValue = fmt.Sprintf("$%v", arg.Name.Value)
			default:
				argumentValue = fmt.Sprintf("%v", arg.Value.GetValue())
			}
			query.builder.WriteString(fmt.Sprintf("%s:%s", arg.Name.Value, argumentValue))
		}

		query.builder.WriteString(")")
	}
}

// buildFragmentsClause adds fragment definitions to query if needed
func writeFragmentsClause(query *sdlQuery, rp graphql.ResolveParams) {
	for {
		fragmentName, ok := query.fragmentClause.PopFragment()
		if !ok {
			break
		}
		fragment := rp.Info.Fragments[fragmentName].(*ast.FragmentDefinition)
		query.builder.WriteString(fmt.Sprintf("fragment %s on %s", fragmentName, fragment.TypeCondition.Name.Value))
		writeFieldsClause(query, fragment, rp)
	}
}
