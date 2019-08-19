package common

import (
	"agogos/directives/middlewares"
	"agogos/server"

	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
)

var overrideContext = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(s server.ServerContext, f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		return middlewares.ResultTransform(func(g graphql.ResolveParams, value interface{}) interface{} {
			val := g.Context.Value("override")

			if val == nil {
				return val
			}

			return value
		})
	},
}
