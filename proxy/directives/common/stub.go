package common

import (
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
	"graphql-gateway/directives/middlewares"
)

var stub = middlewares.DirectiveDefinition{
	MiddlewareFactrory: func(f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		value := d.Arguments.ForName("value").Value.Raw
		return middlewares.Leaf(func(p graphql.ResolveParams) (interface{}, error) {
			return value, nil
		})
	},
}
