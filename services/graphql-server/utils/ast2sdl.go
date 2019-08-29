package utils

import (
	"fmt"
	"strings"

	"github.com/graphql-go/graphql"
	"github.com/graphql-go/graphql/language/ast"
)

// ResolveParamsToSDLQuery - generates SDL query from graphql.ResolveParams object
func ResolveParamsToSDLQuery(queryName string, rp graphql.ResolveParams) string {
	builder := strings.Builder{}

	builder.WriteString("query {\n")
	builder.WriteString(queryName)
	builder.WriteString(" ")
	for _, field := range rp.Info.FieldASTs {
		resolveParamsToQueryInner(&builder, field)
	}
	builder.WriteString("}\n")

	return builder.String()
}

func resolveParamsToQueryInner(builder *strings.Builder, field *ast.Field) {
	if field.SelectionSet == nil || len(field.SelectionSet.Selections) == 0 {
		builder.WriteString("\n")
		return
	}

	buildArgumentsClause(builder, field)

	builder.WriteString("{\n")
	for _, selection := range field.SelectionSet.Selections {
		if subField, ok := selection.(*ast.Field); ok {
			if subField.Alias != nil {
				builder.WriteString(subField.Alias.Value)
				builder.WriteString(": ")
			}

			builder.WriteString(subField.Name.Value)

			buildArgumentsClause(builder, subField)
			resolveParamsToQueryInner(builder, subField)
		}
	}
	builder.WriteString("}\n")
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
