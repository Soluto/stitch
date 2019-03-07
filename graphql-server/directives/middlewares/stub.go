package middlewares

import (
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

var stub DirectiveExtension = CreateDirectiveDefintion(
	func(f *ast.FieldDefinition, d *ast.Directive) Middleware {
		value := d.Arguments.ForName("value").Value.Raw
		return Leaf(func(p graphql.ResolveParams) (interface{}, error) {
			return value, nil
		})
	},
	"directive @stub(value: String) on FIELD_DEFINITION",
)
