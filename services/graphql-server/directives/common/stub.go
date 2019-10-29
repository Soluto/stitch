package common

import (
	"agogos/directives/middlewares"

	"github.com/graphql-go/graphql"
)

var stub = middlewares.DirectiveDefinition{
	MiddlewareFactory: func(ctx middlewares.MiddlewareContext) middlewares.Middleware {
		value := ctx.Directive.Arguments.ForName("value").Value.Raw
		return middlewares.Leaf(func(p graphql.ResolveParams) (interface{}, error) {
			return value, nil
		})
	},
}
