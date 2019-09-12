package utils

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
	builder        *strings.Builder
	fragmentsToAdd []string
	addedFragments map[string]bool
	variables      map[string]string
}

// ResolveParamsToSDLRequest - generates SDL query and variables from graphql.ResolveParams object
func ResolveParamsToSDLRequest(queryName string, rp graphql.ResolveParams, args string) GqlRequestConfig {
	query := sdlQuery{
		builder:        &strings.Builder{},
		addedFragments: make(map[string]bool),
		variables:      make(map[string]string),
	}

	query.builder.WriteString("{\n")
	query.builder.WriteString(queryName)
	query.builder.WriteString(" ")

	buildCustomArgumentsClause(query.builder, rp, args)

	for _, field := range rp.Info.FieldASTs {
		resolveParamsToQueryInner(&query, field, rp)
	}
	query.builder.WriteString("}\n")

	buildFragmentsClause(&query, rp)

	variablesClause := buildVariableClause(&query)

	return GqlRequestConfig{
		Query:          fmt.Sprintf("query%s%s", variablesClause, query.builder.String()),
		VariableValues: getVariableValues(query.variables, rp.Info.VariableValues),
	}

}

func resolveParamsToQueryInner(query *sdlQuery, definition ast.Selection, rp graphql.ResolveParams) {
	selectionSet := definition.GetSelectionSet()

	if selectionSet == nil || len(selectionSet.Selections) == 0 {
		query.builder.WriteString("\n")
		return
	}

	if field, ok := definition.(*ast.Field); ok {
		buildArgumentsClause(query, field, rp)
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
			resolveParamsToQueryInner(query, subField, rp)

		case *ast.FragmentSpread:
			fragmentSpread := selection.(*ast.FragmentSpread)
			query.builder.WriteString(fmt.Sprintf("...%s\n", fragmentSpread.Name.Value))
			if addedToQuery, ok := query.addedFragments[fragmentSpread.Name.Value]; !ok || !addedToQuery {
				query.fragmentsToAdd = append(query.fragmentsToAdd, fragmentSpread.Name.Value)
			}
		default:
			logrus.WithField("selectionType", reflect.TypeOf(selection)).Panic("Unknown selection type")
		}
	}
	query.builder.WriteString("}\n")
}

func buildArgumentsClause(query *sdlQuery, field *ast.Field, rp graphql.ResolveParams) {
	if field.Arguments != nil && len(field.Arguments) > 0 {
		query.builder.WriteString("(")

		for _, arg := range field.Arguments {
			var argumentValue string
			switch arg.Value.GetKind() {
			case "StringValue":
				argumentValue = fmt.Sprintf("\"%s\"", arg.Value.GetValue())
			case "Variable":
				varName := arg.Name.Value
				if _, ok := query.variables[varName]; !ok {
					query.variables[varName] = getVariableType(varName, rp)
				}
				argumentValue = fmt.Sprintf("$%v", arg.Name.Value)
			default:
				argumentValue = fmt.Sprintf("%v", arg.Value.GetValue())
			}
			query.builder.WriteString(fmt.Sprintf("%s:%s", arg.Name.Value, argumentValue))
		}

		query.builder.WriteString(")")
	}
}

func buildCustomArgumentsClause(builder *strings.Builder, rp graphql.ResolveParams, args string) {
	if args == "" {
		return
	}

	builder.WriteString("(")
	values := ReplaceWithParameters(rp, args)
	builder.WriteString(values)
	builder.WriteString(")")
}

func buildFragmentsClause(query *sdlQuery, rp graphql.ResolveParams) {
	for len(query.fragmentsToAdd) > 0 {
		fragmentName := query.fragmentsToAdd[0]
		query.addedFragments[fragmentName] = true
		query.fragmentsToAdd = query.fragmentsToAdd[1:]
		fragment := rp.Info.Fragments[fragmentName].(*ast.FragmentDefinition)

		query.builder.WriteString(fmt.Sprintf("fragment %s on %s", fragmentName, fragment.TypeCondition.Name.Value))
		resolveParamsToQueryInner(query, fragment, rp)
	}
}

func buildVariableClause(query *sdlQuery) string {
	if len(query.variables) == 0 {
		return ""
	}

	builder := strings.Builder{}
	for varName, varType := range query.variables {
		builder.WriteString(fmt.Sprintf("$%s:%s,", varName, varType))
	}
	clause := builder.String()
	clause = clause[:len(clause)-1]
	return fmt.Sprintf("(%s)", clause)
}

func getVariableType(varName string, rp graphql.ResolveParams) string {
	variable := rp.Info.VariableValues[varName]

	switch variable.(type) {
	case int:
		return "Int"
	case string:
		return "String"
	default:
		return reflect.TypeOf(variable).Name()
	}
}

func getVariableValues(variables map[string]string, variableValues map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for varName := range variables {
		result[varName] = variableValues[varName]
	}
	return result
}
