package common

import (
	"github.com/graphql-go/graphql"
	"github.com/vektah/gqlparser/ast"
	"agogos/directives/middlewares"
)

var overrideContext = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(f *ast.FieldDefinition, d *ast.Directive) middlewares.Middleware {
		return middlewares.ResultTransform(func(g graphql.ResolveParams, value interface{}) interface{} {
			val := g.Context.Value("override")

			if val == nil {
				return val
			}

			return value
		})
	},
}
