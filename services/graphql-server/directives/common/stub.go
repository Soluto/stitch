package common

import (
	"agogos/directives/middlewares"
	"agogos/server"

	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

var stub = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(s server.ServerContext, f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		value := d.Arguments.ForName("value").Value.Raw
		return middlewares.Leaf(func(p graphql.ResolveParams) (interface{}, error) {
			return value, nil
		})
	},
}
