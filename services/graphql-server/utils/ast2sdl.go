package utils

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/graphql-go/graphql"
	"github.com/graphql-go/graphql/language/ast"
	"github.com/sirupsen/logrus"
)

type sdlQuery struct {
	builder        *strings.Builder
	fragmentsToAdd []string
	addedFragments map[string]bool
}

// ResolveParamsToSDLQuery - generates SDL query from graphql.ResolveParams object
func ResolveParamsToSDLQuery(queryName string, rp graphql.ResolveParams, args string) string {
	query := sdlQuery{
		builder:        &strings.Builder{},
		addedFragments: make(map[string]bool),
	}

	query.builder.WriteString("query {\n")
	query.builder.WriteString(queryName)
	query.builder.WriteString(" ")

	buildCustomArgumentsClause(query.builder, rp, args)

	for _, field := range rp.Info.FieldASTs {
		resolveParamsToQueryInner(&query, field)
	}
	query.builder.WriteString("}\n")

	buildFragmentsClause(&query, rp)

	return query.builder.String()
}

func resolveParamsToQueryInner(query *sdlQuery, definition ast.Selection) {
	selectionSet := definition.GetSelectionSet()

	if selectionSet == nil || len(selectionSet.Selections) == 0 {
		query.builder.WriteString("\n")
		return
	}

	if field, ok := definition.(*ast.Field); ok {
		buildArgumentsClause(query.builder, field)
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
			resolveParamsToQueryInner(query, subField)

		case *ast.FragmentSpread:
			fragmentSpread := selection.(*ast.FragmentSpread)
			query.builder.WriteString("...")
			query.builder.WriteString(fragmentSpread.Name.Value)
			query.builder.WriteString("\n")
			if addedToQuery, ok := query.addedFragments[fragmentSpread.Name.Value]; !ok || !addedToQuery {
				query.fragmentsToAdd = append(query.fragmentsToAdd, fragmentSpread.Name.Value)
			}
		default:
			logrus.WithField("selectionType", reflect.TypeOf(selection)).Panic("Unknown selection type")
		}
	}
	query.builder.WriteString("}\n")
}

func buildArgumentsClause(builder *strings.Builder, field *ast.Field) {
	if field.Arguments != nil && len(field.Arguments) > 0 {
		builder.WriteString("(")

		for _, arg := range field.Arguments {
			builder.WriteString(arg.Name.Value)
			builder.WriteString(": ")
			switch arg.Value.GetKind() {
			case "StringValue":
				builder.WriteString(fmt.Sprintf("\"%s\"", arg.Value.GetValue()))
			default:
				builder.WriteString(fmt.Sprintf("%v", arg.Value.GetValue()))
			}

		}

		builder.WriteString(")")
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

		query.builder.WriteString("fragment ")
		query.builder.WriteString(fragmentName)
		query.builder.WriteString(" on ")
		query.builder.WriteString(fragment.TypeCondition.Name.Value)
		resolveParamsToQueryInner(query, fragment)
	}
}
